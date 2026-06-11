import * as Location from "expo-location";
import { ordersApi } from "@/api";
import type { DriverNextStatus } from "@/api/types";

// Backend range-gates these transitions — the request must include the rider's
// current GPS so the server can verify proximity to the store / customer.
// `picked_up` is gated at ~200m from the store (it replaced `arrived_store` in
// the forward flow; `arrived_store` is kept for legacy in-flight orders).
// `arrived` (arrived at customer) reuses the deliveredDistanceThreshold on the
// backend since both events happen at the customer's address.
const GPS_GATED: ReadonlySet<DriverNextStatus> = new Set<DriverNextStatus>([
  "arrived_store",
  "picked_up",
  "arrived",
  "delivered",
]);

// How stale a cached fix may be before we bother asking the GPS for a fresh
// one. 30s is plenty: a rider standing at the store/customer hasn't moved far,
// and the backend gate radii (200 m store / 500 m customer) tolerate the drift.
const MAX_FIX_AGE_MS = 30_000;

// Hard ceiling on the fresh-fix wait so a tap can NEVER hang the UI. If the GPS
// can't produce a fix in this window we send the request without coords and let
// the backend reply with GPS_REQUIRED, which the screen surfaces to the rider.
const FRESH_FIX_TIMEOUT_MS = 4_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Resolve the rider's coordinates as fast as possible:
 *   1. A recent cached fix (`getLastKnownPositionAsync`) — returns instantly.
 *   2. Otherwise a fresh fix at BALANCED accuracy (≈100 m, good enough for the
 *      gate) capped by FRESH_FIX_TIMEOUT_MS so the button never freezes.
 *
 * Previously this always called `getCurrentPositionAsync({ accuracy: High })`
 * with no timeout, which forced a cold high-precision fix and could block the
 * "Arrived" / "Delivered" tap for 10-30 s. That was the rider-app sluggishness.
 */
async function getRiderCoords(): Promise<{ lat: number; lng: number } | undefined> {
  try {
    // Don't re-prompt if we already have permission — re-requesting each tap
    // adds latency even when already granted.
    const current = await Location.getForegroundPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      const asked = await Location.requestForegroundPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return undefined;

    // 1) Instant: a fix the OS already has cached.
    const last = await Location.getLastKnownPositionAsync({
      maxAge: MAX_FIX_AGE_MS,
    });
    if (last) {
      return { lat: last.coords.latitude, lng: last.coords.longitude };
    }

    // 2) Fresh fix, but bounded — Balanced accuracy resolves far faster than
    //    High and is well within the gate radius.
    const loc = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      FRESH_FIX_TIMEOUT_MS,
    );
    if (loc) {
      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    }
    return undefined;
  } catch {
    // Fall through with coords=undefined — backend returns GPS_REQUIRED.
    return undefined;
  }
}

/**
 * Drive `ordersApi.updateStatus` while attaching the rider's current GPS for
 * range-gated transitions (picked_up, arrived, delivered — plus the legacy
 * arrived_store). The backend
 * rejects with "You are not in range yet" / "Rider location is required..."
 * when the rider is outside the admin-configured radius; those errors
 * propagate as-is so the calling screen can surface them in a dialog.
 */
export async function updateOrderStatusWithGps(
  orderId: string,
  status: DriverNextStatus,
): Promise<void> {
  const coords = GPS_GATED.has(status) ? await getRiderCoords() : undefined;
  await ordersApi.updateStatus(orderId, {
    status,
    lat: coords?.lat,
    lng: coords?.lng,
  });
}
