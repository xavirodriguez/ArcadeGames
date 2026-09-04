import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { CoreComponentRegistry, TransformComponent } from "../ecs/CoreComponents";

/**
 * System that detects triggers between Hitboxes and Hurtboxes, filtering multiple hits.
 * @public
 */
export class HitDetectionSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const hitboxes = world.query("CollisionEvents", "Hitbox");
    const len = hitboxes.length;
    if (len === 0) return;

    for (let i = 0; i < len; i++) {
      const hitboxEntity = hitboxes[i];
      const hitbox = world.getComponent(hitboxEntity, "Hitbox")!;
      const events = world.getComponent(hitboxEntity, "CollisionEvents")!;

      const activeTriggers = events.activeTriggers;
      const collisions = events.collisions;

      let activeHurtboxCount = 0;

      if (activeTriggers) {
        const trigLen = activeTriggers.length;
        for (let j = 0; j < trigLen; j++) {
          if (this.processHitOverlap(world, hitboxEntity, activeTriggers[j])) {
            activeHurtboxCount++;
          }
        }
      }

      if (collisions) {
        const colLen = collisions.length;
        for (let j = 0; j < colLen; j++) {
          if (this.processHitOverlap(world, hitboxEntity, collisions[j].otherEntity)) {
            activeHurtboxCount++;
          }
        }
      }

      const currentHitEntities = world.getComponent(hitboxEntity, "Hitbox")?.hitEntities;
      if (activeHurtboxCount === 0 && currentHitEntities && currentHitEntities.length > 0) {
        // Safe for determinism/rollback. Fetch mutable Hitbox component directly without closure allocation to reset hitEntities list.
        const hb = world.getMutableComponent(hitboxEntity, "Hitbox");
        if (hb) {
          hb.hitEntities = [];
        }
      }
    }
  }

  private processHitOverlap(
    world: World<CoreComponentRegistry>,
    hitboxEntity: number,
    otherEntity: number
  ): boolean {
    if (!world.hasEntity(otherEntity)) return false;

    if (world.hasComponent(otherEntity, "Hurtbox")) {
      const currentHitEntities = world.getComponent(hitboxEntity, "Hitbox")?.hitEntities ?? [];
      if (!currentHitEntities.includes(otherEntity)) {
        // Safe for determinism/rollback. Direct getMutableComponent avoids closure allocation while updating hitEntities list.
        const hb = world.getMutableComponent(hitboxEntity, "Hitbox");
        if (hb) {
          if (!hb.hitEntities) hb.hitEntities = [];
          hb.hitEntities.push(otherEntity);
        }

        const hitboxTrans = world.getComponent(hitboxEntity, "Transform") as TransformComponent | undefined;
        const hurtboxTrans = world.getComponent(otherEntity, "Transform") as TransformComponent | undefined;

        const eventBus = world.getEventBus();
        if (eventBus) {
          eventBus.emitDeferred("hitbox:hit", {
            hitboxEntity,
            hurtboxEntity: otherEntity,
            attacker: hitboxTrans?.parentEntity,
            victim: hurtboxTrans?.parentEntity
          });
        }
      }
      return true;
    }
    return false;
  }
}
