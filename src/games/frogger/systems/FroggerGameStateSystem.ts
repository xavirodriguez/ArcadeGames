import { System, World, BaseGame, findMatchingEntityInTriggersOrCollisions } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { FroggerConfig, DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";

/**
 * Returns true if the entity is currently invulnerable according to HealthComponent.
 */
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

export class FroggerGameStateSystem extends System<FroggerComponentRegistry> {
  private game: BaseGame<any, any, any, any, any>;

  constructor(game: BaseGame<any, any, any, any, any>) {
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

    // Decrement invulnerability timer on HealthComponent (consolidated single source of truth)
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

    // Handle vehicle collision using CollisionEvents
    if (frogger.isAlive && !invulnerable && frogger.gridY >= 7 && frogger.gridY <= 11) {
      const collidedVehicle = findMatchingEntityInTriggersOrCollisions(world, froggerEntity, (other) =>
        world.hasComponent(other, "Vehicle")
      );

      if (collidedVehicle !== null) {
        frogger.isAlive = false;
        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("frogger:died", { reason: "vehicle", gridX: frogger.gridX, gridY: frogger.gridY });
        }
      }
    }

    // Handle Goal Landing at row 0
    if (frogger.isAlive && frogger.gridY === 0) {
      const lilyPads = world.query("GoalLilyPad", "Transform");
      let hitPadEntity: number | undefined = undefined;
      let padTargetX = 0;
      let padTargetY = transform.y;

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
            break;
          }
        }
      }

      if (hitPadEntity !== undefined) {
        // Successfully occupied a lily pad!
        world.mutateComponent(hitPadEntity, "GoalLilyPad", (p) => {
          p.occupied = true;
        });

        // Snap Frogger position & grid coordinate
        transform.x = padTargetX;
        transform.y = padTargetY;
        world.mutateComponent(froggerEntity, "Frogger", (f) => {
          f.gridX = Math.round(padTargetX / config.GRID_SIZE);
        });

        state.occupiedLilyPads += 1;
        state.score += config.GOAL_POINTS;

        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("frogger:goal_reached", { padIndex: state.occupiedLilyPads, score: state.score });
        }

        // Check if level is completed (all lily pads occupied)
        if (state.occupiedLilyPads >= state.totalLilyPads) {
          state.level += 1;
          state.score += config.LEVEL_BONUS;
          state.occupiedLilyPads = 0;

          // Reset all lily pads
          for (let i = 0; i < lilyPads.length; i++) {
            world.mutateComponent(lilyPads[i], "GoalLilyPad", (p) => {
              p.occupied = false;
            });
          }

          if (eventBus) {
            eventBus.emit("frogger:level_cleared", { level: state.level, score: state.score });
          }
        }

        this.resetFroggerPosition(world, froggerEntity, config);
      } else {
        if (!invulnerable) {
          // Reached row 0 but missed an unoccupied pad -> Death
          frogger.isAlive = false;
          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emit("frogger:died", { reason: "missed_goal", gridX: frogger.gridX, gridY: frogger.gridY });
          }
        }
      }
    }

    // Handle Dead state & respawn
    if (!frogger.isAlive) {
      if (state.respawnTimer === 0) {
        state.lives -= 1;
        state.respawnTimer = 0.5; // 0.5s death delay

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
            this.resetFroggerPosition(world, froggerEntity, config);
          }
        }
      }
    }
  }

  private resetFroggerPosition(world: World<FroggerComponentRegistry>, froggerEntity: number, config: FroggerConfig): void {
    const startX = Math.floor(config.TOTAL_COLS / 2);
    const startY = 13;

    // 1. Frogger component reset
    world.mutateComponent(froggerEntity, "Frogger", (f) => {
      f.gridX = startX;
      f.gridY = startY;
      f.isAlive = true;
      f.isRiding = false;
      f.logEntity = undefined;
      f.cooldownRemaining = 0;
      f.furthestY = startY;
      f.invulnerableRemaining = 1.2;
    });

    // 2. Transform + Velocity reset
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

    // 3. Input flags reset
    if (world.hasComponent(froggerEntity, "FroggerInput")) {
      world.mutateComponent(froggerEntity, "FroggerInput", (inp) => {
        inp.moveUp = inp.moveDown = inp.moveLeft = inp.moveRight = false;
        inp.prevMoveUp = inp.prevMoveDown = inp.prevMoveLeft = inp.prevMoveRight = false;
      });
    }

    // 4. Health reset
    if (world.hasComponent(froggerEntity, "Health")) {
      world.mutateComponent(froggerEntity, "Health", (h) => {
        h.current = 1;
        h.invulnerableRemaining = 1.2;
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
      });
    }

    const lilyPads = world.query("GoalLilyPad");
    for (let i = 0; i < lilyPads.length; i++) {
      world.mutateComponent(lilyPads[i], "GoalLilyPad", (p) => {
        p.occupied = false;
      });
    }

    const froggerEntity = world.query("Frogger")[0];
    if (froggerEntity !== undefined) {
      this.resetFroggerPosition(world, froggerEntity, config);
    }
  }
}
