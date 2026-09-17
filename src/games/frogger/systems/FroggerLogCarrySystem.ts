import { System, World } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { FroggerConfig, DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";
import { isEntityInvulnerable } from "./FroggerGameStateSystem";

export class FroggerLogCarrySystem extends System<FroggerComponentRegistry> {
  public update(world: World<FroggerComponentRegistry>, dt: number): void {
    const config = world.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
    const froggerEntities = world.query("Frogger", "Transform", "GridPosition");
    if (froggerEntities.length === 0) return;

    const froggerEntity = froggerEntities[0];
    const froggerRead = world.getComponent(froggerEntity, "Frogger");
    const transformRead = world.getComponent(froggerEntity, "Transform");
    const gridPosRead = world.getComponent(froggerEntity, "GridPosition");

    if (!froggerRead || !transformRead || !gridPosRead || !froggerRead.isAlive) return;

    // Check invulnerability helper
    const isInvulnerable = isEntityInvulnerable(world, froggerEntity);

    // Check if Frogger is in the river area (rows 1 to 5)
    const isRiverRow = gridPosRead.row >= 1 && gridPosRead.row <= 5;

    if (!isRiverRow) {
      if (froggerRead.isRiding || froggerRead.logEntity !== undefined) {
        world.mutateComponent(froggerEntity, "Frogger", (f) => {
          f.isRiding = false;
          f.logEntity = undefined;
        });
      }
      return;
    }

    const frogger = world.getMutableComponent(froggerEntity, "Frogger");
    const transform = world.getMutableComponent(froggerEntity, "Transform");
    const gridPos = world.getMutableComponent(froggerEntity, "GridPosition");
    if (!frogger || !transform || !gridPos) return;

    if (!frogger || !transform || !frogger.isAlive) return;


    // Find logs/turtles on the same row as Frogger
    const logEntities = world.query("Log", "Transform", "Velocity");
    let ridingLogEntity: number | undefined = undefined;
    let ridingLogVx = 0;

    const froggerX = transform.x;

    // Radius from Frogger collider (FRG-008: eliminate fallback duplication)
    const collider = world.getComponent(froggerEntity, "Collider2D");
    const frogRadius =
      collider && collider.shape && "radius" in collider.shape
        ? collider.shape.radius
        : (config.GRID_SIZE - 12) / 2;

    const overlapRatio = config.LOG_OVERLAP_RATIO ?? 0.65;

    for (let i = 0; i < logEntities.length; i++) {
      const e = logEntities[i];
      const log = world.getComponent(e, "Log");
      const logTransform = world.getComponent(e, "Transform");
      const logVel = world.getComponent(e, "Velocity");

      if (log && logTransform && logVel && log.laneY === gridPos.row) {
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
      gridPos.col = Math.max(0, Math.min(config.TOTAL_COLS - 1, Math.floor(transform.x / config.GRID_SIZE)));

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
    const gridPos = world.getComponent(froggerEntity, "GridPosition");
    if (!frogger || !frogger.isAlive) return;

    frogger.isAlive = false;

    const eventBus = world.getEventBus();
    if (eventBus && gridPos) {
      eventBus.emit("frogger:died", { reason, gridX: gridPos.col, gridY: gridPos.row });
    }
  }
}
