import { World, EventBus, BaseGameStateSystem } from "@tiny-aster/core";
import {
  PipeComponent,
  FLAPPY_CONFIG,
  FlappyBirdState,
  ScenarioId,
  FlappyBirdComponentRegistry
} from "../types/FlappyBirdTypes";
import { IFlappyBirdGame, IFlappyStateSystem } from "../types/GameInterfaces";
import { createPipe } from "../EntityFactory";
import { getScenarioConfig } from "../ScenarioDefinitions";
import { FlappyBirdConfig } from "../types/FlappyBirdConfigSchema";

export const SCENARIO_ORDER: ScenarioId[] = [
  "open_space",
  "asteroid_belt",
  "solar_storm",
  "warp_corridor",
];

export function selectScenario(
  pipesSpawnedCount: number,
  config?: Partial<FlappyBirdConfig>
): ScenarioId {
  if (config?.SCENARIO_ROTATION_ENABLED === false) {
    return "open_space";
  }
  const pipesPerScenario = config?.PIPES_PER_SCENARIO ?? 5;
  const index = Math.floor(pipesSpawnedCount / pipesPerScenario) % SCENARIO_ORDER.length;
  return SCENARIO_ORDER[index];
}

/**
 * System that manages game logic: scores, scenario rotation, spawner, and game over condition.
 */
export class FlappyBirdGameStateSystem extends BaseGameStateSystem<FlappyBirdState, FlappyBirdComponentRegistry> implements IFlappyStateSystem {
  constructor(game: IFlappyBirdGame, private config: FlappyBirdConfig = FLAPPY_CONFIG) {
    super("FlappyState");
  }

  protected updateGameState(world: World<FlappyBirdComponentRegistry>, gameState: FlappyBirdState, deltaTime: number): void {
    const pipesSpawned = gameState.pipesSpawnedCount ?? 0;
    const activeScenarioId = selectScenario(pipesSpawned, this.config);

    // --- SCENARIO ROTATION & OVERRIDES ---
    if (gameState.currentScenario !== activeScenarioId) {
      const prevScenario = gameState.currentScenario;
      const newScenarioConfig = getScenarioConfig(activeScenarioId);

      world.mutateSingleton("FlappyState", (gs) => {
        gs.previousScenario = prevScenario;
        gs.currentScenario = activeScenarioId;
        gs.scenarioTransitionTicks = 30;
        if (newScenarioConfig.associatedSectorEvent) {
          gs.currentSectorEvent = newScenarioConfig.associatedSectorEvent;
          gs.sectorEventDuration = 300;
        }
      });

      const eventBus = world.getResource<EventBus>("EventBus");
      if (eventBus) {
        eventBus.emitDeferred("flappy:scenario_changed", {
          from: prevScenario,
          to: activeScenarioId,
        });
        if (newScenarioConfig.associatedSectorEvent && newScenarioConfig.associatedSectorEvent !== "none") {
          eventBus.emitDeferred("flappy:sector_event_started", {
            event: newScenarioConfig.associatedSectorEvent,
          });
        }
      }
    }

    if ((gameState.scenarioTransitionTicks ?? 0) > 0) {
      world.mutateSingleton("FlappyState", (gs) => {
        gs.scenarioTransitionTicks = (gs.scenarioTransitionTicks ?? 0) - 1;
      });
    }

    const activeScenarioConfig = getScenarioConfig(gameState.currentScenario ?? "open_space");
    const scenarioOverrides = activeScenarioConfig.configOverrides;
    const scenarioSpeedMult = scenarioOverrides?.pipeSpeedMultiplier ?? 1.0;

    // --- SECTOR ENVIRONMENTAL EVENTS ---
    const eventTicks = (gameState.sectorEventTicks ?? 0) + 1;
    let currentEvent = gameState.currentSectorEvent ?? "none";
    let eventDuration = gameState.sectorEventDuration ?? 0;
    let eventSpeedMultiplier = 1.0;

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

      const eventBus = world.getResource<EventBus>("EventBus");
      if (eventBus) {
        eventBus.emitDeferred("flappy:sector_event_started", { event: currentEvent });
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
        const endedEvent = currentEvent;
        currentEvent = "none";
        eventDuration = 0;

        const eventBus = world.getResource<EventBus>("EventBus");
        if (eventBus) {
          eventBus.emitDeferred("flappy:sector_event_ended", { event: endedEvent });
        }
      } else {
        eventDuration--;
        if (currentEvent === "solar_flare") eventSpeedMultiplier = 1.25;
        else if (currentEvent === "hyper_warp") eventSpeedMultiplier = 1.4;
        else if (currentEvent === "asteroid_storm") eventSpeedMultiplier = 0.85;
      }
    }

    const totalPipeSpeedMultiplier = scenarioSpeedMult * eventSpeedMultiplier;

    world.mutateSingleton("FlappyState", (gs) => {
      gs.sectorEventTicks = eventTicks;
      gs.currentSectorEvent = currentEvent;
      gs.sectorEventDuration = eventDuration;
      gs.pipeSpeedMultiplier = totalPipeSpeedMultiplier;
    });

    // Update Pipe Spawner
    world.mutateSingleton("FlappyState", (gs) => {
      gs.pipeSpawnTimer += deltaTime;
    });

    const spawnIntervalMs = scenarioOverrides?.PIPE_SPAWN_INTERVAL ?? this.config.PIPE_SPAWN_INTERVAL;
    if (gameState.pipeSpawnTimer >= spawnIntervalMs / 1000) {
      const margin = this.config.PIPE_SPAWN_MARGIN;
      const gapY = world.gameplayRandom.nextInt(margin, this.config.worldHeight - margin);

      createPipe({
        world,
        x: this.config.worldWidth + this.config.PIPE_WIDTH,
        gapY,
        deferred: true,
      });

      world.mutateSingleton("FlappyState", (gs) => {
        gs.pipeSpawnTimer = 0;
        gs.pipesSpawnedCount = (gs.pipesSpawnedCount ?? 0) + 1;
      });
    }

    // Update velocity of pipes based on totalPipeSpeedMultiplier and handle scoring / cleanup
    const pipes = world.query("Pipe", "Transform", "Velocity");
    pipes.forEach((entity) => {
      const pos = world.getComponent(entity, "Transform");
      const pipe = world.getComponent(entity, "Pipe");

      if (pos && pipe) {
        world.mutateComponent(entity, "Velocity", (v) => {
          v.vx = -this.config.PIPE_SPEED * totalPipeSpeedMultiplier;
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
            eventBus.emitDeferred("pipe:passed", {
              pipeEntity: entity,
              movementType: pipe.movementType,
              isNarrowGap: pipe.isNarrowGap
            });
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
