/**
 * Linearly approaches `target` from `current` by at most `maxDelta`.
 * Pure, allocation-free and deterministic. Shared by movement and collision systems.
 */
export function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }
  return current + Math.sign(target - current) * maxDelta;
}
