import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { SpatialCullingSystem } from "../../systems/SpatialCullingSystem";

/**
 * System enforcing screen or rectangular world spatial boundaries on entities.
 *
 * @remarks
 * Supports three distinct boundary handling modes configured via the `Boundary` component:
 * - `wrap`: Teleports the entity to the opposite edge when leaving bounds (e.g., Asteroids screen wrap).
 * - `destroy`: Removes out-of-bounds entities via `WorldCommandBuffer` or recycles them via `Reclaimable` object pools.
 * - `bounce`: Reverses velocity vectors along breached boundary axes (e.g., Pong ball bouncing off walls).
 *
 * @public
 */
export class BoundarySystem extends System<CoreComponentRegistry> {
  /**
   * Enforces rectangular spatial boundaries on active entities.
   *
   * @param world - Simulation world instance.
   * @param _deltaTime - Elapsed frame duration in seconds.
   *
   * @sideEffect Mutates `Transform` or `Velocity` components, or schedules entity destruction via command buffer.
   */
  update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    let entities = world.query("Transform", "Boundary");
    if (world.getResource("SpatialCullingEnabled") === true) {
      const margin = world.getResource<number>("SpatialCullingMargin") ?? 100;
      entities = SpatialCullingSystem.filterInViewport(world, entities, margin);
    }
    // Safe for determinism/rollback. Sequential indexed loop replaces for..of iterator to eliminate per-tick iterator allocations.
    const len = entities.length;
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const b = world.getComponent(entity, "Boundary")!;
      const t = world.getComponent(entity, "Transform")!;

      // Safe for determinism/rollback. By fetching read-only Transform first, we keep stateVersion updates and callback allocations to exactly zero for all entities that are safely in bounds.
      if (b.mode === "wrap" || b.mode === "destroy") {
        const minX = b.minX ?? 0;
        const maxX = b.maxX ?? b.width;
        const minY = b.minY ?? 0;
        const maxY = b.maxY ?? b.height;

        const isOutOfBounds = t.x < minX || t.x > maxX || t.y < minY || t.y > maxY;

        if (b.mode === "wrap") {
          if (isOutOfBounds) {
            const mt = world.getMutableComponent(entity, "Transform");
            if (mt) {
              if (mt.x < minX) mt.x = maxX;
              else if (mt.x > maxX) mt.x = minX;

              if (mt.y < minY) mt.y = maxY;
              else if (mt.y > maxY) mt.y = minY;
            }
          }
        } else if (isOutOfBounds) {
          world.reclaimEntity(entity);
        }
      } else if (b.mode === "bounce") {
        const bounceX = b.bounceX !== false;
        const bounceY = b.bounceY !== false;
        const clampX = b.clampX === true;
        const clampY = b.clampY === true;
        const minX = clampX ? b.minX ?? 0 : 0;
        const maxX = clampX ? b.maxX ?? b.width : b.width;
        const minY = clampY ? b.minY ?? 0 : 0;
        const maxY = clampY ? b.maxY ?? b.height : b.height;
        let needsX = false;
        let needsY = false;

        if ((bounceX || clampX) && (t.x < minX || t.x > maxX)) {
          needsX = true;
        }
        if ((bounceY || clampY) && (t.y < minY || t.y > maxY)) {
          needsY = true;
        }

        if (needsX || needsY) {
          const mt = world.getMutableComponent(entity, "Transform");
          if (mt) {
            if (needsX) {
              if (mt.x < minX) {
                mt.x = minX;
                this.reverseVelocity(world, entity, "x", clampX);
              } else if (mt.x > maxX) {
                mt.x = maxX;
                this.reverseVelocity(world, entity, "x", clampX);
              }
            }
            if (needsY) {
              if (mt.y < minY) {
                mt.y = minY;
                this.reverseVelocity(world, entity, "y", clampY);
              } else if (mt.y > maxY) {
                mt.y = maxY;
                this.reverseVelocity(world, entity, "y", clampY);
              }
            }
            mt.dirty = true;
          }
        }
      }
    }
  }

  private reverseVelocity(world: World<CoreComponentRegistry>, entity: number, axis: "x" | "y", stop = false): void {
    // Safe for determinism/rollback. Avoids per-tick callback allocations.
    const v = world.getMutableComponent(entity, "Velocity");
    if (v) {
      if (axis === "x") v.vx = stop ? 0 : -v.vx;
      else v.vy = stop ? 0 : -v.vy;
      if (!stop) world.getEventBus()?.emitDeferred("PlaySFX", { name: "bounce" });
    }
  }
}
