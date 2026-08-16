import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry, RunState } from "../ecs/CoreComponents";

/**
 * System that monitors player health and position to detect death.
 * It marks the player as Dead, updates the RunState, and dispatches the "PlayerDied" event.
 * @public
 */
export class DeathSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const runState = world.getResource<RunState>("RunState");
    const eventBus = world.getEventBus();

    const players = world.query("PlatformerInput", "Transform");
    const deathPlaneY = world.getResource<number>("DeathPlaneY") ?? 1000;

    for (let i = 0; i < players.length; i++) {
      const playerEntity = players[i];

      // If already marked as Dead component, skip
      if (world.hasComponent(playerEntity, "Dead")) {
        continue;
      }

      let isDead = false;

      // 1. Check health
      if (world.hasComponent(playerEntity, "Health")) {
        const health = world.getComponent(playerEntity, "Health")!;
        if (health.current <= 0) {
          isDead = true;
        }
      }

      // 2. Check death plane
      if (!isDead) {
        const trans = world.getComponent(playerEntity, "Transform")!;
        if (trans.y >= deathPlaneY) {
          isDead = true;
        }
      }

      if (isDead) {
        // Mark as dead (add Dead component)
        world.commands.addComponent(playerEntity, {
          type: "Dead"
        });

        // Update RunState
        if (runState) {
          runState.deaths++;
          runState.lives--;
          runState.attempt++;
        }

        // Emit PlayerDied event
        if (eventBus) {
          eventBus.emit("PlayerDied", {
            playerEntity
          });
        }
      }
    }
  }
}
