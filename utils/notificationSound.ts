// Dashboard-managed new-order alarm sound (item: driver notification sound).
//
// The admin can upload a custom alarm in the dashboard; the backend exposes it
// at GET /api/v1/driver/settings/notification-sound → { url: string | null }.
// We download it once into the app's document directory (expo-file-system
// legacy API — same pattern as the Users app) and hand the local file to the
// expo-audio alarm player. Anything going wrong — endpoint not deployed yet
// (404), url null, download failure — falls back to the bundled presets.
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient, ENDPOINTS } from "@/api";
import type { ApiError, Envelope, NotificationSoundResponse } from "@/api";

const CACHE_RECORD_KEY = "notification_sound_cache_v1";

type CacheRecord = {
  /** Remote URL the file was downloaded from (identity of the cache). */
  url: string;
  /** file:// URI of the downloaded copy. */
  localUri: string;
};

const readRecord = async (): Promise<CacheRecord | null> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_RECORD_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as CacheRecord;
    if (!rec?.url || !rec?.localUri) return null;
    return rec;
  } catch {
    return null;
  }
};

const fileExists = async (uri: string): Promise<boolean> => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists === true;
  } catch {
    return false;
  }
};

/** Cached local URI, or null when none is cached / the file was purged. */
export const getCachedNotificationSoundUri = async (): Promise<string | null> => {
  const rec = await readRecord();
  if (!rec) return null;
  return (await fileExists(rec.localUri)) ? rec.localUri : null;
};

// Tiny stable hash so each remote URL gets its own local filename.
const hashUrl = (url: string): string => {
  let h = 0;
  for (let i = 0; i < url.length; i += 1) {
    h = (h * 31 + url.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
};

const extFromUrl = (url: string): string => {
  const path = url.split("?")[0];
  const m = /\.(\w{1,5})$/.exec(path);
  return m ? `.${m[1].toLowerCase()}` : ".mp3";
};

const clearRecord = async (): Promise<void> => {
  const rec = await readRecord();
  await AsyncStorage.removeItem(CACHE_RECORD_KEY).catch(() => {});
  if (rec?.localUri) {
    await FileSystem.deleteAsync(rec.localUri, { idempotent: true }).catch(
      () => {},
    );
  }
};

/**
 * Fetch the dashboard-managed sound URL, (re)download it when it changed, and
 * return the local file URI to play — or null when the bundled default should
 * be used. Call on app start / login; cheap when nothing changed.
 */
export const syncNotificationSound = async (): Promise<string | null> => {
  let remoteUrl: string | null;
  try {
    const env = (await apiClient.get(
      ENDPOINTS.driver.notificationSound,
    )) as Envelope<NotificationSoundResponse>;
    remoteUrl = env?.data?.url ?? null;
  } catch (err) {
    const status = (err as ApiError)?.status;
    if (status === 404) {
      // Endpoint not deployed yet — behave as "no custom sound".
      return null;
    }
    // Transient error (offline, 5xx): keep playing whatever we already have.
    return getCachedNotificationSoundUri();
  }

  if (!remoteUrl) {
    // Admin cleared the custom sound — drop the stale copy.
    await clearRecord();
    return null;
  }

  const cached = await readRecord();
  if (cached?.url === remoteUrl && (await fileExists(cached.localUri))) {
    return cached.localUri;
  }

  const target = `${FileSystem.documentDirectory}notification-sound-${hashUrl(remoteUrl)}${extFromUrl(remoteUrl)}`;
  try {
    const res = await FileSystem.downloadAsync(remoteUrl, target);
    if (res.status !== 200) throw new Error(`download status ${res.status}`);
    // Replace the record; remove the previous file if it lived elsewhere.
    if (cached?.localUri && cached.localUri !== target) {
      await FileSystem.deleteAsync(cached.localUri, { idempotent: true }).catch(
        () => {},
      );
    }
    await AsyncStorage.setItem(
      CACHE_RECORD_KEY,
      JSON.stringify({ url: remoteUrl, localUri: res.uri } satisfies CacheRecord),
    );
    return res.uri;
  } catch (e) {
    console.warn("notificationSound: download failed", e);
    // Stale cache (different URL) is better than silence? No — the admin
    // changed the sound; play the bundled default until the next sync.
    return null;
  }
};
