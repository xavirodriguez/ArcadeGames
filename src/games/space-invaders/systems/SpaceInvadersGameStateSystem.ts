import { World, BaseGame, BaseGameStateSystem } from "@tiny-aster/core";
import { GameStateComponent, SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { spawnInvaderWave } from "../EntityFactory";
import { ISpaceInvadersGame } from "../types/GameInterfaces";

/**
 * System that manages the overall game state, level progression, and game over.
 */
export class SpaceInvadersGameStateSystem extends BaseGameStateSystem<GameStateComponent, SpaceInvadersComponentRegistry> {
  constructor(game: ISpaceInvadersGame) {
    super("GameState");
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
          gs.level = director.waveIndex + 1;
        });
      }
    }

    // 3. Update screen shake duration
    if (gameState.screenShake) {
      world.mutateSingleton("GameState", (gs) => {
          if (gs.screenShake) {
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
