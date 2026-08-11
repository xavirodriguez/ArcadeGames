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
    const tilemaps = world.query("Tilemap", "Transform");
    const players = world.query("PlatformerInput", "Transform");

    // 1. Update PlayerSensors
    const sensorEntities = world.query("PlayerSensor", "Transform");
    for (let i = 0; i < sensorEntities.length; i++) {
      const entity = sensorEntities[i];
      const sensor = world.getComponent(entity, "PlayerSensor")!;
      const trans = world.getComponent(entity, "Transform")!;

      let detected: number | undefined;
      let minDistance = Infinity;

      for (let p = 0; p < players.length; p++) {
        const playerEntity = players[p];
        const playerTrans = world.getComponent(playerEntity, "Transform")!;

        const dx = playerTrans.x - trans.x;
        const dy = playerTrans.y - trans.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= sensor.visionRange && dist < minDistance) {
          minDistance = dist;
          detected = playerEntity;
        }
      }

      world.mutateComponent(entity, "PlayerSensor", (s) => {
        s.detectedPlayerEntity = detected;
      });
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

        world.mutateComponent(entity, "GroundDetector", (gd) => {
          gd.hasWallAhead = hasWallAhead;
          gd.hasGroundAhead = hasGroundAhead;
        });
      }
    }
  }
}
