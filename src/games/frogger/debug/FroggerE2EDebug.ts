import type { World } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";
import type { FroggerConfig } from "../types/FroggerConfigSchema";

export interface FroggerE2EDebugGame {
  getWorld: () => World<FroggerComponentRegistry>;
  getSeed: () => number;
  pause: () => void;
  resume: () => void;
  isPausedState: () => boolean;
}

export interface FroggerE2EDebugApi {
  setSeed: (seed: number) => void;
  applyFixture: () => void;
  applyBaselineFixture: () => void;
  pause: () => void;
  resume: () => void;
  getState: () => {
    seed: number;
    level: number;
    score: number;
    lives: number;
    occupiedLilyPads: number;
    totalLilyPads: number;
    timeRemaining: number;
    isPaused: boolean;
    frogCooldown: number;
  };
}

export interface FroggerE2EDebugActions {
  setSeed: (seed: number) => void;
}

export function createFroggerE2EDebugApi(
  game: FroggerE2EDebugGame,
  actions: FroggerE2EDebugActions
): FroggerE2EDebugApi {
  const world = game.getWorld();

  const applyFixture = (): void => {
    const config: FroggerConfig =
      world.getResource<FroggerConfig>("GameConfig") ?? DEFAULT_FROGGER_CONFIG;

    world.mutateSingleton("FroggerState", (state) => {
      state.level = 3;
      state.lives = config.INITIAL_LIVES;
      state.occupiedLilyPads = 2;
      state.totalLilyPads = config.TOTAL_LILY_PADS;
      state.timeRemaining = config.FROG_TIME_LIMIT;
      state.isGameOver = false;
      state.isWin = false;
    });

    const pads = world.query("GoalLilyPad");
    pads.forEach((entity, index) => {
      world.mutateComponent(entity, "GoalLilyPad", (pad) => {
        pad.occupied = index === 0 || index === 3;
      });
    });

    const frogEntities = world.query("Frogger", "Transform");
    const frogEntity = frogEntities[0];
    const logEntities = world.query("Log", "Transform");
    const logEntity = logEntities[0];

    if (frogEntity !== undefined && logEntity !== undefined) {
      const logTransform = world.getComponent(logEntity, "Transform") as
        | { x?: number; y?: number; worldX?: number; worldY?: number }
        | undefined;
      const frogComponent = world.getMutableComponent(frogEntity, "Frogger");
      const frogTransform = world.getMutableComponent(frogEntity, "Transform");

      if (frogComponent && frogTransform) {
        frogComponent.cooldownRemaining = config.INPUT_COOLDOWN_TICKS / 2;
        frogComponent.isRiding = true;
        frogComponent.logEntity = logEntity;
        frogComponent.facing = "up";

        const targetX = logTransform?.worldX ?? logTransform?.x ?? frogTransform.x;
        const targetY = logTransform?.worldY ?? logTransform?.y ?? frogTransform.y;
        frogTransform.x = targetX;
        frogTransform.y = targetY;
        frogTransform.dirty = true;
      }
    }

    const turtleEntities = logEntities.filter((entity) => {
      const component = world.getComponent(entity, "Log");
      return component?.logType === "turtle";
    });

    if (turtleEntities.length > 0) {
      world.mutateComponent(turtleEntities[0], "Log", (component) => {
        component.divePhase = "warning";
      });
    }
    if (turtleEntities.length > 1) {
      world.mutateComponent(turtleEntities[1], "Log", (component) => {
        component.divePhase = "submerged";
      });
    }

    game.pause();
  };

  const getState = () => {
    const state = world.getSingleton("FroggerState");
    const frogEntities = world.query("Frogger", "Transform");
    const frogEntity = frogEntities[0];
    const frogComponent =
      frogEntity !== undefined ? world.getComponent(frogEntity, "Frogger") : undefined;

    return {
      seed: game.getSeed(),
      level: state?.level ?? 0,
      score: state?.score ?? 0,
      lives: state?.lives ?? 0,
      occupiedLilyPads: state?.occupiedLilyPads ?? 0,
      totalLilyPads: state?.totalLilyPads ?? 0,
      timeRemaining: state?.timeRemaining ?? 0,
      isPaused: game.isPausedState(),
      frogCooldown: frogComponent?.cooldownRemaining ?? 0,
    };
  };

  return {
    setSeed: (seed: number) => actions.setSeed(seed),
    applyFixture,
    applyBaselineFixture: applyFixture,
    pause: () => game.pause(),
    resume: () => game.resume(),
    getState,
  };
}