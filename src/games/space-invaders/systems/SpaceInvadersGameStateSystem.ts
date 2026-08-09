import { World, BaseGame, BaseGameStateSystem } from "@tiny-aster/core";
import { GameStateComponent, SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { spawnInvaderWave } from "../EntityFactory";
import { ISpaceInvadersGame } from "../types/GameInterfaces";
import { BENEFICIAL_MUTATORS, NEGATIVE_MUTATORS } from "../../../utils/MutatorRegistry";

/**
 * System that manages the overall game state, level progression, and game over.
 */
export class SpaceInvadersGameStateSystem extends BaseGameStateSystem<GameStateComponent, SpaceInvadersComponentRegistry> {
  constructor(private game: ISpaceInvadersGame) {
    super("GameState");
  }

  public override onRegister(world: World<SpaceInvadersComponentRegistry>): void {
    super.onRegister(world);
    const eventBus = world.getEventBus() as any;
    if (eventBus) {
      eventBus.on("level:completed", (event: { level: number, nextLevel: number }) => {
        try {
          if (world.isReSimulating) return;

          // Generate deterministic choices using world.gameplayRandom
          const rng = world.gameplayRandom;
          if (!rng) {
            throw new Error("world.gameplayRandom is undefined!");
          }

          const wasLocked = rng.isLocked();
          if (wasLocked) rng.unlock();

          try {
            const beneficialKeys = Object.keys(BENEFICIAL_MUTATORS).sort();
            const negativeKeys = Object.keys(NEGATIVE_MUTATORS).sort();

            // Deterministic shuffle helper using rng
            const shuffle = <T>(array: T[], r: { next: () => number }): T[] => {
              const result = [...array];
              for (let i = result.length - 1; i > 0; i--) {
                const j = Math.floor(r.next() * (i + 1));
                const temp = result[i];
                result[i] = result[j];
                result[j] = temp;
              }
              return result;
            };

            const shuffledBeneficial = shuffle(beneficialKeys, rng);
            const shuffledNegative = shuffle(negativeKeys, rng);

            const choices = [
              shuffledBeneficial[0],
              shuffledBeneficial[1],
              shuffledNegative[0]
            ];

            // Store choices as resource
            world.setResource("RunMutatorChoices", {
              choices,
              active: true
            });

            // Pause simulation
            if (typeof this.game.pause === "function") {
              this.game.pause();
            }
          } finally {
            if (wasLocked) rng.lock();
          }
        } catch (err) {
          console.error("ERROR IN EVENT LISTENER:", err);
        }
      });
    }
  }

  protected updateGameState(world: World<SpaceInvadersComponentRegistry>, gameState: GameStateComponent, deltaTime: number): void {
    // 1. Count remaining invaders and wave members
    const activeMembers = world.query("WaveMember" as any);
    const invaders = world.query("Invader");
    world.mutateSingleton("GameState", (gs) => {
        gs.invadersRemaining = activeMembers.length > 0 ? activeMembers.length : invaders.length;
    });

    // 2. Handle level progression driven by SpawnDirector waveIndex
    const directorEntity = world.query("SpawnDirector" as any)[0];
    if (directorEntity !== undefined) {
      const director = world.getComponent(directorEntity, "SpawnDirector" as any) as any;
      if (director) {
        world.mutateSingleton("GameState", (gs) => {
          const nextLevel = director.waveIndex + 1;
          if (gs.level < nextLevel) {
            const oldLevel = gs.level;
            gs.level = nextLevel;
            const eventBus = world.getEventBus() as any;
            if (eventBus) {
              eventBus.emit("level:completed", { level: oldLevel, nextLevel: gs.level });
            }
          }
        });
      }
    }

    // 3. Update screen shake duration
    if (gameState.screenShake) {
      world.mutateSingleton("GameState", (gs) => {
          if (gs.screenShake) {
              gs.screenShake.elapsed = (gs.screenShake.elapsed ?? 0) + deltaTime;
              gs.screenShake.duration -= deltaTime;
              if (gs.screenShake.duration <= 0) {
                gs.screenShake = null;
              }
          }
      });
    }

  }

  protected getGameState(world: World<SpaceInvadersComponentRegistry>): GameStateComponent | undefined {
    return world.getSingleton("GameState");
  }

  protected evaluateGameOverCondition(state: GameStateComponent): boolean {
    return state.isGameOver || state.lives <= 0;
  }

  public resetGameOverState(world?: World<SpaceInvadersComponentRegistry>): void {
    const w = world || (this._world as World<SpaceInvadersComponentRegistry>);
    if (!w) return;
    w.mutateSingleton("GameState", (gameState) => {
        gameState.isGameOver = false;
        gameState.gameOverLogged = false;
        gameState.score = 0;
        gameState.level = 1;
        gameState.lives = 3;
    });

    const comboEntities = w.query("Combo");
    const comboEntity = comboEntities[0];
    if (comboEntity !== undefined) {
      w.mutateComponent(comboEntity, "Combo", (c) => {
        c.combo = 0;
        c.multiplier = 1;
        c.timerRemaining = 0;
      });
    }
  }
}
