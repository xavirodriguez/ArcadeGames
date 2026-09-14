/**
 * Snapshot representing rendering state for a given tick.
 *
 * @public
 */
export interface RenderSnapshot {
  /** Target tick index. */
  tick: number;
  /** Array of visible entity IDs. */
  entities: number[];
}
