import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

/**
 * System that applies friction to entity velocity.
 *
 * @remarks
 * This system reduces velocity based on a friction factor and deltaTime.
 * It is intended for use with a fixed timestep to ensure consistent deceleration
 * across different frame rates.
 */
import { Entity } from "../../ecs/Entity";

/** @public */
export class FrictionSystem extends System<CoreComponentRegistry> {
  private candidateEntities: Entity[] | null = null;

  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

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
