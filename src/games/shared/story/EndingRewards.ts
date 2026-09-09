import { MetaProgressionService } from "@tiny-aster/core";

/**
 * Declarative mapping from campaign ending node IDs to the list of meta modifiers to unlock.
 *
 * @public
 */
export const ENDING_REWARDS_MAP: Readonly<Record<string, ReadonlyArray<string>>> = {
  ending_flawless: ["hyper_drift", "shield_pulse"],
  ending_pyrrhic: ["hyper_drift", "shield_pulse"]
};

/**
 * Unlocks the corresponding meta progression rewards for a given campaign ending node ID.
 *
 * @param endingId - Unique identifier of the terminal ending node.
 * @param metaService - MetaProgressionService instance to apply rewards to.
 * @public
 */
export function applyEndingRewards(endingId: string, metaService: MetaProgressionService): void {
  const modifiersToUnlock = ENDING_REWARDS_MAP[endingId];
  if (modifiersToUnlock) {
    for (const modifierId of modifiersToUnlock) {
      metaService.unlockModifier(modifierId);
    }
  }
}
