/**
 * Type representing supported container/structure formats for active input actions.
 *
 * @remarks
 * In runtime execution, action lists can exist as a `Set<string>`, an array of strings `string[]`,
 * or a dictionary `Record<string, boolean>`.
 *
 * @public
 */
import { CanonicalActionName } from "./CanonicalInput";

/**
 * Type representing supported container/structure formats for active input actions.
 *
 * @public
 */
export type InputActionsLike = readonly CanonicalActionName[] | ReadonlySet<string> | Readonly<Record<string, boolean>>;

/**
 * Utility function to query whether a specific input action is currently active in a `CanonicalActionName[]` or `InputActionsLike` structure.
 *
 * @param actions - The actions array, set, or object (or null/undefined).
 * @param name - The action identifier to check.
 * @returns `true` if the action is active, `false` otherwise.
 *
 * @public
 */
export function hasInputAction(actions: readonly CanonicalActionName[] | null | undefined, name: string): boolean;
export function hasInputAction(actions: InputActionsLike | null | undefined, name: string): boolean;
export function hasInputAction(actions: InputActionsLike | null | undefined, name: string): boolean {
  if (!actions) return false;

  if (Array.isArray(actions)) {
    return actions.includes(name as CanonicalActionName);
  }

  if (actions instanceof Set) {
    return actions.has(name);
  }

  if (typeof actions === "object" && name in actions) {
    return (actions as Readonly<Record<string, boolean>>)[name] === true;
  }

  return false;
}
