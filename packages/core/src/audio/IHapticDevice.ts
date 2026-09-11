/**
 * Contract interface for tactile haptic feedback hardware devices across platforms (mobile, web).
 *
 * @remarks
 * Implementations process vibration pattern identifiers (e.g. `"light"`, `"medium"`, `"heavy"`, `"success"`, `"error"`)
 * and trigger native vibration drivers (such as Expo Haptics or Web Vibration API).
 *
 * @example
 * ```ts
 * const hapticDevice: IHapticDevice = new NullHapticDevice();
 * hapticDevice.vibrate("heavy");
 * ```
 *
 * @public
 */
export interface IHapticDevice {
  /**
   * Triggers a haptic vibration effect matching the specified pattern string.
   *
   * @param pattern - Haptic feedback pattern identifier (e.g. `"light"`, `"medium"`, `"heavy"`).
   */
  vibrate(pattern: string): void;
}

/**
 * Fallback implementation of {@link IHapticDevice} that executes no-op vibrations.
 *
 * @remarks
 * Designed for headless server environments, desktop platforms without haptic hardware, or automated test suites.
 *
 * @example
 * ```ts
 * const nullHaptic = new NullHapticDevice();
 * nullHaptic.vibrate("impact"); // Safe no-op on non-vibrating platforms
 * ```
 *
 * @public
 */
export class NullHapticDevice implements IHapticDevice {
  /**
   * No-op implementation of haptic vibration trigger.
   *
   * @param _pattern - Ignored haptic pattern identifier.
   */
  public vibrate(_pattern: string): void {}
}
