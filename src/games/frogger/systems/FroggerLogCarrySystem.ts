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

    // Check invulnerability
    const health = world.getComponent(froggerEntity, "Health");
    const isInvulnerable =
      (frogger.invulnerableRemaining !== undefined && frogger.invulnerableRemaining > 0) ||
      (health !== undefined && health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0);

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

    // Radius / half size from Frogger collider
    let frogRadius = (config.GRID_SIZE - 12) / 2;
    const collider = world.getComponent(froggerEntity, "Collider2D");
    if (collider && collider.shape && "radius" in collider.shape) {
      frogRadius = collider.shape.radius;
    }

    const overlapRatio = config.LOG_OVERLAP_RATIO ?? 0.65;

    for (let i = 0; i < logEntities.length; i++) {
      const e = logEntities[i];
      const log = world.getComponent(e, "Log");
      const logTransform = world.getComponent(e, "Transform");
      const logVel = world.getComponent(e, "Velocity");

      if (log && logTransform && logVel && log.laneY === frogger.gridY) {
        const logWidth = config.GRID_SIZE * log.length;
        const halfWidth = logWidth / 2;
        const left = logTransform.x - halfWidth;
        const right = logTransform.x + halfWidth;

        const frogLeft = froggerX - frogRadius;
        const frogRight = froggerX + frogRadius;

        const overlap = Math.min(frogRight, right) - Math.max(frogLeft, left);
        const overlapNeeded = Math.min(logWidth, frogRadius * 2) * overlapRatio;

        if (overlap >= overlapNeeded) {
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

      // Offscreen drift check using physical bounds
      if (transform.x + frogRadius < 0 || transform.x - frogRadius > config.SCREEN_WIDTH) {
        if (!isInvulnerable) {
          this.triggerDeath(world, froggerEntity, "drift");
        }
      }
    } else {
      // Frogger is in the river without a log -> DROWNING!
      frogger.isRiding = false;
      frogger.logEntity = undefined;
      if (!isInvulnerable) {
        this.triggerDeath(world, froggerEntity, "drown");
      }
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
