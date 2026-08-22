import { System, World } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { MutatorRegistry } from "../../../utils/MutatorRegistry";

/**
 * WaveTransitionSystem manages the breve (e.g. 800ms) intermission in WAVE_TRANSITION phase
 * before opening the mutator draft phase.
 */
export class WaveTransitionSystem extends System<SpaceInvadersComponentRegistry> {
  public update(world: World<SpaceInvadersComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const gs = world.getSingleton("GameState") as any;
    if (!gs || gs.phase !== "WAVE_TRANSITION") return;

    world.mutateSingleton("GameState", (state: any) => {
      const remaining = typeof state.waveTransitionRemaining === "number" ? state.waveTransitionRemaining : 0.8;
      const nextRemaining = Math.max(0, remaining - deltaTime);
      state.waveTransitionRemaining = nextRemaining;

      if (nextRemaining <= 0) {
        state.phase = "MUTATOR_DRAFT";

        // Generate draft options for every active Player entity in parallel
        const players = world.query("Player");
        players.forEach(playerEntity => {
          const playerId = `player_${playerEntity}`;
          const context = {
            playerId,
            targetEntity: playerEntity
          };
          const choices = MutatorRegistry.generateDraft(world, "space-invaders", 3, context);

          // Use CommandBuffer for structural change during world update!
          world.commands.addComponent(playerEntity, {
            type: "DraftState",
            options: choices.map(m => m.id),
            hasChosen: false,
            selectedMutatorId: null
          } as any);
        });
      }
    });
  }
}
