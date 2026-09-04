import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry, RunState } from "../ecs/CoreComponents";
import { Entity } from "../ecs/Entity";
import { findMatchingEntityInTriggersOrCollisions } from "../physics/collision/collisionHelpers";

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
    const isPlayer = (other: Entity) => singlePlayer !== null ? other === singlePlayer : players.indexOf(other) !== -1;

    for (let i = 0; i < checkpoints.length; i++) {
      const checkpointEntity = checkpoints[i];
      const checkpoint = world.getComponent(checkpointEntity, "RespawnPoint");
      if (!checkpoint) continue;

      // Skip if this is already the active checkpoint
      if (runState.activeCheckpoint === checkpoint.checkpointId) {
        continue;
      }

      // 1. Check if checkpoint has CollisionEvents pointing to a player
      let triggeredBy = findMatchingEntityInTriggersOrCollisions(world, checkpointEntity, isPlayer);

      // 2. Check if players have CollisionEvents pointing to this checkpoint
      if (!triggeredBy) {
        for (let p = 0; p < players.length; p++) {
          const playerEntity = players[p];
          const found = findMatchingEntityInTriggersOrCollisions(world, playerEntity, (other) => other === checkpointEntity);
          if (found !== null) {
            triggeredBy = playerEntity;
            break;
          }
        }
      }

      if (triggeredBy !== null) {
        // Activate checkpoint
        runState.activeCheckpoint = checkpoint.checkpointId;

        const eventBus = world.getEventBus();
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
