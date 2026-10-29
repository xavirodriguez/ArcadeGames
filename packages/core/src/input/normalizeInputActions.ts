import { CanonicalActionName, isCanonicalActionName } from "./CanonicalInput";

/**
 * Normalizes input actions at public game/system boundaries into a sorted `readonly CanonicalActionName[]`.
 *
 * @param value - The action payload received from external/untyped callers.
 * @returns Sorted array of validated canonical action names.
 * @throws {TypeError} If `value` is not `undefined` or an `Array`.
 *
 * @public
 */
export function normalizeInputActions(value: unknown): readonly CanonicalActionName[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    const receivedType = value === null ? "null" : typeof value === "object" ? value.constructor.name : typeof value;
    throw new TypeError(`[normalizeInputActions] Expected Array or undefined, received ${receivedType}`);
  }

  const result: CanonicalActionName[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (isCanonicalActionName(item)) {
      result.push(item);
    }
  }
  result.sort();
  return result;
}
