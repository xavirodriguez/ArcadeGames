import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { CoreComponentRegistry, TransformComponent } from "../ecs/CoreComponents";
import { Entity } from "../ecs/Entity";

/**
 * System that detects triggers between Hitboxes and Hurtboxes, filtering multiple hits.
 * @public
 */
export class HitDetectionSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const hitboxes = world.query("CollisionEvents", "Hitbox");

    for (let i = 0; i < hitboxes.length; i++) {
      const hitboxEntity = hitboxes[i];
      const hitbox = world.getComponent(hitboxEntity, "Hitbox")!;
      const events = world.getComponent(hitboxEntity, "CollisionEvents")!;

      const activeTriggers = events.activeTriggers ?? [];
      const colPairs = events.collisions.map((c) => c.otherEntity) ?? [];
      const allActive = [...activeTriggers, ...colPairs];

      // Safe initialization of hit entities tracking
      const hitEntities = hitbox.hitEntities ?? [];

      for (let j = 0; j < allActive.length; j++) {
        const otherEntity = allActive[j];
        if (!world.hasEntity(otherEntity)) continue;

        // Check if the other entity is a Hurtbox
        if (world.hasComponent(otherEntity, "Hurtbox")) {
          // Verify if this victim has already been hit during this activation
          if (hitEntities.includes(otherEntity)) {
            continue;
          }

          // Mark as hit
          world.mutateComponent(hitboxEntity, "Hitbox", (hb) => {
            if (!hb.hitEntities) hb.hitEntities = [];
            hb.hitEntities.push(otherEntity);
          });

          // Fetch parents to resolve the actual attacker and victim characters
          const hitboxTrans = world.getComponent(hitboxEntity, "Transform") as TransformComponent | undefined;
          const hurtboxTrans = world.getComponent(otherEntity, "Transform") as TransformComponent | undefined;

          const attacker = hitboxTrans?.parentEntity;
          const victim = hurtboxTrans?.parentEntity;

          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emit("hitbox:hit" as any, {
              hitboxEntity,
              hurtboxEntity: otherEntity,
              attacker,
              victim
            });
          }
        }
      }

      // Auto-reset when the hitbox is no longer overlapping any active hurtbox triggers/collisions
      const hurtboxActive = allActive.filter((ent) => world.hasEntity(ent) && world.hasComponent(ent, "Hurtbox"));
      if (hurtboxActive.length === 0 && hitEntities.length > 0) {
        world.mutateComponent(hitboxEntity, "Hitbox", (hb) => {
          hb.hitEntities = [];
        });
      }
    }
  }
}
