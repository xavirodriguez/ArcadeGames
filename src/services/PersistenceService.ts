import AsyncStorage from "@react-native-async-storage/async-storage";

const isTest = typeof process !== "undefined" && process.env.NODE_ENV === "test";
const memoryStorage = new Map<string, string>();

export class PersistenceService {
  static async save(key: string, data: unknown): Promise<void> {
    if (isTest) {
      memoryStorage.set(key, JSON.stringify(data));
      return;
    }
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save data to storage", e);
    }
  }

  static async load<T>(key: string, defaultValue: T): Promise<T> {
    if (isTest) {
      const stored = memoryStorage.get(key);
      return stored ? JSON.parse(stored) : defaultValue;
    }
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error("Failed to load data from storage", e);
      return defaultValue;
    }
  }
}
