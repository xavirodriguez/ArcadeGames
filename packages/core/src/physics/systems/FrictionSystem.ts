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
    if (world.getResource("IsPaused") === true) return;
    const resourceCandidates = world.getResource<Entity[]>("SpatialCullingCandidates");
    const candidates = this.candidateEntities ?? resourceCandidates ?? null;
    const entities = candidates ?? world.query("Velocity", "Friction");

    const len = entities.length;
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const f = world.getComponent(entity, "Friction");
      if (!f) continue;
      const v = world.getComponent(entity, "Velocity");
      if (!v) continue;

      if (v.vx === 0 && v.vy === 0 && (!v.angularVelocity || v.angularVelocity === 0)) {
        continue;
      }

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
  }
}
