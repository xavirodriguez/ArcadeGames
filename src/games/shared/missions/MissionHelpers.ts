import { World, ComboComponent } from "@tiny-aster/core";
import { ActiveMissionState } from "./MissionTypes";
import { MutatorRegistry } from "../../../utils/MutatorRegistry";

/**
 * Creates an `onUpdate` mission handler that tracks the Combo multiplier state.
 * @param targetMultiplier - Multiplier value required to complete the mission.
 * @public
 */
export function createComboMultiplierMissionOnUpdate(targetMultiplier: number) {
  return (world: World, state: ActiveMissionState): void => {
    const combos = world.query("Combo");
    if (combos.length > 0) {
      const c = world.getComponent(combos[0], "Combo") as ComboComponent | undefined;
      if (c) {
        state.currentCount = c.multiplier;
        if (c.multiplier >= targetMultiplier) {
          state.completed = true;
        }
      }
    }
  };
}

/**
 * Applies reward score bonus and mutator activation to the world.
 * @param world - World instance.
 * @param reward - Mission reward object containing optional scoreBonus and mutatorId.
 * @param stateSingletonName - Singleton state name (default "GameState").
 * @public
 */
export function applyMissionReward(
  world: World,
  reward?: { scoreBonus?: number; mutatorId?: string },
  stateSingletonName: string = "GameState"
): void {
  if (!reward) return;
  if (reward.scoreBonus) {
    world.mutateSingleton(stateSingletonName as never, (state: unknown) => {
      (state as { score: number }).score += reward.scoreBonus!;
    });
  }
  if (reward.mutatorId) {
    const mutator = MutatorRegistry.get(reward.mutatorId);
    if (mutator) {
      mutator.apply(world);
    }
  }
}
