import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { findTriggeringPlayer } from "../physics/collision/collisionHelpers";
import { getGameplaySystemContext } from "./systemHelpers";

/**
 * System that manages activating checkpoints as players overlap RespawnPoints.
 * @public
 */
export class CheckpointSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const ctx = getGameplaySystemContext(world);
    if (!ctx) return;
    const { runState, eventBus } = ctx;
    if (!runState) return;

    const checkpoints = world.query("RespawnPoint");
    const players = world.query("PlatformerInput");
    if (checkpoints.length === 0 || players.length === 0) return;

    for (let i = 0; i < checkpoints.length; i++) {
      const checkpointEntity = checkpoints[i];
      const checkpoint = world.getComponent(checkpointEntity, "RespawnPoint");
      if (!checkpoint) continue;

      // Skip if this is already the active checkpoint
      if (runState.activeCheckpoint === checkpoint.checkpointId) {
        continue;
      }

      const triggeredBy = findTriggeringPlayer(world, checkpointEntity, players);

      if (triggeredBy !== null) {
        // Activate checkpoint
        runState.activeCheckpoint = checkpoint.checkpointId;

        if (eventBus) {
          eventBus.emitDeferred("CheckpointActivated", {
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
