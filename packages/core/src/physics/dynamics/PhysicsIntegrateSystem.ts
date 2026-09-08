import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { CoreComponentRegistry, TransformComponent, VelocityComponent } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";
import { SpatialCullingSystem } from "../../systems/SpatialCullingSystem";

/**
 * Physics dynamics system that integrates entity velocities and angular velocities into positions.
 *
 * @remarks
 * Uses Euler integration (`x_next = x + v * dt`) for spatial updates during `SystemPhase.Simulation`.
 * Supports candidate entity list filtering and viewport spatial culling to skip offscreen integration.
 * Respects the `IsPaused` world resource to freeze physical motion during pause states.
 *
 * Calls `world.getMutableComponent` on active entities to update transform positions while maintaining
 * deterministic clone-on-write state versioning.
 *
 * @public
 */
export class PhysicsIntegrateSystem<
  TRegistry extends ComponentRegistry & { Transform: TransformComponent; Velocity: VelocityComponent } = CoreComponentRegistry
> extends System<TRegistry> {
  private candidateEntities: Entity[] | null = null;

  /**
   * Sets explicit candidate entities for integration checks.
   *
   * @param entities - Filtered entity ID array, or `null` to evaluate spatial culling or integrate all world entities.
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

    const transformKey = "Transform" as Extract<keyof TRegistry, string>;
    const velocityKey = "Velocity" as Extract<keyof TRegistry, string>;

    if (candidatesList === null && world.getResource("SpatialCullingEnabled") === true) {
      const margin = world.getResource<number>("SpatialCullingMargin") ?? 100;
      const entities = world.query(transformKey, velocityKey);
      candidatesList = SpatialCullingSystem.filterInViewport(world, entities, margin);
    }

    const entitiesToProcess = candidatesList !== null ? candidatesList : world.query(transformKey, velocityKey);
    const len = entitiesToProcess.length;

    // Safe for determinism/rollback. Sequential indexed loop eliminates per-tick iterator allocations.
    for (let i = 0; i < len; i++) {
      const entity = entitiesToProcess[i];
      const v = world.getComponent(entity, velocityKey) as VelocityComponent | undefined;
      if (!v) continue;
      if (v.vx === 0 && v.vy === 0 && (!v.angularVelocity || v.angularVelocity === 0)) continue;

      const t = world.getComponent(entity, transformKey) as TransformComponent | undefined;
      if (!t) continue;

      // Safe for determinism/rollback because getMutableComponent triggers the same clone-on-frozen (dev) and stateVersion bump as mutateComponent but avoids per-tick callback allocation.
      const trans = world.getMutableComponent(entity, transformKey) as TransformComponent | undefined;
      if (trans) {
        trans.x += v.vx * deltaTime;
        trans.y += v.vy * deltaTime;
        if (v.angularVelocity) {
          trans.rotation += v.angularVelocity * deltaTime;
        }
        trans.dirty = true;
      }
    }
  }
}
