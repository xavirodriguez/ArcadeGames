import { CanonicalActionName } from "./CanonicalInput";

/**
 * Utility function to query whether a specific canonical input action is currently active in a `readonly CanonicalActionName[]` list, Set, or record map.
 *
 * @param actions - The actions array, Set, map, or null/undefined.
 * @param name - The canonical action identifier to check.
 * @returns `true` if the action is active, `false` otherwise.
 *
 * @public
 */
export function hasInputAction(
  actions: readonly CanonicalActionName[] | ReadonlySet<CanonicalActionName> | Record<string, boolean> | null | undefined,
  name: CanonicalActionName
): boolean {
  if (!actions) return false;
  if (Array.isArray(actions)) {
    return actions.some((a) => a === name);
  }
  if (actions instanceof Set) {
    return actions.has(name);
  }
  if (typeof actions === "object") {
    return Boolean((actions as Record<string, boolean>)[name]);
  }
  return false;
}
