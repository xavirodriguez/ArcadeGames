/**
 * Components containing transient presentation/output state that is not authoritative simulation state.
 *
 * Input is intentionally not excluded: the current input affects predicted simulation and must remain
 * visible to both snapshot restore and synchronization hashes.
 */
export const SNAPSHOT_EXCLUDED_COMPONENT_TYPES = Object.freeze([
  "HapticRequest",
  "ScreenShake",
  "VisualOffset"
] as const);

const excludedComponentTypes: ReadonlySet<string> = new Set(SNAPSHOT_EXCLUDED_COMPONENT_TYPES);

/** Returns true when a component should be omitted from deterministic snapshots and hashes. */
export function isSnapshotComponentExcluded(type: string): boolean {
  return excludedComponentTypes.has(type);
}
