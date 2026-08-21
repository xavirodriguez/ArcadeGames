import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";
import { SpatialCullingSystem } from "../../systems/SpatialCullingSystem";

/**
 * Physics dynamics system that integrates entity velocities and angular velocities into positions.
 *
 * @remarks
 * Uses Euler integration (x_next = x + v * dt) for spatial updates.
 * Supports candidate entity list filtering and viewport spatial culling to skip offscreen integration.
 * Respects the `IsPaused` world resource to freeze physical motion during pause states.
 *
 * @public
 */
export class PhysicsIntegrateSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  private candidateEntities: Entity[] | null = null;

  /**
   * Sets candidate entities for integration checks.
   *
   * @param entities - Filtered entity array, or `null` to integrate all matching entities in the world.
   */
  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

  /**
   * Integrates velocity into position for all active physical entities.
   *
   * @param world - Simulation world.
   * @param deltaTime - Elapsed tick step time in seconds.
   *
   * @sideEffect Mutates `Transform` components on integrated entities.
   */
  public update(world: World<TRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) {
      return;
    }
    const resourceCandidates = world.getResource<Entity[]>("SpatialCullingCandidates");
    let candidatesList = this.candidateEntities !== null ? this.candidateEntities : (resourceCandidates !== undefined ? resourceCandidates : null);

    const transformType = "Transform" as Extract<keyof TRegistry, string>;
    const velocityType = "Velocity" as Extract<keyof TRegistry, string>;

    if (candidatesList === null && world.getResource("SpatialCullingEnabled") === true) {
      const margin = world.getResource<number>("SpatialCullingMargin") ?? 100;
      const entities = world.query(transformType, velocityType);
      candidatesList = SpatialCullingSystem.filterInViewport(world as any, entities, margin);
    }

    if (candidatesList !== null) {
      for (const entity of candidatesList) {
        const v = world.getComponent(entity, velocityType) as any;
        if (!v) continue;
        const t = world.getComponent(entity, transformType) as any;
        if (!t) continue;

        // Safe for determinism/rollback because getMutableComponent triggers the same clone-on-frozen (dev) and stateVersion bump as mutateComponent but avoids per-tick callback allocation.
        const trans = world.getMutableComponent(entity, transformType) as any;
        if (trans) {
          trans.x += v.vx * deltaTime;
          trans.y += v.vy * deltaTime;
          if (v.angularVelocity) {
            trans.rotation += v.angularVelocity * deltaTime;
          }
          trans.dirty = true;
        }
      }
    } else {
      const entities = world.query(transformType, velocityType);
      for (const entity of entities) {
        const v = world.getComponent(entity, velocityType) as any;
        if (!v) continue;

        // Safe for determinism/rollback because getMutableComponent triggers the same clone-on-frozen (dev) and stateVersion bump as mutateComponent but avoids per-tick callback allocation.
        const t = world.getMutableComponent(entity, transformType) as any;
        if (t) {
          t.x += v.vx * deltaTime;
          t.y += v.vy * deltaTime;
          if (v.angularVelocity) {
            t.rotation += v.angularVelocity * deltaTime;
          }
          t.dirty = true;
        }
      }
    }
  }
}
