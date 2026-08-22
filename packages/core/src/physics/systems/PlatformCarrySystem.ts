import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";

/**
 * System managing characters landing on and being dynamically carried by moving platforms.
 *
 * @remarks
 * Integrates non-disruptively with standard `CollisionEvents` to detect landing,
 * and maintains a robust mathematical fallback for axis-aligned bounding box (AABB) overlap.
 * Automatically detaches entities when jumping or walking off platform edges.
 *
 * @public
 */
export class PlatformCarrySystem extends System<CoreComponentRegistry> {
  /**
   * Updates platform attachment, displacement transfer, and detachment logic for characters.
   *
   * @param world - Simulation world instance.
   * @param deltaTime - Frame elapsed time in seconds.
   *
   * @sideEffect Mutates `Transform`, `Velocity`, and `PlatformerGroundState` components.
   */
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const characters = world.query("Transform", "Velocity", "Collider2D", "PlatformerGroundState");
    const platforms = world.query("Transform", "Velocity", "Collider2D", "MovingPlatform");

    for (let i = 0; i < characters.length; i++) {
      const charEntity = characters[i];
      const groundState = world.getComponent(charEntity, "PlatformerGroundState")!;

      if (groundState.carrierEntity !== undefined) {
        // Carry mode: character is currently on a moving platform
        const carrier = groundState.carrierEntity;

        if (!groundState.isGrounded) {
          // If the character is no longer grounded (e.g., they jumped), detach them immediately
          world.mutateComponent(charEntity, "PlatformerGroundState", (g) => {
            g.carrierEntity = undefined;
          });
          continue;
        }

        const platformTrans = world.getComponent(carrier, "Transform");
        const platformVel = world.getComponent(carrier, "Velocity");
        const platformCol = world.getComponent(carrier, "Collider2D");

        if (!platformTrans || !platformVel || !platformCol) {
          // If platform has been destroyed or is missing components, detach them
          world.mutateComponent(charEntity, "PlatformerGroundState", (g) => {
            g.carrierEntity = undefined;
          });
          continue;
        }

        // Apply platform displacement directly to player transform
        world.mutateComponent(charEntity, "Transform", (t) => {
          t.x += platformVel.vx * deltaTime;
          t.y += platformVel.vy * deltaTime;
          t.dirty = true;
        });

        // Perform boundary check: did the character walk off the edge of the moving platform?
        const charTrans = world.getComponent(charEntity, "Transform")!;
        const charCol = world.getComponent(charEntity, "Collider2D")!;

        if (charCol.shape.type === "aabb" && platformCol.shape.type === "aabb") {
          const charShape = charCol.shape as { type: "aabb"; halfWidth: number; halfHeight: number };
          const platformShape = platformCol.shape as { type: "aabb"; halfWidth: number; halfHeight: number };

          const cx = charTrans.x + charCol.offsetX;
          const px = platformTrans.x + platformCol.offsetX;
          const chw = charShape.halfWidth;
          const phw = platformShape.halfWidth;

          if (cx + chw < px - phw || cx - chw > px + phw) {
            // Walked off the edge! Detach them and mark as ungrounded
            world.mutateComponent(charEntity, "PlatformerGroundState", (g) => {
              g.carrierEntity = undefined;
              g.isGrounded = false;
            });
          }
        }
      } else {
        // Landing mode: look for any moving platform to land on
        const charVel = world.getComponent(charEntity, "Velocity")!;
        if (charVel.vy < 0) continue; // Only land when falling or moving down

        const charTrans = world.getComponent(charEntity, "Transform")!;
        const charCol = world.getComponent(charEntity, "Collider2D")!;
        if (charCol.shape.type !== "aabb") continue;

        const charShape = charCol.shape as { type: "aabb"; halfWidth: number; halfHeight: number };
        const cx = charTrans.x + charCol.offsetX;
        const cy = charTrans.y + charCol.offsetY;
        const chw = charShape.halfWidth;
        const chh = charShape.halfHeight;
        const charBottom = cy + chh;
        const prevCharBottom = (charTrans.y - charVel.vy * deltaTime) + charCol.offsetY + chh;

        let landedPlatform: Entity | undefined = undefined;

        // Safe for determinism/rollback. Sequential indexed loops replace array spreading/mapping [...activeTriggers, ...colPairs], eliminating per-character per-tick heap allocations while evaluating identical contact entities.
        // Try detecting landing through CollisionEvents (triggers or physical contacts) if available
        const collisionEvents = world.getComponent(charEntity, "CollisionEvents" as any) as any;
        if (collisionEvents) {
          if (collisionEvents.activeTriggers) {
            for (let j = 0; j < collisionEvents.activeTriggers.length; j++) {
              const contactEntity = collisionEvents.activeTriggers[j];
              if (world.hasEntity(contactEntity) && world.hasComponent(contactEntity, "MovingPlatform")) {
                const platVel = world.getComponent(contactEntity, "Velocity")!;
                if (charVel.vy >= platVel.vy) {
                  landedPlatform = contactEntity;
                  break;
                }
              }
            }
          }
          if (landedPlatform === undefined && collisionEvents.collisions) {
            for (let j = 0; j < collisionEvents.collisions.length; j++) {
              const contactEntity = collisionEvents.collisions[j].otherEntity;
              if (world.hasEntity(contactEntity) && world.hasComponent(contactEntity, "MovingPlatform")) {
                const platVel = world.getComponent(contactEntity, "Velocity")!;
                if (charVel.vy >= platVel.vy) {
                  landedPlatform = contactEntity;
                  break;
                }
              }
            }
          }
        }

        // If CollisionEvents did not yield a result, fall back to our ultra-robust manual AABB containment math
        if (landedPlatform === undefined) {
          for (let j = 0; j < platforms.length; j++) {
            const platEntity = platforms[j];
            const platTrans = world.getComponent(platEntity, "Transform")!;
            const platVel = world.getComponent(platEntity, "Velocity")!;
            const platCol = world.getComponent(platEntity, "Collider2D")!;
            if (platCol.shape.type !== "aabb") continue;

            const platShape = platCol.shape as { type: "aabb"; halfWidth: number; halfHeight: number };
            const px = platTrans.x + platCol.offsetX;
            const py = platTrans.y + platCol.offsetY;
            const phw = platShape.halfWidth;
            const phh = platShape.halfHeight;
            const platTop = py - phh;
            const prevPlatTop = (platTrans.y - platVel.vy * deltaTime) + platCol.offsetY - phh;

            // Check for horizontal overlap
            const overlapX = (cx + chw > px - phw) && (cx - chw < px + phw);
            if (!overlapX) continue;

            // Check if descending onto the platform from above
            const isDescending = charVel.vy >= platVel.vy;
            const wasAbove = prevCharBottom <= prevPlatTop + 2.0;
            const isAtOrInside = charBottom >= platTop - 2.0 && charBottom <= py + phh + 5.0;

            if (isDescending && wasAbove && isAtOrInside) {
              landedPlatform = platEntity;
              break;
            }
          }
        }

        if (landedPlatform !== undefined) {
          const platEntity = landedPlatform;
          const platTrans = world.getComponent(platEntity, "Transform")!;
          const platCol = world.getComponent(platEntity, "Collider2D")!;
          const platShape = platCol.shape as { type: "aabb"; halfWidth: number; halfHeight: number };

          const py = platTrans.y + platCol.offsetY;
          const phh = platShape.halfHeight;
          const platTop = py - phh;

          // Landed! Snap player's Y to the top of the platform
          world.mutateComponent(charEntity, "Transform", (t) => {
            t.y = platTop - chh - charCol.offsetY;
            t.dirty = true;
          });
          world.mutateComponent(charEntity, "Velocity", (v) => {
            v.vy = 0;
          });
          world.mutateComponent(charEntity, "PlatformerGroundState", (g) => {
            g.isGrounded = true;
            g.carrierEntity = platEntity;
          });
        }
      }
    }
  }
}
