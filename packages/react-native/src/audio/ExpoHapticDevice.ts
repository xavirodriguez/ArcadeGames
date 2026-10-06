import { Platform } from "react-native";
import { IHapticDevice } from "@tiny-aster/core";

let HapticsModule: typeof import("expo-haptics") | null = null;
if (Platform.OS !== "web") {
  try {
    HapticsModule = require("expo-haptics");
  } catch (_e) {
    // Optional fallback for web/jest
  }
}

/**
 * ExpoHapticDevice implementation of IHapticDevice for React Native platforms.
 * @public
 */
export class ExpoHapticDevice implements IHapticDevice {
  public vibrate(pattern: string): void {
    if (Platform.OS === "web" || !HapticsModule) return;
    try {
      if (pattern === "heavy" || pattern === "boost" || pattern === "explosion") {
        HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle.Heavy);
      } else if (pattern === "medium" || pattern === "melee" || pattern === "jump") {
        HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle.Medium);
      } else if (pattern === "warning" || pattern === "damage") {
        HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Warning);
      } else if (pattern === "error" || pattern === "death") {
        HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Error);
      } else {
        HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle.Light);
      }
    } catch (_e) {
      // Ignore vibration errors on unsupported hardware
    }
  }
}
