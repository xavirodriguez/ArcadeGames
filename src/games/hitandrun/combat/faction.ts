/**
 * Normalized faction identity used by direct-hit and area-of-effect combat.
 * Both legacy `faction` and canonical `value` fields are supported while
 * existing game components migrate to one representation.
 */
export interface FactionIdentity {
  value?: string;
  faction?: string;
}

/**
 * Returns true when two entities belong to the same known faction and
 * the attack does not explicitly allow friendly fire.
 */
export function isFriendly(
  attacker: FactionIdentity | undefined,
  target: FactionIdentity | undefined,
  friendlyFire = false
): boolean {
  if (friendlyFire) return false;
  const attackerFaction = attacker?.value ?? attacker?.faction;
  const targetFaction = target?.value ?? target?.faction;
  return attackerFaction !== undefined &&
    targetFaction !== undefined &&
    attackerFaction === targetFaction;
}
