import AsyncStorage from "@react-native-async-storage/async-storage";

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
