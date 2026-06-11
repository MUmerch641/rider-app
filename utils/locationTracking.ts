// ─── Driver location tracking — the SINGLE transmission path ─────────────────
// Every GPS point the app sends to PATCH /driver/location flows through
// `sendLocation` below. While the driver is online we prefer a background
// location task (keeps customers' live tracking alive when the rider switches
// apps or locks the phone, like any professional courier app); when background
// permission is denied or the task API is unavailable (e.g. Expo Go) we fall
// back to a plain foreground watcher — tracking must never silently not work.
//
// Failed sends are buffered into a bounded, AsyncStorage-persisted queue and
// flushed as the `queued` array of the next successful PATCH (the backend
// writes them to driver_location_history only).
//
// IMPORTANT: this module must be imported at app start (app/_layout.tsx does a
// top-level import) so TaskManager.defineTask registers before the task fires.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { authApi, type QueuedLocationPoint } from "@/api";
import i18n from "@/constants/i18n";

export const LOCATION_TASK_NAME = "onway-driver-location";

const QUEUE_STORAGE_KEY = "driver_location_queue";
// Bounded offline buffer — drop the oldest beyond this (≈17 min at 5 s ticks).
const MAX_QUEUE_LENGTH = 200;
// API contract: PATCH /driver/location accepts at most 100 queued points.
const MAX_FLUSH_BATCH = 100;

// Same cadence the old foreground-only broadcaster used.
const TRACKING_OPTIONS = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 5000,
  distanceInterval: 10,
} as const;

// ─── Offline queue (module state, persisted write-behind) ────────────────────
let queue: QueuedLocationPoint[] = [];
let queueLoaded = false;

async function ensureQueueLoaded(): Promise<void> {
  if (queueLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as QueuedLocationPoint[]) : [];
    // Points buffered before this process started come first.
    queue = [...(Array.isArray(parsed) ? parsed : []), ...queue].slice(-MAX_QUEUE_LENGTH);
  } catch {
    // Corrupt/unreadable buffer — start fresh rather than crash tracking.
  }
  queueLoaded = true;
}

function persistQueue(): void {
  // Write-behind: never block the GPS callback on storage I/O.
  void AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue)).catch(
    () => undefined,
  );
}

/** Drop buffered points (called on logout so they can't leak across accounts). */
export async function clearLocationQueue(): Promise<void> {
  // Disarm the sender first: a send already in flight (or chained behind this)
  // will 401 post-logout, and its catch must NOT re-buffer the previous
  // account's point after we wipe the queue — that point would later flush
  // under whoever logs in next on this device. startDriverTracking re-arms.
  sendingEnabled = false;
  queue = [];
  queueLoaded = true;
  try {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch {
    // best-effort
  }
}

// ─── Sender ───────────────────────────────────────────────────────────────────
function toPoint(loc: Location.LocationObject): QueuedLocationPoint {
  const heading = loc.coords.heading;
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    // -1 / null mean "unknown heading" — omit rather than send junk.
    heading: typeof heading === "number" && heading >= 0 ? heading : undefined,
    recordedAt: new Date(loc.timestamp || Date.now()).toISOString(),
  };
}

// Sends are serialized so overlapping GPS ticks can't race the queue.
let sendChain: Promise<void> = Promise.resolve();

// False between logout (clearLocationQueue) and the next startDriverTracking:
// while disarmed, straggling ticks neither send nor re-buffer, so a wiped queue
// stays wiped and nothing leaks across accounts.
let sendingEnabled = true;

async function doSend(point: QueuedLocationPoint): Promise<void> {
  if (!sendingEnabled) return;
  await ensureQueueLoaded();
  const flush = queue.slice(0, MAX_FLUSH_BATCH);
  try {
    await authApi.updateLocation({
      lat: point.lat,
      lng: point.lng,
      heading: point.heading,
      recordedAt: point.recordedAt,
      ...(flush.length > 0 ? { queued: flush } : {}),
    });
    if (flush.length > 0 && sendingEnabled) {
      queue = queue.slice(flush.length);
      persistQueue();
    }
  } catch {
    // Logged out while the request was in flight — don't resurrect the queue.
    if (!sendingEnabled) return;
    // Offline or server error — buffer this point for the next successful send.
    queue.push(point);
    if (queue.length > MAX_QUEUE_LENGTH) {
      queue = queue.slice(queue.length - MAX_QUEUE_LENGTH);
    }
    persistQueue();
  }
}

/** Push one live GPS point to the backend, flushing any offline buffer. */
export function sendLocation(point: QueuedLocationPoint): Promise<void> {
  sendChain = sendChain.then(() => doSend(point));
  return sendChain;
}

// ─── Background task (must be defined at module scope) ───────────────────────
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations?: Location.LocationObject[] };
  for (const loc of locations ?? []) {
    void sendLocation(toPoint(loc));
  }
});

// ─── Start / stop ─────────────────────────────────────────────────────────────
let watcher: Location.LocationSubscription | null = null;
let watcherStarting = false;

// Cancellation state for the start/stop race. stopDriverTracking() bumps the
// generation and clears `trackingDesired`; startDriverTracking() captures the
// generation at entry and bails out after each await once it no longer
// matches. Without this, a stop that races a still-running start (e.g. while
// the OS background-permission prompt sits open for many seconds, then the
// driver toggles offline or logs out) would finish starting the background
// task and leave tracking permanently on while the driver is offline — on
// Android the registered task even persists across app restarts. Concurrent
// starts do NOT bump the generation (the newest start wins; the steps below
// are idempotent), so a stale start consults `trackingDesired` before undoing
// anything a newer start may already rely on.
let stopGeneration = 0;
let trackingDesired = false;

function stopWatcher(): void {
  watcher?.remove();
  watcher = null;
}

async function startForegroundWatcher(): Promise<void> {
  if (watcher || watcherStarting) return;
  watcherStarting = true;
  try {
    const subscription = await Location.watchPositionAsync(
      TRACKING_OPTIONS,
      (loc) => {
        void sendLocation(toPoint(loc));
      },
    );
    if (!trackingDesired || watcher) {
      // A stop ran while watchPositionAsync was in flight (or another watcher
      // already exists) — don't orphan a subscription that would keep
      // streaming while the driver is offline.
      subscription.remove();
      return;
    }
    // Adopt the subscription even if a newer start superseded this one — that
    // start found watcherStarting=true and returned, counting on this one.
    watcher = subscription;
  } finally {
    watcherStarting = false;
  }
}

/**
 * Begin streaming the driver's location (call when the driver goes online).
 * Foreground permission is required; background permission is used when
 * already granted (or promptable) but optional — without it (or where
 * background tasks can't run, e.g. Expo Go) we degrade to foreground-only
 * tracking instead of failing.
 */
export async function startDriverTracking(): Promise<void> {
  const generation = stopGeneration;
  const cancelled = () => stopGeneration !== generation;
  trackingDesired = true;
  // Re-arm the sender — clearLocationQueue() disarmed it on logout.
  sendingEnabled = true;
  try {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (cancelled() || foreground.status !== "granted") return;

    let backgroundGranted = false;
    try {
      // Check before prompting: on Android 11+ background location can't be
      // granted from an in-app dialog, and after two denials the system
      // silently auto-denies forever — so only request while the OS still
      // allows asking; otherwise fall through to the foreground watcher.
      const background = await Location.getBackgroundPermissionsAsync();
      if (cancelled()) return;
      if (background.granted) {
        backgroundGranted = true;
      } else if (background.canAskAgain) {
        const asked = await Location.requestBackgroundPermissionsAsync();
        backgroundGranted = asked.status === "granted";
      }
    } catch {
      backgroundGranted = false;
    }
    if (cancelled()) return;

    if (backgroundGranted) {
      try {
        const alreadyStarted =
          await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (cancelled()) {
          // The racing stop may have run before the task was visible to it —
          // but leave the task alone if an even newer start wants it running.
          if (alreadyStarted && !trackingDesired) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
          }
          return;
        }
        if (!alreadyStarted) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            ...TRACKING_OPTIONS,
            showsBackgroundLocationIndicator: true,
            pausesUpdatesAutomatically: false,
            foregroundService: {
              // i18next instance directly — this runs outside React.
              notificationTitle: i18n.t("location.trackingNotificationTitle"),
              notificationBody: i18n.t("location.trackingNotificationBody"),
              notificationColor: "#3F1A96",
            },
          });
          if (cancelled()) {
            // Stopped while starting — undo the task we just registered,
            // unless an even newer start wants it running.
            if (!trackingDesired) {
              await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            }
            return;
          }
        }
        // Background task owns delivery now — drop any fallback watcher.
        stopWatcher();
        return;
      } catch {
        // startLocationUpdatesAsync throws in Expo Go / unsupported setups —
        // fall through to the foreground watcher below.
      }
      if (cancelled()) return;
    }

    await startForegroundWatcher();
  } catch {
    // Permission prompt failed entirely — nothing to track with.
  }
}

/** Stop all location streaming (driver went offline, or logged out). */
export async function stopDriverTracking(): Promise<void> {
  // Invalidate any in-flight startDriverTracking() (see stopGeneration above).
  trackingDesired = false;
  stopGeneration += 1;
  stopWatcher();
  try {
    const started =
      await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (started) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch {
    // TaskManager unavailable (Expo Go) — the watcher above is already stopped.
  }
}
