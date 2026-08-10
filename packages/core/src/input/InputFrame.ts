/**
 * Represents a strongly-typed, compressed input frame for a single tick.
 * @public
 */
export interface CompactInputFrame {
  /**
   * The tick index this input frame is associated with.
   */
  t: number;

  /**
   * A 32-bit buttons bitmask representing keyboard/controller action presses.
   */
  b: number;

  /**
   * Optional analog axes values (e.g. analog sticks or mouse positioning).
   */
  a?: [number, number];
}

/**
 * Interface for reading inputs during simulation playback.
 * @public
 */
export interface InputSource {
  /**
   * Retrieves the input frame for the specified tick.
   */
  nextInput(tick: number): CompactInputFrame;
}
