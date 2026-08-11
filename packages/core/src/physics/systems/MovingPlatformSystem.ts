import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

/**
 * System that controls the autonomous movement of moving platforms.
 * @public
 */
export class MovingPlatformSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const entities = world.query("Transform", "Velocity", "MovingPlatform");

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const plat = world.getComponent(entity, "MovingPlatform");
      if (!plat) continue;

      world.mutateComponent(entity, "MovingPlatform", (p) => {
        p.elapsed += deltaTime;
      });

      const updatedPlat = world.getComponent(entity, "MovingPlatform")!;

      if (updatedPlat.pattern === "sine") {
        const theta = updatedPlat.elapsed * updatedPlat.frequency * 2 * Math.PI;
        const nextX = updatedPlat.startX + Math.sin(theta) * updatedPlat.amplitudeX;
        const nextY = updatedPlat.startY + Math.sin(theta) * updatedPlat.amplitudeY;

        const currentTrans = world.getComponent(entity, "Transform")!;
        const vx = (nextX - currentTrans.x) / deltaTime;
        const vy = (nextY - currentTrans.y) / deltaTime;

        world.mutateComponent(entity, "Transform", (tr) => {
          tr.x = nextX;
          tr.y = nextY;
          tr.dirty = true;
        });

        world.mutateComponent(entity, "Velocity", (v) => {
          v.vx = vx;
          v.vy = vy;
        });
      }
    }
  }
}
