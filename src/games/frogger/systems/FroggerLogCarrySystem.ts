import { System, World } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { FroggerConfig, DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";

export class FroggerLogCarrySystem extends System<FroggerComponentRegistry> {
  public update(world: World<FroggerComponentRegistry>, dt: number): void {
    const config = world.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
    const froggerEntities = world.query("Frogger", "Transform");
    if (froggerEntities.length === 0) return;

    const froggerEntity = froggerEntities[0];
    const frogger = world.getMutableComponent(froggerEntity, "Frogger");
    const transform = world.getMutableComponent(froggerEntity, "Transform");

    if (!frogger || !transform || !frogger.isAlive) return;

    // Check if Frogger is in the river area (rows 1 to 5)
    const isRiverRow = frogger.gridY >= 1 && frogger.gridY <= 5;

    if (!isRiverRow) {
      frogger.isRiding = false;
      frogger.logEntity = undefined;
      return;
    }

    // Find logs/turtles on the same row as Frogger
    const logEntities = world.query("Log", "Transform", "Velocity");
    let ridingLogEntity: number | undefined = undefined;
    let ridingLogVx = 0;

    const froggerX = transform.x;

    for (let i = 0; i < logEntities.length; i++) {
      const e = logEntities[i];
      const log = world.getComponent(e, "Log");
      const logTransform = world.getComponent(e, "Transform");
      const logVel = world.getComponent(e, "Velocity");

      if (log && logTransform && logVel && log.laneY === frogger.gridY) {
        const halfWidth = (config.GRID_SIZE * log.length) / 2;
        const leftEdge = logTransform.x - halfWidth;
        const rightEdge = logTransform.x + halfWidth;

        // Check if Frogger is standing on this log
        if (froggerX >= leftEdge && froggerX <= rightEdge) {
          ridingLogEntity = e;
          ridingLogVx = logVel.vx;
          break;
        }
      }
    }

    if (ridingLogEntity !== undefined) {
      frogger.isRiding = true;
      frogger.logEntity = ridingLogEntity;

      // Carry Frogger along with log's horizontal velocity
      transform.x += ridingLogVx * dt;
      frogger.gridX = Math.max(0, Math.min(config.TOTAL_COLS - 1, Math.floor(transform.x / config.GRID_SIZE)));

      // Offscreen drift check
      if (transform.x < -config.GRID_SIZE / 2 || transform.x > config.SCREEN_WIDTH + config.GRID_SIZE / 2) {
        this.triggerDeath(world, froggerEntity, "drift");
      }
    } else {
      // Frogger is in the river without a log -> DROWNING!
      frogger.isRiding = false;
      frogger.logEntity = undefined;
      this.triggerDeath(world, froggerEntity, "drown");
    }
  }

  private triggerDeath(world: World<FroggerComponentRegistry>, froggerEntity: number, reason: "drown" | "drift"): void {
    const frogger = world.getMutableComponent(froggerEntity, "Frogger");
    if (!frogger || !frogger.isAlive) return;

    frogger.isAlive = false;

    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emit("frogger:died", { reason, gridX: frogger.gridX, gridY: frogger.gridY });
    }
  }
}
