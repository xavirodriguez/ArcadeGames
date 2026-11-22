/**
 * Emits audit measurements only when the caller opts in with AUDIT_VERBOSE=1.
 *
 * Keep this helper free of Jest globals so it stays a plain module and does not
 * match the testMatch patterns.
 */
export function auditLog(...values: Parameters<typeof console.log>): void {
  if (process.env.AUDIT_VERBOSE === "1") {
    console.log(...values);
  }
}
