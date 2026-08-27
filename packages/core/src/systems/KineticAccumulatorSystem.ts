import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { KineticAccumulatorComponent } from "../components/KineticAccumulatorComponent";
import { TransformComponent, VelocityComponent } from "../ecs/CoreComponents";
import { FactionComponent } from "../ai/FactionComponent";

/**
 * System that manages kinetic energy accumulation for entities with `KineticAccumulatorComponent`.
 * Accumulates energy based on movement speed and near-miss / graze events against hostile entities.
 *
 * @public
 * @remarks
 * Pauses execution when `IsPaused` resource is set to `true`.
 * Fires `"kinetic:burst"` events via EventBus when burst is activated.
 */
export class KineticAccumulatorSystem extends System<CoreComponentRegistry> {
  // Pre-allocated array to track active grazes per accumulator without hot loop allocations
  private _grazedEntities: Set<string> = new Set();

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const accumulators = world.query("KineticAccumulator", "Transform", "Velocity");
    const hostiles = world.query("Faction", "Transform");
    const accLen = accumulators.length;
    const hostLen = hostiles.length;

    for (let i = 0; i < accLen; i++) {
      const entity = accumulators[i];
      const transform = world.getComponent(entity, "Transform") as TransformComponent | undefined;
      const velocity = world.getComponent(entity, "Velocity") as VelocityComponent | undefined;
      const faction = world.getComponent(entity, "Faction") as FactionComponent | undefined;
      if (!transform || !velocity) continue;

      const acc = world.getMutableComponent(entity, "KineticAccumulator");
      if (!acc) continue;

      // If burst is requested by input or state trigger while ready, trigger burst shockwave
      if (acc.isBurstReady && acc.isBurstActive) {
        acc.storedEnergy = 0;
        acc.isBurstReady = false;
        acc.isBurstActive = false;
        world.getEventBus().emit("kinetic:burst" as never, {
          entity,
          x: transform.x,
          y: transform.y,
          radius: acc.burstRadius,
        });
      } else if (acc.isBurstActive) {
        // Reset unfulfilled burst request
        acc.isBurstActive = false;
      }

      // 1. Accumulate energy from movement speed
      const speedSq = velocity.vx * velocity.vx + velocity.vy * velocity.vy;
      if (speedSq > 0.01 && acc.storedEnergy < acc.maxEnergy) {
        const speed = Math.sqrt(speedSq);
        // Normalize against base speed factor of 100px/s
        const normalizedSpeed = speed / 100;
        acc.storedEnergy = Math.min(acc.maxEnergy, acc.storedEnergy + acc.chargeOnMoveRate * normalizedSpeed * deltaTime);
      }

      // 2. Graze / Near-Miss detection against hostile targets
      if (hostLen > 0 && acc.grazeRadius > 0 && acc.storedEnergy < acc.maxEnergy) {
        const entityFaction = faction?.value ?? "player";
        const grazeRadiusSq = acc.grazeRadius * acc.grazeRadius;

        for (let j = 0; j < hostLen; j++) {
          const hostileEntity = hostiles[j];
          if (hostileEntity === entity) continue;

          const hostFaction = world.getComponent(hostileEntity, "Faction") as FactionComponent | undefined;
          // Graze only against opposing factions
          if (hostFaction && hostFaction.value === entityFaction) continue;

          const hostTransform = world.getComponent(hostileEntity, "Transform") as TransformComponent | undefined;
          if (!hostTransform) continue;

          const dx = hostTransform.x - transform.x;
          const dy = hostTransform.y - transform.y;
          const distSq = dx * dx + dy * dy;

          if (distSq <= grazeRadiusSq) {
            const grazeKey = `${entity}:${hostileEntity}`;
            if (!this._grazedEntities.has(grazeKey)) {
              this._grazedEntities.add(grazeKey);
              acc.storedEnergy = Math.min(acc.maxEnergy, acc.storedEnergy + acc.grazeChargeAmount);
              world.getEventBus().emit("kinetic:graze" as never, {
                entity,
                hostileEntity,
                x: transform.x,
                y: transform.y,
              });
            }
          }
        }
      }

      // Update burst readiness state
      acc.isBurstReady = acc.storedEnergy >= acc.maxEnergy;
    }
  }

  /**
   * Clears historical graze tracking cache.
   * Useful when transitioning scenes or waves.
   */
  public clearGrazeCache(): void {
    this._grazedEntities.clear();
  }
}
