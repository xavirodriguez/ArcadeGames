import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "../utils/logger";

export class PersistenceService {
  static async save(key: string, data: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      logger.error("Failed to save data to storage", e);
    }
  }

  static async load<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      logger.error("Failed to load data from storage", e);
      return defaultValue;
    }
  }
}
