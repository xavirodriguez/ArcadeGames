/**
 * Unified simulation speed scaling resource.
 *
 * @remarks
 * Acts as a superset replacing legacy `IsPaused` and `GameplayFreeze` resources.
 * Supports global scale factors (0.0 = paused, 1.0 = normal, 0.5 = slow motion)
 * and temporary timed scaling effects.
 *
 * @public
 */
export class TimeScale {
  public scale: number = 1.0;
  public remainingDuration?: number;

  constructor(scale: number = 1.0, remainingDuration?: number) {
    this.scale = scale;
    this.remainingDuration = remainingDuration;
  }

  /**
   * Resets time scale back to standard 1.0 speed.
   */
  public reset(): void {
    this.scale = 1.0;
    this.remainingDuration = undefined;
  }

  /**
   * Pauses simulation by setting scale to 0.0.
   */
  public pause(): void {
    this.scale = 0.0;
  }

  /**
   * Applies a temporary time scale factor for a specified duration in seconds.
   */
  public setTemporary(scale: number, durationSeconds: number): void {
    this.scale = scale;
    this.remainingDuration = durationSeconds;
  }
}
