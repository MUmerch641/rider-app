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
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
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
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
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
