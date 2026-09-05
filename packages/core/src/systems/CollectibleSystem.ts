import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { findTriggeringPlayer } from "../physics/collision/collisionHelpers";
import { getGameplaySystemContext } from "./systemHelpers";

/**
 * System that manages collecting collectibles and managing persistent vs non-persistent states.
 * @public
 */
export class CollectibleSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const ctx = getGameplaySystemContext(world);
    if (!ctx) return;
    const { runState, eventBus } = ctx;

    // Query collectibles
    const collectibles = world.query("Collectible");
    const players = world.query("PlatformerInput");
    if (collectibles.length === 0 || players.length === 0) return;

    for (let i = 0; i < collectibles.length; i++) {
      const collEntity = collectibles[i];
      const collectible = world.getComponent(collEntity, "Collectible");
      if (!collectible) continue;

      // If already permanently collected, we should not collect it again
      if (runState && runState.collectedPermanentIds.includes(collectible.id)) {
        world.commands.removeEntity(collEntity);
        continue;
      }

      const collectedBy = findTriggeringPlayer(world, collEntity, players);

      if (collectedBy !== null) {
        // Collect!
        if (runState) {
          if (collectible.persistent) {
            if (!runState.collectedPermanentIds.includes(collectible.id)) {
              runState.collectedPermanentIds.push(collectible.id);
            }
          } else {
            if (!runState.collectedTemporalIds.includes(collectible.id)) {
              runState.collectedTemporalIds.push(collectible.id);
            }
          }
        }

        if (eventBus) {
          eventBus.emitDeferred("CollectiblePickedUp", {
            collectibleEntity: collEntity,
            collectible,
            playerEntity: collectedBy
          });
        }

        world.commands.removeEntity(collEntity);
      }
    }
  }
}
