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
    const len = trailEntities.length;
    for (let i = 0; i < len; i++) {
        const entity = trailEntities[i];
        const transform = world.getComponent(entity, "Transform")!;
        const trail = world.getMutableComponent(entity, "Trail");

        if (trail) {
            trail.currentIndex = (trail.currentIndex + 1) % trail.maxLength;
            const point = trail.points[trail.currentIndex];
            if (point) {
                point.x = transform.worldX ?? transform.x;
                point.y = transform.worldY ?? transform.y;
            }
            if (trail.count < trail.maxLength) {
                trail.count++;
            }
        }
    }
  }
}
