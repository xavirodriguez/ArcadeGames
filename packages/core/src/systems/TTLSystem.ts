import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { IEntityPool, CoreComponentRegistry } from "../ecs/CoreComponents";
import { EventRegistry } from "../events/EventBus";

/**
 * System responsible for managing the lifetime (Time To Live) of entities.
 *
 * @remarks
 * This system decrements the `TTL` component and schedules entities for removal
 * when their time expires. It can also emit events via the {@link EventBus}
 * and release entities back to designated object pools.
 *
 * Note: Entity removal is deferred through the {@link WorldCommandBuffer}.
 * @public
 */
export class TTLSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) {
      return;
    }
    const entities = world.query("TTL");
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const ttl = world.getMutableComponent(entity, "TTL");
      if (!ttl) continue;

      ttl.remaining -= deltaTime;
      const expired = ttl.remaining <= 0;

      if (expired) {
        const reclaimable = world.getComponent(entity, "Reclaimable");

        if (ttl.onCompleteEvent) {
          const bus = world.getEventBus();
          if (bus) {
            bus.emitDeferred(ttl.onCompleteEvent as string & keyof EventRegistry, { entity } as never);
          }
        }

        if (reclaimable) {
          if (typeof reclaimable.onReclaim === "function") {
            reclaimable.onReclaim({ world, entity });
          } else {
            const pool = world.getResource<IEntityPool>(reclaimable.poolId);
            if (pool && typeof pool.release === "function") {
              pool.release({ world, entity });
            } else {
              const message = `Reclaimable entity ${entity} references unregistered pool "${reclaimable.poolId}"`;
              if (process.env.NODE_ENV !== "production") {
                throw new Error(message);
              }
              console.warn(message);
            }
          }
        }

        world.getCommandBuffer().removeEntity(entity);
      }
    }
  }
}
