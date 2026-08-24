import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * System that updates enemy sensors (GroundDetector and PlayerSensor)
 * based on the tilemap geometry and player positions.
 * @public
 */
export class EnemySensorSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const tilemaps = world.query("Tilemap", "Transform");
    const players = world.query("PlatformerInput", "Transform");

    // 1. Update PlayerSensors
    const sensorEntities = world.query("PlayerSensor", "Transform");
    for (let i = 0; i < sensorEntities.length; i++) {
      const entity = sensorEntities[i];
      const sensor = world.getComponent(entity, "PlayerSensor")!;
      const trans = world.getComponent(entity, "Transform")!;

      let detected: number | undefined;
      let minDistanceSq = Infinity;
      const visionRangeSq = sensor.visionRange * sensor.visionRange;

      for (let p = 0; p < players.length; p++) {
        const playerEntity = players[p];
        const playerTrans = world.getComponent(playerEntity, "Transform")!;

        const dx = playerTrans.x - trans.x;
        const dy = playerTrans.y - trans.y;
        const distSq = dx * dx + dy * dy;

        // Safe for determinism/rollback. Using squared distance avoids Math.sqrt on every player-sensor pair while preserving exact detection logic.
        if (distSq <= visionRangeSq && distSq < minDistanceSq) {
          minDistanceSq = distSq;
          detected = playerEntity;
        }
      }

      // Safe for determinism/rollback. Value-gated check prevents per-tick stateVersion bumps when target player detection is unchanged.
      if (sensor.detectedPlayerEntity !== detected) {
        const mutableSensor = world.getMutableComponent(entity, "PlayerSensor");
        if (mutableSensor) {
          mutableSensor.detectedPlayerEntity = detected;
        }
      }
    }

    // 2. Update GroundDetectors
    const detectorEntities = world.query("GroundDetector", "Transform");
    if (tilemaps.length > 0 && detectorEntities.length > 0) {
      const tilemapEntity = tilemaps[0];
      const tilemap = world.getComponent(tilemapEntity, "Tilemap")!;
      const tmTrans = world.getComponent(tilemapEntity, "Transform")!;

      const size = tilemap.tileSize;
      const data = tilemap.data;
      const rows = data.length;
      const cols = rows > 0 ? data[0].length : 0;

      for (let i = 0; i < detectorEntities.length; i++) {
        const entity = detectorEntities[i];
        const detector = world.getComponent(entity, "GroundDetector")!;
        const trans = world.getComponent(entity, "Transform")!;

        // Determine current direction from Patrol, Velocity, or default to 1
        let dir = 1;
        if (world.hasComponent(entity, "Patrol")) {
          dir = world.getComponent(entity, "Patrol")!.direction;
        } else if (world.hasComponent(entity, "Velocity")) {
          const vx = world.getComponent(entity, "Velocity")!.vx;
          if (vx !== 0) {
            dir = vx > 0 ? 1 : -1;
          }
        }

        const relativeX = trans.x - tmTrans.x;
        const relativeY = trans.y - tmTrans.y;

        // Wall check position
        const wallCheckX = relativeX + dir * detector.sensorOffsetX;
        const wallCheckY = relativeY;

        // Ground check position
        const groundCheckX = relativeX + dir * detector.sensorOffsetX;
        const groundCheckY = relativeY + detector.sensorOffsetY;

        // Helper to check if a position has a solid tile
        const isSolidAt = (px: number, py: number): boolean => {
          const tileC = Math.floor(px / size);
          const tileR = Math.floor(py / size);

          if (tileR < 0 || tileR >= rows || tileC < 0 || tileC >= cols) {
            return false;
          }
          const tileType = data[tileR][tileC];
          const def = tilemap.tileDefinitions ? tilemap.tileDefinitions[tileType] : undefined;
          return def ? def.solid : false;
        };

        const hasWallAhead = isSolidAt(wallCheckX, wallCheckY);
        const hasGroundAhead = isSolidAt(groundCheckX, groundCheckY);

        // Safe for determinism/rollback. Value-gated check prevents per-tick stateVersion bumps when terrain status is unchanged.
        if (detector.hasWallAhead !== hasWallAhead || detector.hasGroundAhead !== hasGroundAhead) {
          const mutableGd = world.getMutableComponent(entity, "GroundDetector");
          if (mutableGd) {
            mutableGd.hasWallAhead = hasWallAhead;
            mutableGd.hasGroundAhead = hasGroundAhead;
          }
        }
      }
    }
  }
}
