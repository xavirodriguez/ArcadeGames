import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * System responsible for updating the position history of Trail components.
 * Runs during the simulation (Update) phase.
 * @public
 */
export class TrailSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.isReSimulating) return;
    if (world.getResource("IsPaused") === true) return;

    const trailEntities = world.query("Transform", "Trail");
    for (const entity of trailEntities) {
        const transform = world.getComponent(entity, "Transform")!;

        world.mutateComponent(entity, "Trail", trail => {
            trail.currentIndex = (trail.currentIndex + 1) % trail.maxLength;
            const point = trail.points[trail.currentIndex];
            if (point) {
                point.x = transform.worldX ?? transform.x;
                point.y = transform.worldY ?? transform.y;
            }
            if (trail.count < trail.maxLength) {
                trail.count++;
            }
        });
    }
  }
}
