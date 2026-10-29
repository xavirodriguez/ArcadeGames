import { CanonicalActionName } from "./CanonicalInput";

/**
 * Utility function to query whether a specific canonical input action is currently active in a `readonly CanonicalActionName[]` list.
 *
 * @param actions - The actions array (or null/undefined).
 * @param name - The canonical action identifier to check.
 * @returns `true` if the action is active, `false` otherwise.
 *
 * @public
 */
export function hasInputAction(
  actions: readonly CanonicalActionName[] | null | undefined,
  name: CanonicalActionName
): boolean {
  if (!actions) return false;
  return actions.some((a) => a === name);
}
