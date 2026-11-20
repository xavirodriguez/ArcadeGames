/**
 * Shared, semantically-neutral type-narrowing helpers for the core engine.
 *
 * @remarks
 * `isRecord` here is intentionally permissive: it accepts any non-null object,
 * including arrays. Callers that need to exclude arrays (e.g. visual-composition
 * payloads) should use a dedicated, stricter helper instead of changing this one.
 *
 * @public
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Narrows an unknown value to a defined (non-null, non-undefined) value.
 * @public
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Narrows an unknown value to a string.
 * @public
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}