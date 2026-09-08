import { System, World, BaseGame } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { FroggerConfig, DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";

export class FroggerGameStateSystem extends System<FroggerComponentRegistry> {
  private game: BaseGame<any, any, any, any, any>;
  private respawnTimer: number = 0;

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

    // Handle vehicle collision (if Frogger is alive and on road rows 7..11)
    if (frogger.isAlive && frogger.gridY >= 7 && frogger.gridY <= 11) {
      const vehicleEntities = world.query("Vehicle", "Transform");
      for (let i = 0; i < vehicleEntities.length; i++) {
        const vEntity = vehicleEntities[i];
        const vehicle = world.getComponent(vEntity, "Vehicle");
        const vTransform = world.getComponent(vEntity, "Transform");

        if (vehicle && vTransform && vehicle.laneY === frogger.gridY) {
          const vWidth = vehicle.vehicleType === "truck" ? config.GRID_SIZE * 2 : config.GRID_SIZE * 1.2;
          const leftEdge = vTransform.x - vWidth / 2;
          const rightEdge = vTransform.x + vWidth / 2;

          if (transform.x >= leftEdge - 10 && transform.x <= rightEdge + 10) {
            frogger.isAlive = false;
            const eventBus = world.getEventBus();
            if (eventBus) {
              eventBus.emit("frogger:died", { reason: "vehicle", gridX: frogger.gridX, gridY: frogger.gridY });
            }
            break;
          }
        }
      }
    }

    // Handle Goal Landing at row 0
    if (frogger.isAlive && frogger.gridY === 0) {
      const lilyPads = world.query("GoalLilyPad", "Transform");
      let hitPadEntity: number | undefined = undefined;

      for (let i = 0; i < lilyPads.length; i++) {
        const padEntity = lilyPads[i];
        const pad = world.getComponent(padEntity, "GoalLilyPad");
        const padTransform = world.getComponent(padEntity, "Transform");

        if (pad && padTransform && !pad.occupied) {
          if (Math.abs(transform.x - padTransform.x) < config.GRID_SIZE * 0.75) {
            hitPadEntity = padEntity;
            break;
          }
        }
      }

      if (hitPadEntity !== undefined) {
        // Successfully occupied a lily pad!
        world.mutateComponent(hitPadEntity, "GoalLilyPad", (p) => {
          p.occupied = true;
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
        // Reached row 0 but missed an unoccupied pad -> Death
        frogger.isAlive = false;
        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("frogger:died", { reason: "missed_goal", gridX: frogger.gridX, gridY: frogger.gridY });
        }
      }
    }

    // Handle Dead state & respawn
    if (!frogger.isAlive) {
      if (this.respawnTimer === 0) {
        state.lives -= 1;
        this.respawnTimer = 0.5; // 0.5s death delay

        if (state.lives <= 0) {
          state.isGameOver = true;
          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emit("game:over", { score: state.score, level: state.level });
          }
        }
      } else {
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) {
          this.respawnTimer = 0;
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

    world.mutateComponent(froggerEntity, "Frogger", (f) => {
      f.gridX = startX;
      f.gridY = startY;
      f.isAlive = true;
      f.isRiding = false;
      f.logEntity = undefined;
      f.cooldownRemaining = 0;
      f.furthestY = startY;
    });

    world.mutateComponent(froggerEntity, "Transform", (t) => {
      t.x = startX * config.GRID_SIZE + config.GRID_SIZE / 2;
      t.y = startY * config.GRID_SIZE + config.GRID_SIZE / 2;
    });
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

    this.respawnTimer = 0;
  }
}
