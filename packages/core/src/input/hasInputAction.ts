import { CanonicalActionName } from "./CanonicalInput";

/**
 * Type representing supported container/structure formats for active input actions.
 *
 * @public
 */
export type InputActionsLike = readonly CanonicalActionName[];

/**
 * Utility function to query whether a specific input action is currently active in an `InputActionsLike` structure.
 *
 * @param actions - The actions array (or null/undefined).
 * @param name - The action identifier to check.
 * @returns `true` if the action is active, `false` otherwise.
 *
 * @public
 */
export function hasInputAction(actions: InputActionsLike | null | undefined, name: string): boolean {
  if (!actions) return false;

  if (Array.isArray(actions)) {
    return actions.includes(name as CanonicalActionName);
  }

  if (actions instanceof Set) {
    return (actions as never as Set<string>).has(name);
  }

  if (typeof actions === "object" && name in actions) {
    return Boolean((actions as never as Readonly<Record<string, boolean>>)[name]);
  }

  return false;
}
