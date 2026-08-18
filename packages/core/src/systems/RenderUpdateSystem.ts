import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * System that updates visual properties of entities before rendering.
 *
 * @remarks
 * This system handles:
 * - Procedural rotation for components with angular velocity.
 * - Visual effects like hit flash duration.
 *
 * Note: This system skips updates during re-simulation (e.g., network rollback)
 * to avoid visual glitches in transient states.
 * @public
 */
export class RenderUpdateSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.isReSimulating) return;

    // Update procedural rotation for Render component
    const renderEntities = world.query("Render");
    const len = renderEntities.length;
    for (let i = 0; i < len; i++) {
        const entity = renderEntities[i];
        const render = world.getComponent(entity, "Render");
        if (!render) continue;

        const needsRot = render.angularVelocity !== undefined && render.angularVelocity !== 0;
        const needsFlash = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;

        if (needsRot || needsFlash) {
            // Safe for determinism/rollback. Fetching mutable component directly avoids per-tick callback closures while preserving stateVersion increments only on actual render mutations.
            const mutable = world.getMutableComponent(entity, "Render");
            if (mutable) {
                if (needsRot) {
                    mutable.rotation += mutable.angularVelocity! * deltaTime;
                }
                if (needsFlash) {
                    mutable.hitFlashFrames = mutable.hitFlashFrames! - 1;
                }
            }
        }
    }
  }
}
