import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

import { Entity } from "../../ecs/Entity";

/**
 * System applying exponential velocity damping/friction to entities over time.
 *
 * @remarks
 * Applies exponential decay factor based on friction coefficient and deltaTime to linear and angular velocities.
 * Guarantees frame-rate independent deceleration under fixed timestep execution.
 *
 * @public
 */
export class FrictionSystem extends System<CoreComponentRegistry> {
  private candidateEntities: Entity[] | null = null;

  /**
   * Sets candidate entity list for friction processing.
   *
   * @param entities - Entity ID list or `null` to process all matching world entities.
   */
  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

  /**
   * Applies velocity deceleration based on entity `Friction` components.
   *
   * @param world - Simulation world instance.
   * @param deltaTime - Elapsed frame duration in seconds.
   *
   * @sideEffect Mutates `Velocity` components on active entities.
   */
  update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const resourceCandidates = world.getResource<Entity[]>("SpatialCullingCandidates");
    const candidatesList = this.candidateEntities !== null ? this.candidateEntities : (resourceCandidates !== undefined ? resourceCandidates : null);

    if (candidatesList !== null) {
      for (const entity of candidatesList) {
        const f = world.getComponent(entity, "Friction");
        if (!f) continue;
        const v = world.getComponent(entity, "Velocity");
        if (!v) continue;

        // Safe for determinism/rollback because getMutableComponent triggers the same clone-on-frozen (dev) and stateVersion bump as mutateComponent but avoids per-tick callback allocation.
        const vel = world.getMutableComponent(entity, "Velocity");
        if (vel) {
          const factor = Math.exp(-f.value * deltaTime);
          vel.vx *= factor;
          vel.vy *= factor;
          if (vel.angularVelocity) {
            vel.angularVelocity *= factor;
          }
        }
      }
    } else {
      const entities = world.query("Velocity", "Friction");
      for (const entity of entities) {
        const f = world.getComponent(entity, "Friction")!;

        // Safe for determinism/rollback because getMutableComponent triggers the same clone-on-frozen (dev) and stateVersion bump as mutateComponent but avoids per-tick callback allocation.
        const v = world.getMutableComponent(entity, "Velocity");
        if (v) {
          const factor = Math.exp(-f.value * deltaTime);
          v.vx *= factor;
          v.vy *= factor;
          if (v.angularVelocity) {
            v.angularVelocity *= factor;
          }
        }
      }
    }
  }
}
