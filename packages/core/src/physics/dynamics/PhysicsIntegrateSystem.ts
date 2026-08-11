import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";
import { SpatialCullingSystem } from "../../systems/SpatialCullingSystem";

/**
 * System that integrates forces and velocities.
 * @public
 */
export class PhysicsIntegrateSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  private candidateEntities: Entity[] | null = null;

  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

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
      candidatesList = SpatialCullingSystem.filterInViewport(world as any, [...entities], margin);
    }

    if (candidatesList !== null) {
      for (const entity of candidatesList) {
        const v = world.getComponent(entity, velocityType) as any;
        if (!v) continue;
        const t = world.getComponent(entity, transformType) as any;
        if (!t) continue;

        world.mutateComponent(entity, transformType, (trans: any) => {
          trans.x += v.vx * deltaTime;
          trans.y += v.vy * deltaTime;
          if (v.angularVelocity) {
            trans.rotation += v.angularVelocity * deltaTime;
          }
          trans.dirty = true;
        });
      }
    } else {
      const entities = world.query(transformType, velocityType);
      for (const entity of entities) {
        const v = world.getComponent(entity, velocityType) as any;
        if (!v) continue;
        world.mutateComponent(entity, transformType, (t: any) => {
          t.x += v.vx * deltaTime;
          t.y += v.vy * deltaTime;
          if (v.angularVelocity) {
            t.rotation += v.angularVelocity * deltaTime;
          }
          t.dirty = true;
        });
      }
    }
  }
}
