import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { findTriggeringPlayer } from "../physics/collision/collisionHelpers";
import { getGameplaySystemContextAndEntities } from "./systemHelpers";

/**
 * System that manages collecting collectibles and managing persistent vs non-persistent states.
 * @public
 */
export class CollectibleSystem extends System<CoreComponentRegistry> {
  /**
   * Detects player trigger overlaps with collectible entities, updates run state history, and schedules entity removal.
   *
   * @param world - The ECS world containing active entities.
   * @param _deltaTime - Elapsed frame duration in seconds (unused).
   */
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const ctx = getGameplaySystemContextAndEntities(world, "Collectible");
    if (!ctx) return;
    const { runState, eventBus, entities: collectibles } = ctx;

    const players = world.query("PlatformerInput");
    if (collectibles.length === 0 || players.length === 0) return;

    for (let i = 0; i < collectibles.length; i++) {
      const collEntity = collectibles[i];
      const collectible = world.getComponent(collEntity, "Collectible");
      if (!collectible) continue;

      // Never respawn a permanently collected item. A temporal item marked
      // collectOnce is also suppressed after its first pickup in the current run.
      const alreadyCollectedPermanently =
        runState?.collectedPermanentIds.includes(collectible.id) ?? false;
      const alreadyCollectedOnceThisRun =
        collectible.collectOnce &&
        !collectible.persistent &&
        (runState?.collectedTemporalIds.includes(collectible.id) ?? false);

      if (alreadyCollectedPermanently || alreadyCollectedOnceThisRun) {
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
            collectibleType: collectible.kind,
            value: collectible.value,
            playerEntity: collectedBy
          });
        }

        world.commands.removeEntity(collEntity);
      }
    }
  }
}
