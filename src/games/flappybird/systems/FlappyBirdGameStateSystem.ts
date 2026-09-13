import { World, BaseGame, TransformComponent } from "@tiny-aster/core";
import {
  PipeComponent,
  FLAPPY_CONFIG,
  FlappyBirdState
} from "../types/FlappyBirdTypes";
import { IFlappyBirdGame, IFlappyStateSystem } from "../types/GameInterfaces";
import { createPipe } from "../EntityFactory";
import { EventBus } from "@tiny-aster/core";
import { BaseGameStateSystem } from "@tiny-aster/core";

/**
 * System that manages game logic: scores, spawner, and game over condition.
 */
import { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";

export class FlappyBirdGameStateSystem extends BaseGameStateSystem<FlappyBirdState, FlappyBirdComponentRegistry> implements IFlappyStateSystem {
  constructor(game: IFlappyBirdGame, private config: typeof FLAPPY_CONFIG = FLAPPY_CONFIG) {
    super("FlappyState");
  }

  protected updateGameState(world: World<FlappyBirdComponentRegistry>, gameState: FlappyBirdState, deltaTime: number): void {
    // --- SECTOR ENVIRONMENTAL EVENTS ---
    const eventTicks = (gameState.sectorEventTicks ?? 0) + 1;
    let currentEvent = gameState.currentSectorEvent ?? "none";
    let eventDuration = gameState.sectorEventDuration ?? 0;
    let pipeSpeedMultiplier = 1.0;

    if (currentEvent === "none" && eventTicks % 600 === 0) { // Trigger every 10 seconds
      const nextEventRand = world.gameplayRandom.nextInt(0, 3);
      if (nextEventRand === 0) currentEvent = "solar_flare";
      else if (nextEventRand === 1) currentEvent = "asteroid_storm";
      else if (nextEventRand === 2) currentEvent = "hyper_warp";

      eventDuration = 360; // 6 seconds at 60 FPS
      if (currentEvent === "hyper_warp") {
        const comboEntities = world.query("Combo");
        if (comboEntities.length > 0) {
          world.mutateComponent(comboEntities[0], "Combo", (c: any) => {
            c.multiplier = (c.multiplier || 1) * 2;
          });
        }
      }
    }

    if (currentEvent !== "none") {
      if (eventDuration <= 1) {
        if (currentEvent === "hyper_warp") {
          const comboEntities = world.query("Combo");
          if (comboEntities.length > 0) {
            world.mutateComponent(comboEntities[0], "Combo", (c: any) => {
              c.multiplier = Math.max(1, Math.floor((c.multiplier || 1) / 2));
            });
          }
        }
        currentEvent = "none";
        eventDuration = 0;
      } else {
        eventDuration--;
        if (currentEvent === "solar_flare") pipeSpeedMultiplier = 1.25;
        else if (currentEvent === "hyper_warp") pipeSpeedMultiplier = 1.4;
        else if (currentEvent === "asteroid_storm") pipeSpeedMultiplier = 0.85;
      }
    }

    world.mutateSingleton("FlappyState", (gs) => {
      gs.sectorEventTicks = eventTicks;
      gs.currentSectorEvent = currentEvent;
      gs.sectorEventDuration = eventDuration;
      gs.pipeSpeedMultiplier = pipeSpeedMultiplier;
    });

    // Update Pipe Spawner
    world.mutateSingleton("FlappyState", (gs) => {
        gs.pipeSpawnTimer += deltaTime;
    });

    if (gameState.pipeSpawnTimer >= this.config.PIPE_SPAWN_INTERVAL / 1000) {
      const margin = this.config.PIPE_SPAWN_MARGIN;
      const gapY = world.gameplayRandom.nextInt(margin, this.config.SCREEN_HEIGHT - margin);

      const pipesSpawned = gameState.pipesSpawnedCount ?? 0;
      const cyclePos = pipesSpawned % 10;
      let movementType: PipeComponent["movementType"] = "static";
      let oscillationAmplitude: number | undefined;
      let isNarrowGap = false;

      if (cyclePos === 3) {
        movementType = "oscillating";
        oscillationAmplitude = 40;
      } else if (cyclePos === 7) {
        movementType = "laser_gate";
      } else if (cyclePos === 9) {
        isNarrowGap = true;
      }

      createPipe({
        world,
        x: this.config.SCREEN_WIDTH + this.config.PIPE_WIDTH,
        gapY,
        deferred: true,
        movementType,
        oscillationAmplitude,
        isNarrowGap,
      });

      world.mutateSingleton("FlappyState", (gs) => {
        gs.pipeSpawnTimer = 0;
        gs.pipesSpawnedCount = (gs.pipesSpawnedCount ?? 0) + 1;
      });
    }

    // Update velocity of pipes based on pipeSpeedMultiplier and handle scoring / cleanup
    const pipes = world.query("Pipe", "Transform", "Velocity");
    pipes.forEach((entity) => {
      const pos = world.getComponent(entity, "Transform");
      const pipe = world.getComponent(entity, "Pipe");
      const vel = world.getComponent(entity, "Velocity");

      if (pos && pipe && vel) {
        world.mutateComponent(entity, "Velocity", (v) => {
          v.vx = -this.config.PIPE_SPEED * pipeSpeedMultiplier;
        });

        if (pos.x < -this.config.PIPE_WIDTH) {
          world.getCommandBuffer().removeEntity(entity);
        } else if (!pipe.scored && pos.x < this.config.BIRD_X) {
          world.mutateComponent(entity, "Pipe", p => {
             p.scored = true;
          });

          let multiplier = 1;
          const comboEntities = world.query("Combo");
          if (comboEntities.length > 0) {
            world.mutateComponent(comboEntities[0], "Combo", (c: any) => {
              c.combo = (c.combo || 0) + 1;
              c.multiplier = 1 + Math.floor(c.combo / 5);
              c.timerRemaining = c.timerDuration || 2.0;
              multiplier = c.multiplier;
            });
          }

          world.mutateSingleton("FlappyState", (gs) => {
              gs.score += multiplier;
              if (gs.score > gs.highScore) {
                gs.highScore = gs.score;
              }
          });
          const eventBus = world.getResource<EventBus>("EventBus");
          if (eventBus) {
            eventBus.emitDeferred("pipe:passed", {});
            eventBus.emitDeferred("PlaySFX", { name: "score" });
          }
        }
      }
    });
  }

  protected getGameState(world: World<FlappyBirdComponentRegistry>): FlappyBirdState | undefined {
    return world.getSingleton("FlappyState");
  }

  protected evaluateGameOverCondition(state: FlappyBirdState): boolean {
    return state.isGameOver;
  }

  public isGameOver(): boolean {
    return this.getGameState(this._world as World<FlappyBirdComponentRegistry>)?.isGameOver ?? false;
  }

  public resetGameOverState(world?: World<FlappyBirdComponentRegistry>): void {
    const w = world || (this._world as World<FlappyBirdComponentRegistry>);
    if (w) {
        w.mutateSingleton("FlappyState", (state) => {
            state.gameOverLogged = false;
            state.isGameOver = false;
            state.score = 0;
            state.pipeSpawnTimer = 0;
        });
    }
  }
}
