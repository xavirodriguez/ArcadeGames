/** @public */
export interface IHapticDevice {
  vibrate(pattern: string): void;
}

/**
 * Fallback haptic device.
 * @public
 */
export class NullHapticDevice implements IHapticDevice {
  public vibrate(_pattern: string): void {}
}
