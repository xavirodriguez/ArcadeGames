import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry, RunState } from "../ecs/CoreComponents";
import { Entity } from "../ecs/Entity";
import { findMatchingEntityInTriggersOrCollisions } from "../physics/collision/collisionHelpers";

/**
 * System that manages collecting collectibles and managing persistent vs non-persistent states.
 * @public
 */
// TODO(refactor): código duplicado detectado (bloque) con systems/DeathSystem.ts:10-16. Considerar extraer a función compartida. Ref: 63111e4a
export class CollectibleSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const runState = world.getResource<RunState>("RunState");
    const eventBus = world.getEventBus();

    // Query collectibles
    const collectibles = world.query("Collectible");
    const players = world.query("PlatformerInput");
    if (collectibles.length === 0 || players.length === 0) return;

    // Fast player entity lookup: single player fast-path or direct index check
    const singlePlayer = players.length === 1 ? players[0] : null;
    const isPlayer = (other: Entity) => singlePlayer !== null ? other === singlePlayer : players.indexOf(other) !== -1;

    for (let i = 0; i < collectibles.length; i++) {
      const collEntity = collectibles[i];
      const collectible = world.getComponent(collEntity, "Collectible");
      if (!collectible) continue;

      // If already permanently collected, we should not collect it again
      if (runState && runState.collectedPermanentIds.includes(collectible.id)) {
        world.commands.removeEntity(collEntity);
        continue;
      }

      // 1. Check if collectible has CollisionEvents pointing to a player
      let collectedBy = findMatchingEntityInTriggersOrCollisions(world, collEntity, isPlayer);

      // 2. Check if players have CollisionEvents pointing to this collectible
      if (!collectedBy) {
        for (let p = 0; p < players.length; p++) {
          const playerEntity = players[p];
          const found = findMatchingEntityInTriggersOrCollisions(world, playerEntity, (other) => other === collEntity);
          if (found !== null) {
            collectedBy = playerEntity;
            break;
          }
        }
      }

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
