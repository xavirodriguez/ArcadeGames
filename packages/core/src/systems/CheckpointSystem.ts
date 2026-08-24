import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry, RunState } from "../ecs/CoreComponents";
import { Entity } from "../ecs/Entity";

/**
 * System that manages activating checkpoints as players overlap RespawnPoints.
 * @public
 */
export class CheckpointSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const runState = world.getResource<RunState>("RunState");
    if (!runState) return;

    const checkpoints = world.query("RespawnPoint");
    const players = world.query("PlatformerInput");
    if (checkpoints.length === 0 || players.length === 0) return;

    // Fast player entity lookup: single player fast-path or direct index check
    const singlePlayer = players.length === 1 ? players[0] : null;

    for (let i = 0; i < checkpoints.length; i++) {
      const checkpointEntity = checkpoints[i];
      const checkpoint = world.getComponent(checkpointEntity, "RespawnPoint");
      if (!checkpoint) continue;

      // Skip if this is already the active checkpoint
      if (runState.activeCheckpoint === checkpoint.checkpointId) {
        continue;
      }

      let triggeredBy: Entity | null = null;

      // Safe for determinism/rollback. Single player fast-path or indexed matching avoids repeated linear scans (players.includes), achieving O(1) entity overlap lookup per trigger.
      // 1. Check if checkpoint has CollisionEvents
      if (world.hasComponent(checkpointEntity, "CollisionEvents")) {
        const events = world.getComponent(checkpointEntity, "CollisionEvents")!;
        if (events.activeTriggers) {
          for (let j = 0; j < events.activeTriggers.length; j++) {
            const other = events.activeTriggers[j];
            if (singlePlayer !== null ? other === singlePlayer : players.indexOf(other) !== -1) {
              triggeredBy = other;
              break;
            }
          }
        }
        if (!triggeredBy && events.collisions) {
          for (let j = 0; j < events.collisions.length; j++) {
            const other = events.collisions[j].otherEntity;
            if (singlePlayer !== null ? other === singlePlayer : players.indexOf(other) !== -1) {
              triggeredBy = other;
              break;
            }
          }
        }
      }

      // 2. Check if players have CollisionEvents pointing to this checkpoint
      if (!triggeredBy) {
        for (let p = 0; p < players.length; p++) {
          const playerEntity = players[p];
          if (world.hasComponent(playerEntity, "CollisionEvents")) {
            const events = world.getComponent(playerEntity, "CollisionEvents")!;
            let found = false;
            if (events.activeTriggers) {
              for (let j = 0; j < events.activeTriggers.length; j++) {
                if (events.activeTriggers[j] === checkpointEntity) {
                  found = true;
                  break;
                }
              }
            }
            if (!found && events.collisions) {
              for (let j = 0; j < events.collisions.length; j++) {
                if (events.collisions[j].otherEntity === checkpointEntity) {
                  found = true;
                  break;
                }
              }
            }
            if (found) {
              triggeredBy = playerEntity;
              break;
            }
          }
        }
      }

      if (triggeredBy !== null) {
        // Activate checkpoint
        runState.activeCheckpoint = checkpoint.checkpointId;

        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emit("CheckpointActivated", {
            checkpointEntity,
            checkpointId: checkpoint.checkpointId,
            playerEntity: triggeredBy,
            x: checkpoint.x,
            y: checkpoint.y
          });
        }
      }
    }
  }
}
