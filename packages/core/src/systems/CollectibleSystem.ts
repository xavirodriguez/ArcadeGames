import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry, RunState } from "../ecs/CoreComponents";
import { Entity } from "../ecs/Entity";

/**
 * System that manages collecting collectibles and managing persistent vs non-persistent states.
 * @public
 */
export class CollectibleSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const runState = world.getResource<RunState>("RunState");
    const eventBus = world.getEventBus();

    // Query collectibles
    const collectibles = world.query("Collectible");
    const players = world.query("PlatformerInput");

    for (let i = 0; i < collectibles.length; i++) {
      const collEntity = collectibles[i];
      const collectible = world.getComponent(collEntity, "Collectible");
      if (!collectible) continue;

      // If already permanently collected, we should not collect it again
      if (runState && runState.collectedPermanentIds.includes(collectible.id)) {
        world.commands.removeEntity(collEntity);
        continue;
      }

      let collectedBy: Entity | null = null;

      // Safe for determinism/rollback. Sequential indexed loops replace array spreading/mapping [...activeTriggers, ...collisions.map()], eliminating per-tick heap allocations while evaluating identical overlap conditions.
      // 1. Check if collectible has CollisionEvents
      if (world.hasComponent(collEntity, "CollisionEvents")) {
        const events = world.getComponent(collEntity, "CollisionEvents")!;
        if (events.activeTriggers) {
          for (let j = 0; j < events.activeTriggers.length; j++) {
            const other = events.activeTriggers[j];
            if (players.includes(other)) {
              collectedBy = other;
              break;
            }
          }
        }
        if (!collectedBy && events.collisions) {
          for (let j = 0; j < events.collisions.length; j++) {
            const other = events.collisions[j].otherEntity;
            if (players.includes(other)) {
              collectedBy = other;
              break;
            }
          }
        }
      }

      // 2. Check if players have CollisionEvents pointing to this collectible
      if (!collectedBy) {
        for (let p = 0; p < players.length; p++) {
          const playerEntity = players[p];
          if (world.hasComponent(playerEntity, "CollisionEvents")) {
            const events = world.getComponent(playerEntity, "CollisionEvents")!;
            let found = false;
            if (events.activeTriggers) {
              for (let j = 0; j < events.activeTriggers.length; j++) {
                if (events.activeTriggers[j] === collEntity) {
                  found = true;
                  break;
                }
              }
            }
            if (!found && events.collisions) {
              for (let j = 0; j < events.collisions.length; j++) {
                if (events.collisions[j].otherEntity === collEntity) {
                  found = true;
                  break;
                }
              }
            }
            if (found) {
              collectedBy = playerEntity;
              break;
            }
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
          eventBus.emit("CollectiblePickedUp", {
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
