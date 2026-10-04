/**
 * Normalizes any unknown thrown value into a proper Error instance.
 * Preserves existing Error objects (and subclasses) intact.
 * Converts strings, numbers, objects, and null/undefined into an Error with descriptive details.
 * @public
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  if (
    typeof error === "number" ||
    typeof error === "boolean" ||
    typeof error === "symbol" ||
    typeof error === "bigint"
  ) {
    return new Error(String(error));
  }

  if (error && typeof error === "object") {
    try {
      const stringified = JSON.stringify(error);
      if (stringified && stringified !== "{}") {
        return new Error(`[Object Error]: ${stringified}`);
      }
    } catch {
      // Fallback if stringify fails (e.g. circular structure)
    }

    const name = (error as { name?: unknown }).name;
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") {
      return new Error(typeof name === "string" ? `${name}: ${msg}` : msg);
    }
    return new Error(`[Object Error]: ${String(error)}`);
  }

  return new Error(error === null ? "null" : error === undefined ? "undefined" : String(error));
}
