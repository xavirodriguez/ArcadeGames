import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry, RunState, RespawnableComponent } from "../ecs/CoreComponents";
import { Entity } from "../ecs/Entity";

/**
 * System that manages player respawning deterministically.
 * It resets the player's position to the active checkpoint, restores player state,
 * and recreates all Respawnable entities (enemies, non-persistent collectibles) from blueprints.
 * @public
 */
export class RespawnSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const runState = world.getResource<RunState>("RunState");
    const deadPlayers = world.query("PlatformerInput", "Transform", "Dead");

    if (deadPlayers.length === 0) return;

    // Process respawn for each dead player
    for (let i = 0; i < deadPlayers.length; i++) {
      const playerEntity = deadPlayers[i];

      // 1. Determine respawn coordinates
      let respawnX = 100;
      let respawnY = 100;

      const playerStart = world.getResource<{ x: number; y: number }>("PlayerStartPoint");
      if (playerStart) {
        respawnX = playerStart.x;
        respawnY = playerStart.y;
      }

      // Safe for determinism/rollback. Executing query("RespawnPoint") only when activeCheckpoint is present gates redundant query work when no active checkpoint exists.
      if (runState?.activeCheckpoint) {
        const checkpoints = world.query("RespawnPoint");
        for (let j = 0; j < checkpoints.length; j++) {
          const cpEnt = checkpoints[j];
          const cp = world.getComponent(cpEnt, "RespawnPoint");
          if (cp && cp.checkpointId === runState.activeCheckpoint) {
            respawnX = cp.x;
            respawnY = cp.y;
            break;
          }
        }
      }

      // 2. Rebuild the segment state deterministically
      const respawnables = world.query("Respawnable");

      // Extract details before removing them
      const itemsToRespawn: { blueprintKey: string; initialArgs: any }[] = [];
      for (let j = 0; j < respawnables.length; j++) {
        const respEntity = respawnables[j];
        const respComp = world.getComponent(respEntity, "Respawnable")!;

        // Check if this is a collectible and has already been permanently collected
        let skip = false;
        const args = respComp.initialArgs;
        if (args && typeof args === "object" && "id" in args) {
          const collectibleId = String(args.id);
          if (runState && runState.collectedPermanentIds.includes(collectibleId)) {
            skip = true;
          }
        }

        if (!skip) {
          itemsToRespawn.push({
            blueprintKey: respComp.blueprintKey,
            initialArgs: respComp.initialArgs
          });
        }

        world.commands.removeEntity(respEntity);
      }

      // Re-spawn them fresh
      for (const item of itemsToRespawn) {
        const newEntity = world.reserveEntityId();
        world.commands.createEntity(newEntity);
        world.commands.spawnFromBlueprintForEntity(newEntity, item.blueprintKey as any, item.initialArgs);
        world.commands.addComponent(newEntity, {
          type: "Respawnable",
          blueprintKey: item.blueprintKey,
          initialArgs: item.initialArgs
        });
      }

      // 3. Reset player status
      world.mutateComponent(playerEntity, "Transform", (trans) => {
        trans.x = respawnX;
        trans.y = respawnY;
        trans.worldX = respawnX;
        trans.worldY = respawnY;
      });

      if (world.hasComponent(playerEntity, "Velocity")) {
        world.mutateComponent(playerEntity, "Velocity", (vel) => {
          vel.vx = 0;
          vel.vy = 0;
        });
      }

      if (world.hasComponent(playerEntity, "Health")) {
        world.mutateComponent(playerEntity, "Health", (health) => {
          health.current = health.max;
        });
      }

      // Clear the Dead component/tag
      world.commands.removeComponent(playerEntity, "Dead");

      // Clear temporal collected list since we died
      if (runState) {
        runState.collectedTemporalIds = [];
      }

      // Dispatch event
      const eventBus = world.getEventBus();
      if (eventBus) {
        eventBus.emit("PlayerRespawned", {
          playerEntity,
          x: respawnX,
          y: respawnY
        });
      }
    }
  }
}
