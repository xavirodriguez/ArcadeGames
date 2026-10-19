import { System, World } from "@tiny-aster/core";
import { FroggerComponentRegistry } from "../types/FroggerTypes";
import { FroggerConfig, DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";
import { isEntityInvulnerable } from "./FroggerGameStateSystem";

export class FroggerLogCarrySystem extends System<FroggerComponentRegistry> {
  public update(world: World<FroggerComponentRegistry>, dt: number): void {
    const config = world.getResource<FroggerConfig>("GameConfig") || DEFAULT_FROGGER_CONFIG;
    const froggerEntities = world.query("Frogger", "Transform");
    if (froggerEntities.length === 0) return;

    const froggerEntity = froggerEntities[0];
    const froggerRead = world.getComponent(froggerEntity, "Frogger");
    const transformRead = world.getComponent(froggerEntity, "Transform");

    if (!froggerRead || !transformRead || !froggerRead.isAlive) return;

    const isInvulnerable = isEntityInvulnerable(world, froggerEntity);
    const isRiverRow = froggerRead.gridY >= 1 && froggerRead.gridY <= 5;

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
    if (!frogger || !transform || !frogger.isAlive) return;

    const logEntities = world.query("Log", "Transform", "Velocity");
    let ridingLogEntity: number | undefined = undefined;
    let ridingLogVx = 0;
    let platformLethal = false;

    const froggerX = transform.x;

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

      if (log && logTransform && logVel && log.laneY === frogger.gridY) {
        if (log.logType === "turtle" && log.divePhase === "submerged") {
          continue;
        }

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

          if (log.logType === "crocodile" && log.mouthOpen) {
            const headFraction = 0.35;
            const headWidth = logWidth * headFraction;
            let headLeft: number;
            let headRight: number;
            if (log.direction > 0) {
              headLeft = right - headWidth;
              headRight = right;
            } else {
              headLeft = left;
              headRight = left + headWidth;
            }
            const headOverlap = Math.min(frogRight, headRight) - Math.max(frogLeft, headLeft);
            if (headOverlap > 0) {
              platformLethal = true;
            }
          }
          break;
        }
      }
    }

    if (ridingLogEntity !== undefined) {
      if (platformLethal && !isInvulnerable) {
        this.triggerDeath(world, froggerEntity, "crocodile");
        return;
      }

      frogger.isRiding = true;
      frogger.logEntity = ridingLogEntity;

      transform.x += ridingLogVx * dt;
      frogger.gridX = Math.max(
        0,
        Math.min(config.TOTAL_COLS - 1, Math.floor(transform.x / config.GRID_SIZE))
      );

      if (transform.x + frogRadius < 0 || transform.x - frogRadius > config.worldWidth) {
        if (!isInvulnerable) {
          this.triggerDeath(world, froggerEntity, "drift");
        }
      }

      const currentLog = world.getComponent(ridingLogEntity, "Log");
      if (
        currentLog?.logType === "turtle" &&
        currentLog.divePhase === "submerged" &&
        !isInvulnerable
      ) {
        this.triggerDeath(world, froggerEntity, "drown");
      }
    } else {
      frogger.isRiding = false;
      frogger.logEntity = undefined;
      if (!isInvulnerable) {
        this.triggerDeath(world, froggerEntity, "drown");
      }
    }
  }

  private triggerDeath(
    world: World<FroggerComponentRegistry>,
    froggerEntity: number,
    reason: "drown" | "drift" | "crocodile"
  ): void {
    const frogger = world.getMutableComponent(froggerEntity, "Frogger");
    if (!frogger || !frogger.isAlive) return;

    frogger.isAlive = false;

    const eventBus = world.getEventBus();
    if (eventBus) {
      eventBus.emit("frogger:died", { reason, gridX: frogger.gridX, gridY: frogger.gridY });
    }
  }
}
