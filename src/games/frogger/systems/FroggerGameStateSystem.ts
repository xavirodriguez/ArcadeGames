import { System, World, BaseGame, findMatchingEntityInTriggersOrCollisions } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { FroggerConfig, DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";

export function isEntityInvulnerable(
  world: World<FroggerComponentRegistry>,
  entity: number
): boolean {
  const frogger = world.getComponent(entity, "Frogger");
  if (frogger?.invulnerableRemaining !== undefined && frogger.invulnerableRemaining > 0) {
    return true;
  }
  const health = world.getComponent(entity, "Health");
  return !!(health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0);
}

function computeTimeLimit(config: FroggerConfig, level: number): number {
  const reduction = (config.TIME_LIMIT_REDUCTION_PER_LEVEL ?? 0) * Math.max(0, level - 1);
  return Math.max(config.MIN_TIME_LIMIT ?? 15, (config.FROG_TIME_LIMIT ?? 30) - reduction);
}

export class FroggerGameStateSystem extends System<FroggerComponentRegistry> {
  private game: BaseGame;

  constructor(game: BaseGame) {
    super();
    this.game = game;
  }

  public update(world: World<FroggerComponentRegistry>, dt: number): void {
    const config = world.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
    const stateEntity = world.query("FroggerState")[0];
    if (stateEntity === undefined) return;

    const state = world.getMutableComponent(stateEntity, "FroggerState");
    if (!state || state.isGameOver) return;

    const froggerEntity = world.query("Frogger", "Transform")[0];
    if (froggerEntity === undefined) return;

    const frogger = world.getMutableComponent(froggerEntity, "Frogger");
    const transform = world.getMutableComponent(froggerEntity, "Transform");
    if (!frogger || !transform) return;

    const health = world.getMutableComponent(froggerEntity, "Health");
    if (health && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
      health.invulnerableRemaining -= dt;
      if (health.invulnerableRemaining < 0) health.invulnerableRemaining = 0;
    }
    if (frogger.invulnerableRemaining !== undefined && frogger.invulnerableRemaining > 0) {
      frogger.invulnerableRemaining -= dt;
      if (frogger.invulnerableRemaining < 0) frogger.invulnerableRemaining = 0;
    }

    const invulnerable = isEntityInvulnerable(world, froggerEntity);

    if (frogger.isAlive && state.respawnTimer === 0) {
      state.timeRemaining -= dt;
      if (state.timeRemaining <= 0) {
        state.timeRemaining = 0;
        frogger.isAlive = false;
        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("frogger:died", {
            reason: "timeout",
            gridX: frogger.gridX,
            gridY: frogger.gridY,
          });
        }
      }
    }

    this.updatePlatformCycles(world, config, dt);
    this.updateFlyTimers(world, config, dt);

    if (frogger.isAlive && !invulnerable && frogger.gridY >= 7 && frogger.gridY <= 11) {
      const collidedVehicle = findMatchingEntityInTriggersOrCollisions(world, froggerEntity, (other) =>
        world.hasComponent(other, "Vehicle")
      );
      if (collidedVehicle !== null) {
        frogger.isAlive = false;
        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("frogger:died", {
            reason: "vehicle",
            gridX: frogger.gridX,
            gridY: frogger.gridY,
          });
        }
      }
    }

    if (frogger.isAlive && !invulnerable) {
      const collidedSnake = findMatchingEntityInTriggersOrCollisions(world, froggerEntity, (other) =>
        world.hasComponent(other, "Snake")
      );
      if (collidedSnake !== null) {
        frogger.isAlive = false;
        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("frogger:died", {
            reason: "snake",
            gridX: frogger.gridX,
            gridY: frogger.gridY,
          });
        }
      }
    }

    if (frogger.isAlive && frogger.gridY === 0) {
      const lilyPads = world.query("GoalLilyPad", "Transform");
      let hitPadEntity: number | undefined = undefined;
      let padTargetX = 0;
      let padTargetY = transform.y;
      let padHasFly = false;
      let padHasCroc = false;
      const catchThreshold = config.GRID_SIZE * (config.LILY_PAD_CATCH_THRESHOLD ?? 0.88);

      for (let i = 0; i < lilyPads.length; i++) {
        const padEntity = lilyPads[i];
        const pad = world.getComponent(padEntity, "GoalLilyPad");
        const padTransform = world.getComponent(padEntity, "Transform");
        if (pad && padTransform && !pad.occupied) {
          if (Math.abs(transform.x - padTransform.x) < catchThreshold) {
            hitPadEntity = padEntity;
            padTargetX = padTransform.x;
            padTargetY = padTransform.y;
            padHasFly = !!pad.hasFly;
            padHasCroc = !!pad.hasCrocodile;
            break;
          }
        }
      }

      if (hitPadEntity !== undefined) {
        if (padHasCroc) {
          frogger.isAlive = false;
          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emit("frogger:died", {
              reason: "crocodile",
              gridX: frogger.gridX,
              gridY: frogger.gridY,
            });
          }
        } else {
          world.mutateComponent(hitPadEntity, "GoalLilyPad", (p) => {
            p.occupied = true;
            p.hasFly = false;
            p.flyTimer = 0;
            p.hasCrocodile = false;
          });
          transform.x = padTargetX;
          transform.y = padTargetY;
          world.mutateComponent(froggerEntity, "Frogger", (f) => {
            f.gridX = Math.round(padTargetX / config.GRID_SIZE);
          });
          state.occupiedLilyPads += 1;
          state.score += config.GOAL_POINTS;
          const timeBonus =
            Math.floor(state.timeRemaining) * (config.TIME_BONUS_PER_SECOND ?? 10);
          if (timeBonus > 0) state.score += timeBonus;
          if (padHasFly) {
            state.score += config.FLY_BONUS_POINTS ?? 200;
            const eventBus = world.getEventBus();
            if (eventBus) eventBus.emit("frogger:fly_caught", { score: state.score });
          }
          this.checkExtraLife(world, stateEntity, state, config);
          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emit("frogger:goal_reached", {
              padIndex: state.occupiedLilyPads,
              score: state.score,
              timeBonus,
            });
          }
          if (state.occupiedLilyPads >= state.totalLilyPads) {
            state.level += 1;
            state.score += config.LEVEL_BONUS;
            state.occupiedLilyPads = 0;
            const maxScale = config.MAX_SPEED_MULTIPLIER ?? 2.5;
            state.trafficSpeedScale = Math.min(
              maxScale,
              state.trafficSpeedScale * (config.TRAFFIC_SPEED_MULTIPLIER ?? 1.15)
            );
            state.riverSpeedScale = Math.min(
              maxScale,
              state.riverSpeedScale * (config.RIVER_SPEED_MULTIPLIER ?? 1.12)
            );
            this.applySpeedScales(world, state);
            for (let i = 0; i < lilyPads.length; i++) {
              world.mutateComponent(lilyPads[i], "GoalLilyPad", (p) => {
                p.occupied = false;
                p.hasFly = false;
                p.flyTimer = 0;
                p.hasCrocodile = false;
              });
            }
            this.maybeSpawnPadHazards(world, config, state.level);
            if (eventBus) {
              eventBus.emit("frogger:level_cleared", {
                level: state.level,
                score: state.score,
              });
            }
          }
          this.resetFroggerPosition(world, froggerEntity, config, state);
        }
      } else if (!invulnerable) {
        frogger.isAlive = false;
        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("frogger:died", {
            reason: "missed_goal",
            gridX: frogger.gridX,
            gridY: frogger.gridY,
          });
        }
      }
    }

    if (!frogger.isAlive) {
      if (state.respawnTimer === 0) {
        state.lives -= 1;
        state.respawnTimer = 0.5;
        if (state.lives <= 0) {
          state.isGameOver = true;
          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emit("game:over", { score: state.score, level: state.level });
          }
        }
      } else {
        state.respawnTimer -= dt;
        if (state.respawnTimer <= 0) {
          state.respawnTimer = 0;
          if (state.lives > 0) {
            this.resetFroggerPosition(world, froggerEntity, config, state);
          }
        }
      }
    }
  }

  private updatePlatformCycles(
    world: World<FroggerComponentRegistry>,
    config: FroggerConfig,
    dt: number
  ): void {
    const logs = world.query("Log");
    for (const e of logs) {
      const log = world.getMutableComponent(e, "Log");
      if (!log) continue;
      if (log.logType === "turtle" && log.divePhase !== undefined && log.diveTimer !== undefined) {
        log.diveTimer -= dt;
        if (log.diveTimer <= 0) {
          if (log.divePhase === "float") {
            log.divePhase = "warning";
            log.diveTimer = config.TURTLE_WARNING_DURATION ?? 1.5;
          } else if (log.divePhase === "warning") {
            log.divePhase = "submerged";
            log.diveTimer = config.TURTLE_SUBMERGED_DURATION ?? 2;
          } else {
            log.divePhase = "float";
            log.diveTimer = config.TURTLE_FLOAT_DURATION ?? 4;
          }
        }
      }
      if (log.logType === "crocodile" && log.mouthTimer !== undefined) {
        log.mouthTimer -= dt;
        if (log.mouthTimer <= 0) {
          log.mouthOpen = !log.mouthOpen;
          log.mouthTimer = log.mouthOpen
            ? (config.CROCODILE_OPEN_DURATION ?? 2)
            : (config.CROCODILE_CLOSED_DURATION ?? 3);
        }
      }
    }
  }

  private updateFlyTimers(
    world: World<FroggerComponentRegistry>,
    config: FroggerConfig,
    dt: number
  ): void {
    const pads = world.query("GoalLilyPad");
    for (const e of pads) {
      const pad = world.getMutableComponent(e, "GoalLilyPad");
      if (!pad || !pad.hasFly) continue;
      pad.flyTimer = (pad.flyTimer ?? 0) - dt;
      if (pad.flyTimer <= 0) {
        pad.hasFly = false;
        pad.flyTimer = 0;
      }
    }
  }

  private maybeSpawnPadHazards(
    world: World<FroggerComponentRegistry>,
    config: FroggerConfig,
    level: number
  ): void {
    const rng = (world as any).getResource?.("RNG") as { next: () => number } | undefined;
    const rand = () => (rng ? rng.next() : ((level * 17 + 31) % 100) / 100);
    const pads = world.query("GoalLilyPad");
    const freePads = pads.filter((e) => {
      const p = world.getComponent(e, "GoalLilyPad");
      return p && !p.occupied;
    });
    if (freePads.length === 0) return;
    if (rand() < 0.25) {
      const idx = Math.floor(rand() * freePads.length);
      world.mutateComponent(freePads[idx], "GoalLilyPad", (p) => {
        p.hasFly = true;
        p.flyTimer = config.FLY_DURATION ?? 5;
        p.hasCrocodile = false;
      });
    }
    if (level >= 2) {
      const chance = Math.min(0.35, (config.CROCODILE_PAD_BASE_CHANCE ?? 0.08) * level);
      if (rand() < chance) {
        const candidates = freePads.filter((e) => {
          const p = world.getComponent(e, "GoalLilyPad");
          return p && !p.hasFly;
        });
        if (candidates.length > 0) {
          const idx = Math.floor(rand() * candidates.length);
          world.mutateComponent(candidates[idx], "GoalLilyPad", (p) => {
            p.hasCrocodile = true;
            p.hasFly = false;
          });
        }
      }
    }
  }

  private applySpeedScales(
    world: World<FroggerComponentRegistry>,
    state: { trafficSpeedScale: number; riverSpeedScale: number }
  ): void {
    const vehicles = world.query("Vehicle", "Velocity");
    for (const e of vehicles) {
      const vComp = world.getComponent(e, "Vehicle");
      const vel = world.getMutableComponent(e, "Velocity");
      if (vComp && vel) {
        vel.vx = vComp.speed * vComp.direction * state.trafficSpeedScale;
      }
    }
    const logs = world.query("Log", "Velocity");
    for (const e of logs) {
      const lComp = world.getComponent(e, "Log");
      const vel = world.getMutableComponent(e, "Velocity");
      if (lComp && vel) {
        vel.vx = lComp.speed * lComp.direction * state.riverSpeedScale;
      }
    }
  }

  private checkExtraLife(
    world: World<FroggerComponentRegistry>,
    stateEntity: number,
    state: { score: number; lives: number; extraLivesAwarded: number },
    config: FroggerConfig
  ): void {
    const threshold = config.EXTRA_LIFE_SCORE_THRESHOLD ?? 20000;
    const nextThreshold = (state.extraLivesAwarded + 1) * threshold;
    if (state.score >= nextThreshold) {
      state.lives += 1;
      state.extraLivesAwarded += 1;
      const eventBus = world.getEventBus();
      if (eventBus) {
        eventBus.emit("frogger:extra_life", { lives: state.lives, score: state.score });
      }
    }
  }

  private resetFroggerPosition(
    world: World<FroggerComponentRegistry>,
    froggerEntity: number,
    config: FroggerConfig,
    state?: { level: number; timeRemaining: number }
  ): void {
    const startX = Math.floor(config.TOTAL_COLS / 2);
    const startY = 13;
    world.mutateComponent(froggerEntity, "Frogger", (f) => {
      f.gridX = startX;
      f.gridY = startY;
      f.isAlive = true;
      f.isRiding = false;
      f.logEntity = undefined;
      f.cooldownRemaining = 0;
      f.furthestY = startY;
      f.invulnerableRemaining = 1.2;
      f.facing = "up";
    });
    world.mutateComponent(froggerEntity, "Transform", (t) => {
      t.x = startX * config.GRID_SIZE + config.GRID_SIZE / 2;
      t.y = startY * config.GRID_SIZE + config.GRID_SIZE / 2;
    });
    if (world.hasComponent(froggerEntity, "Velocity")) {
      world.mutateComponent(froggerEntity, "Velocity", (v) => {
        v.vx = 0;
        v.vy = 0;
      });
    }
    if (world.hasComponent(froggerEntity, "FroggerInput")) {
      world.mutateComponent(froggerEntity, "FroggerInput", (inp) => {
        inp.moveUp = inp.moveDown = inp.moveLeft = inp.moveRight = false;
        inp.prevMoveUp = inp.prevMoveDown = inp.prevMoveLeft = inp.prevMoveRight = false;
      });
    }
    if (world.hasComponent(froggerEntity, "Health")) {
      world.mutateComponent(froggerEntity, "Health", (h) => {
        h.current = 1;
        h.invulnerableRemaining = 1.2;
      });
    }
    const stateEntity = world.query("FroggerState")[0];
    if (stateEntity !== undefined) {
      const level =
        state?.level ?? world.getComponent(stateEntity, "FroggerState")?.level ?? 1;
      world.mutateComponent(stateEntity, "FroggerState", (s) => {
        s.timeRemaining = computeTimeLimit(config, level);
      });
    }
  }

  public resetGameOverState(world: World<FroggerComponentRegistry>): void {
    const config = world.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
    const stateEntity = world.query("FroggerState")[0];
    if (stateEntity !== undefined) {
      world.mutateComponent(stateEntity, "FroggerState", (s) => {
        s.score = 0;
        s.lives = config.INITIAL_LIVES;
        s.level = 1;
        s.isGameOver = false;
        s.isWin = false;
        s.occupiedLilyPads = 0;
        s.respawnTimer = 0;
        s.timeRemaining = config.FROG_TIME_LIMIT ?? 30;
        s.trafficSpeedScale = 1;
        s.riverSpeedScale = 1;
        s.extraLivesAwarded = 0;
      });
    }
    const lilyPads = world.query("GoalLilyPad");
    for (let i = 0; i < lilyPads.length; i++) {
      world.mutateComponent(lilyPads[i], "GoalLilyPad", (p) => {
        p.occupied = false;
        p.hasFly = false;
        p.flyTimer = 0;
        p.hasCrocodile = false;
      });
    }
    const vehicles = world.query("Vehicle", "Velocity");
    for (const e of vehicles) {
      const vComp = world.getComponent(e, "Vehicle");
      const vel = world.getMutableComponent(e, "Velocity");
      if (vComp && vel) vel.vx = vComp.speed * vComp.direction;
    }
    const logs = world.query("Log", "Velocity");
    for (const e of logs) {
      const lComp = world.getComponent(e, "Log");
      const vel = world.getMutableComponent(e, "Velocity");
      if (lComp && vel) {
        vel.vx = lComp.speed * lComp.direction;
        if (lComp.logType === "turtle") {
          world.mutateComponent(e, "Log", (l) => {
            l.divePhase = "float";
            l.diveTimer = config.TURTLE_FLOAT_DURATION ?? 4;
          });
        }
      }
    }
    const froggerEntity = world.query("Frogger")[0];
    if (froggerEntity !== undefined) {
      this.resetFroggerPosition(world, froggerEntity, config);
    }
  }
}
