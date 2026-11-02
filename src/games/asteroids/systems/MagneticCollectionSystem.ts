import { System, World, TransformComponent, VelocityComponent } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { MagneticCollectorComponent, CollectibleResourceComponent } from "../types/EconomyTypes";

/**
 * System that applies deterministic physical magnetic attraction forces
 * from magnetic collector entities (e.g. player ship) to nearby collectible resources.
 *
 * Requirements:
 * - Deterministic physical movement rather than instant teleportation.
 * - Dynamic falloff / progressive pull force.
 * - Safe for rollback / resimulation.
 * @public
 */
export class MagneticCollectionSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    if (deltaTime <= 0) return;

    const collectors = world.query("MagneticCollector", "Transform");
    if (collectors.length === 0) return;

    const resources = world.query("CollectibleResource", "Transform", "Velocity");
    if (resources.length === 0) return;

    const numCollectors = collectors.length;
    const numResources = resources.length;

    for (let i = 0; i < numCollectors; i++) {
      const collectorEntity = collectors[i];
      const collector = world.getComponent(collectorEntity, "MagneticCollector") as MagneticCollectorComponent | undefined;
      const collectorTrans = world.getComponent(collectorEntity, "Transform") as TransformComponent | undefined;

      if (!collector || collector.mode === "off" || !collectorTrans) continue;

      const effectiveRadius = collector.mode === "overcharged"
        ? collector.baseRadius * collector.overchargeRadiusMultiplier
        : collector.baseRadius;
      const radiusSq = effectiveRadius * effectiveRadius;
      const pullForce = collector.pullForce;

      for (let j = 0; j < numResources; j++) {
        const resourceEntity = resources[j];
        const resourceComp = world.getComponent(resourceEntity, "CollectibleResource") as CollectibleResourceComponent | undefined;
        if (!resourceComp || resourceComp.isCollected) continue;

        const resTrans = world.getComponent(resourceEntity, "Transform") as TransformComponent | undefined;
        if (!resTrans) continue;

        const dx = collectorTrans.x - resTrans.x;
        const dy = collectorTrans.y - resTrans.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= radiusSq && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          // Normalized direction vector towards collector
          const nx = dx / dist;
          const ny = dy / dist;

          // Progressive pull force inversely proportional to distance
          const force = pullForce * (1 - dist / effectiveRadius);
          const mutVel = world.getMutableComponent(resourceEntity, "Velocity") as VelocityComponent | undefined;
          if (mutVel) {
            mutVel.vx += nx * force * deltaTime;
            mutVel.vy += ny * force * deltaTime;
          }
        }
      }
    }
  }
}
