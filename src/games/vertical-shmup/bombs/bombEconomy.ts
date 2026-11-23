/**
 * Pure bomb-economy helpers. No ECS, no world mutation: identical inputs always
 * produce identical rewards, including during rollback resimulation.
 */

export const DEFAULT_BOMB_STOCK_MAX = 5;
export const DEFAULT_GRAZE_BOMB_THRESHOLD = 40;
export const DEFAULT_BOSS_KILL_BOMB_REWARD = 1;

/**
 * Number of whole graze thresholds crossed between two cumulative graze counts.
 * Using a difference of floors means a threshold can never be paid twice and
 * the remainder (excess grazes) is preserved for the next threshold.
 */
export function grazeBombRewards(
  previousGrazeCount: number,
  nextGrazeCount: number,
  threshold: number
): number {
  if (!(threshold > 0)) return 0;
  const previous = Math.max(0, Math.floor(previousGrazeCount));
  const next = Math.max(0, Math.floor(nextGrazeCount));
  if (next <= previous) return 0;
  return Math.floor(next / threshold) - Math.floor(previous / threshold);
}

/**
 * Adds a reward to the bomb stock, clamped to `max`.
 * Stock at the cap forfeits the overflow: it is never banked for later.
 */
export function grantBombs(current: number, amount: number, max: number): number {
  const limit = max > 0 ? Math.floor(max) : DEFAULT_BOMB_STOCK_MAX;
  const base = Math.max(0, Math.floor(current));
  const reward = Math.max(0, Math.floor(amount));
  return Math.min(limit, base + reward);
}
