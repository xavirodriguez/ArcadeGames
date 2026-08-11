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
    const runState = world.getResource<RunState>("RunState");
    if (!runState) return;

    const checkpoints = world.query("RespawnPoint");
    const players = world.query("PlatformerInput");

    for (let i = 0; i < checkpoints.length; i++) {
      const checkpointEntity = checkpoints[i];
      const checkpoint = world.getComponent(checkpointEntity, "RespawnPoint");
      if (!checkpoint) continue;

      // Skip if this is already the active checkpoint
      if (runState.activeCheckpoint === checkpoint.checkpointId) {
        continue;
      }

      let triggeredBy: Entity | null = null;

      // Check if player overlaps this checkpoint
      // 1. Check if checkpoint has CollisionEvents
      if (world.hasComponent(checkpointEntity, "CollisionEvents")) {
        const events = world.getComponent(checkpointEntity, "CollisionEvents")!;
        const overlaps = [...(events.activeTriggers ?? []), ...(events.collisions?.map(c => c.otherEntity) ?? [])];
        for (const other of overlaps) {
          if (players.includes(other)) {
            triggeredBy = other;
            break;
          }
        }
      }

      // 2. Check if players have CollisionEvents pointing to this checkpoint
      if (!triggeredBy) {
        for (let p = 0; p < players.length; p++) {
          const playerEntity = players[p];
          if (world.hasComponent(playerEntity, "CollisionEvents")) {
            const events = world.getComponent(playerEntity, "CollisionEvents")!;
            const overlaps = [...(events.activeTriggers ?? []), ...(events.collisions?.map(c => c.otherEntity) ?? [])];
            if (overlaps.includes(checkpointEntity)) {
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
          eventBus.emit("CheckpointActivated" as any, {
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
