import { System, World, TransformComponent } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { CollectibleResourceComponent, PlayerInventoryComponent } from "../types/EconomyTypes";

/**
 * System that manages lifetime decay of physical collectible resources
 * and processes pickup contact / collection events with player entities.
 *
 * Requirements:
 * - Collectible resource collected exactly once.
 * - Lifetime tracked in deterministic simulation ticks.
 * - Collected resource increments PlayerInventory according to resourceType.
 * - Emits "resource:collected" domain event.
 * @public
 */
export class ResourceCollectionSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const resources = world.query("CollectibleResource", "Transform");
    const collectors = world.query("PlayerInventory", "Transform");

    const numResources = resources.length;
    const numCollectors = collectors.length;

    for (let i = 0; i < numResources; i++) {
      const resEntity = resources[i];
      const resComp = world.getComponent(resEntity, "CollectibleResource") as CollectibleResourceComponent | undefined;
      const resTrans = world.getComponent(resEntity, "Transform") as TransformComponent | undefined;

      if (!resComp || resComp.isCollected || !resTrans) continue;

      // 1. Tick deterministic lifetime via getMutableComponent
      const mutRes = world.getMutableComponent(resEntity, "CollectibleResource") as CollectibleResourceComponent | undefined;
      if (mutRes) {
        mutRes.lifetimeTicks -= 1;
        if (mutRes.lifetimeTicks <= 0) {
          world.getCommandBuffer().removeEntity(resEntity);
          continue;
        }
      }

      const collectionRadiusSq = resComp.collectionRadius * resComp.collectionRadius;

      // 2. Check pickup contact with collectors
      let collected = false;
      for (let j = 0; j < numCollectors; j++) {
        const collectorEntity = collectors[j];
        const collectorTrans = world.getComponent(collectorEntity, "Transform") as TransformComponent | undefined;
        if (!collectorTrans) continue;

        const dx = collectorTrans.x - resTrans.x;
        const dy = collectorTrans.y - resTrans.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= collectionRadiusSq) {
          // Collect!
          if (mutRes) {
            mutRes.isCollected = true;
          }
          collected = true;

          const inv = world.getMutableComponent(collectorEntity, "PlayerInventory") as PlayerInventoryComponent | undefined;
          if (inv) {
            if (resComp.resourceType === "energy") {
              inv.energy = Math.min(inv.maxEnergy, inv.energy + resComp.amount);
            } else if (resComp.resourceType === "minerals") {
              inv.minerals += resComp.amount;
            } else if (resComp.resourceType === "components") {
              inv.components += resComp.amount;
            }
          }

          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emitDeferred("PlaySFX", { name: "pickup_generic", volume: 0.8 });
            eventBus.emitDeferred("resource:collected", {
              collectorEntity,
              resourceType: resComp.resourceType,
              amount: resComp.amount
            });
          }

          world.getCommandBuffer().removeEntity(resEntity);
          break;
        }
      }

      if (collected) continue;
    }
  }
}
