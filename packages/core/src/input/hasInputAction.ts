/**
 * Type representing supported container/structure formats for active input actions.
 *
 * @remarks
 * In runtime execution, action lists can exist as a `Set<string>`, an array of strings `string[]`,
 * or a dictionary `Record<string, boolean>`.
 *
 * @public
 */
export type InputActionsLike = ReadonlySet<string> | readonly string[] | Readonly<Record<string, boolean>>;

/**
 * Utility function to query whether a specific input action is currently active in an `InputActionsLike` structure.
 *
 * @param actions - The actions object, set, or array (or null/undefined).
 * @param name - The action identifier to check.
 * @returns `true` if the action is active, `false` otherwise.
 *
 * @public
 */
export function hasInputAction(actions: InputActionsLike | null | undefined, name: string): boolean {
  if (!actions) return false;

  if (actions instanceof Set) {
    return actions.has(name);
  }

  if (Array.isArray(actions)) {
    return actions.includes(name);
  }

  if (typeof actions === "object" && name in actions) {
    return (actions as Readonly<Record<string, boolean>>)[name] === true;
  }

  return false;
}
