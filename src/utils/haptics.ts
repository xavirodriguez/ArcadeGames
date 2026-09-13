import { Platform } from "react-native";

let HapticsModule: typeof import("expo-haptics") | null = null;
if (Platform.OS !== "web") {
  try {
    HapticsModule = require("expo-haptics");
  } catch (_e) {
    // Optional native module fallback for web/jest
  }
}

/**
 * Trigger a light impact haptic feedback when shooting.
 */
export function hapticShoot(): void {
  if (Platform.OS === "web" || !HapticsModule) return;
  try {
    HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle.Light);
  } catch (_e) {}
}

/**
 * Trigger a warning notification haptic feedback when taking damage.
 */
export function hapticDamage(): void {
  if (Platform.OS === "web" || !HapticsModule) return;
  try {
    HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Warning);
  } catch (_e) {}
}

/**
 * Trigger an error notification haptic feedback when the player dies.
 */
export function hapticDeath(): void {
  if (Platform.OS === "web" || !HapticsModule) return;
  try {
    HapticsModule.notificationAsync(HapticsModule.NotificationFeedbackType.Error);
  } catch (_e) {}
}

/**
 * Trigger a heavy impact haptic feedback for hyperspace.
 */
export function hapticHyperspace(): void {
  if (Platform.OS === "web" || !HapticsModule) return;
  try {
    HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle.Heavy);
  } catch (_e) {}
}

/**
 * Trigger continuous low-intensity feedback for thrust.
 */
export function hapticThrust(active: boolean): void {
  if (Platform.OS === "web" || !HapticsModule) return;
  if (active) {
    try {
      HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle.Light);
    } catch (_e) {}
  }
}

/**
 * Trigger a light selection haptic feedback for UI interactions.
 */
export function hapticSelection(): void {
  if (Platform.OS === "web" || !HapticsModule) return;
  try {
    HapticsModule.selectionAsync();
  } catch (_e) {}
}
