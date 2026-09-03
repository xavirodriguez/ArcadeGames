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
      if (b.mode === "wrap") {
        if (t.x < 0 || t.x > b.width || t.y < 0 || t.y > b.height) {
          const mt = world.getMutableComponent(entity, "Transform");
          if (mt) {
            if (mt.x < 0) mt.x = b.width;
            if (mt.x > b.width) mt.x = 0;
            if (mt.y < 0) mt.y = b.height;
            if (mt.y > b.height) mt.y = 0;
          }
        }
      } else if (b.mode === "destroy") {
        if (t.x < 0 || t.x > b.width || t.y < 0 || t.y > b.height) {
          const reclaimable = world.getComponent(entity, "Reclaimable");
          if (reclaimable) {
            if (typeof reclaimable.onReclaim === "function") {
              reclaimable.onReclaim({ world, entity });
            } else {
              const pool = world.getResource<any>(reclaimable.poolId);
              if (pool && typeof pool.release === "function") {
                pool.release({ world, entity });
              }
            }
          }
          world.getCommandBuffer().removeEntity(entity);
        }
      } else if (b.mode === "bounce") {
        const bounceX = b.bounceX !== false;
        const bounceY = b.bounceY !== false;
        let needsX = false;
        let needsY = false;

        if (bounceX && (t.x < 0 || t.x > b.width)) {
          needsX = true;
        }
        if (bounceY && (t.y < 0 || t.y > b.height)) {
          needsY = true;
        }

        if (needsX || needsY) {
          const mt = world.getMutableComponent(entity, "Transform");
          if (mt) {
            if (needsX) {
              if (mt.x < 0) {
                mt.x = 0;
                this.reverseVelocity(world, entity, "x");
              } else if (mt.x > b.width) {
                mt.x = b.width;
                this.reverseVelocity(world, entity, "x");
              }
            }
            if (needsY) {
              if (mt.y < 0) {
                mt.y = 0;
                this.reverseVelocity(world, entity, "y");
              } else if (mt.y > b.height) {
                mt.y = b.height;
                this.reverseVelocity(world, entity, "y");
              }
            }
          }
        }
      }
    }
  }

  private reverseVelocity(world: World<CoreComponentRegistry>, entity: number, axis: "x" | "y"): void {
    // Safe for determinism/rollback. Avoids per-tick callback allocations.
    const v = world.getMutableComponent(entity, "Velocity");
    if (v) {
      if (axis === "x") v.vx *= -1;
      else v.vy *= -1;
    }
  }
}
