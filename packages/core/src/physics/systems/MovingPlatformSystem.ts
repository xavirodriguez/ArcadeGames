import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

/**
 * System controlling the autonomous motion trajectories of moving platforms.
 *
 * @remarks
 * Evaluates movement patterns (e.g., trigonometric sine oscillation) to update platform position and velocity vectors.
 * Synchronizes computed platform velocity so passenger entities can be carried dynamically by `PlatformCarrySystem`.
 *
 * @public
 */
export class MovingPlatformSystem extends System<CoreComponentRegistry> {
  /**
   * Updates autonomous moving platform positions and velocity vectors.
   *
   * @param world - Simulation world instance.
   * @param deltaTime - Frame elapsed time in seconds.
   *
   * @sideEffect Mutates `MovingPlatform`, `Transform`, and `Velocity` components on platform entities.
   */
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || !Number.isFinite(deltaTime) || deltaTime <= 0) return;
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
        const previousVelocity = world.getComponent(entity, "Velocity");
        const previousVx = previousVelocity?.vx ?? 0;
        const previousVy = previousVelocity?.vy ?? 0;
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
        if ((previousVx !== 0 && vx !== 0 && Math.sign(previousVx) !== Math.sign(vx))
          || (previousVy !== 0 && vy !== 0 && Math.sign(previousVy) !== Math.sign(vy))) {
          world.getEventBus()?.emit("locomotion:platform_reversed", {
            entity,
            x: nextX,
            y: nextY,
            velocityX: vx,
            velocityY: vy
          });
        }
      }
    }
  }
}
