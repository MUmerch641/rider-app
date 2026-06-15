import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { Driver } from "@/api/types";

const memoryStore: Record<string, string> = {};

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStore[key] ?? null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStore[key] = value;
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      delete memoryStore[key];
    }
  },
};

const ACCESS_TOKEN_KEY = "onway_driver_access_token";
const REFRESH_TOKEN_KEY = "onway_driver_refresh_token";
const DRIVER_KEY = "onway_driver_profile";

export type StoredDriver = Driver;

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async setAccessToken(token: string): Promise<void> {
    try {
      // AFTER_FIRST_UNLOCK: the token must stay readable while the phone is
      // LOCKED. The background location task keeps running with the screen off,
      // and ~15 min in the access token expires; refreshing then reads the
      // refresh token from the keychain. With the default WHEN_UNLOCKED that
      // read returns null on a locked device, which the app mistook for "no
      // token" and logged the rider out mid-shift (within ~an hour).
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch {
      await storage.set(ACCESS_TOKEN_KEY, token);
    }
  },
  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async setRefreshToken(token: string): Promise<void> {
    try {
      // AFTER_FIRST_UNLOCK — see setAccessToken. The refresh token MUST be
      // readable while the device is locked or the background location task
      // can't refresh an expired access token and the rider gets logged out.
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch {
      await storage.set(REFRESH_TOKEN_KEY, token);
    }
  },
  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => undefined),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined),
      storage.remove(ACCESS_TOKEN_KEY),
      storage.remove(REFRESH_TOKEN_KEY),
    ]);
  },
};

export const driverStorage = {
  async get(): Promise<Driver | null> {
    const raw = await storage.get(DRIVER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Driver;
    } catch {
      return null;
    }
  },
  async set(driver: Driver): Promise<void> {
    await storage.set(DRIVER_KEY, JSON.stringify(driver));
  },
  async clear(): Promise<void> {
    await storage.remove(DRIVER_KEY);
  },
};

export async function clearAllAuth(): Promise<void> {
  await Promise.all([tokenStorage.clear(), driverStorage.clear()]);
}
