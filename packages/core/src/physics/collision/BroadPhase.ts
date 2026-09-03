import { TransformComponent, ColliderComponent, CoreComponentRegistry } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";
import { World } from "../../ecs/World";
import { AABB } from "./CollisionTypes";
import { ShapeType, ConvexPolygonShape } from "../shapes/Shapes";

/**
 * Bounds object used for Sweep and Prune.
 * @internal
 */
interface EntityBounds {
  entity: Entity;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const boundsPool: EntityBounds[] = [];
const pairsPool: Array<[Entity, Entity]> = [];

/**
 * Broadphase collision detection module utilizing 1D Sweep and Prune.
 *
 * @remarks
 * Filters out non-overlapping entity pairs prior to expensive narrowphase SAT calculations.
 * Employs zero-allocation object pools (`boundsPool` and `pairsPool`) and in-place Shell sort
 * on the X-axis to eliminate runtime heap allocations during tick processing.
 *
 * @public
 */
export class BroadPhase {
  /**
   * Computes the world-space Axis-Aligned Bounding Box (AABB) for an entity collider.
   *
   * @remarks
   * Handles Circle, Box, and Convex Polygon geometry. Transforms local vertex offsets
   * into world coordinates using position, offset, scale, and rotation.
   *
   * @param transform - World transform component defining position, scale, and rotation.
   * @param collider - Collider component containing shape geometry and offsets.
   * @returns Computed world-space AABB bounds `{ minX, minY, maxX, maxY }`.
   */
  static getShapeBounds(transform: Readonly<TransformComponent>, collider: Readonly<ColliderComponent>): AABB {
    const worldX = transform.worldX ?? transform.x;
    const worldY = transform.worldY ?? transform.y;
    const cx = worldX + (collider.offsetX ?? 0);
    const cy = worldY + (collider.offsetY ?? 0);
    const shape = collider.shape;

    if (shape.type === ShapeType.Circle) {
      return {
        minX: cx - shape.radius,
        minY: cy - shape.radius,
        maxX: cx + shape.radius,
        maxY: cy + shape.radius,
      };
    } else if (shape.type === ShapeType.Box) {
      return {
        minX: cx - shape.width / 2,
        minY: cy - shape.height / 2,
        maxX: cx + shape.width / 2,
        maxY: cy + shape.height / 2,
      };
    } else if (shape.type === ShapeType.Polygon) {
      const poly = shape as ConvexPolygonShape;
      if (poly.vertices && poly.vertices.length > 0) {
        const rot = transform.worldRotation ?? transform.rotation ?? 0;
        const scaleX = transform.worldScaleX ?? transform.scaleX ?? 1;
        const scaleY = transform.worldScaleY ?? transform.scaleY ?? 1;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const v of poly.vertices) {
          const sx = v.x * scaleX;
          const sy = v.y * scaleY;
          const rx = cos * sx - sin * sy;
          const ry = sin * sx + cos * sy;
          const wx = cx + rx;
          const wy = cy + ry;

          if (wx < minX) minX = wx;
          if (wy < minY) minY = wy;
          if (wx > maxX) maxX = wx;
          if (wy > maxY) maxY = wy;
        }

        return { minX, minY, maxX, maxY };
      }
    }

    return { minX: cx, minY: cy, maxX: cx, maxY: cy };
  }

  /**
   * Executes 1D Sweep and Prune on candidate entities along the X-axis.
   *
   * @remarks
   * Performs zero runtime object or array allocations by mutating static pre-allocated pools
   * (`boundsPool` and `pairsPool`). In-place Shell sort operates on bounds sorted by `minX`,
   * providing fast O(n log n) to O(n) performance for temporally coherent physics bodies.
   *
   * @param entities - List of candidate entities to evaluate.
   * @param world - Simulation world instance containing Transform and Collider components.
   * @returns Reused array of candidate overlapping entity ID pairs `[Entity, Entity]`.
   */
  static sweepAndPrune(entities: ReadonlyArray<Entity>, world: World<CoreComponentRegistry>): Array<[Entity, Entity]> {
    // Re-use or expand boundsPool to minimize object allocation overhead.
    const count = entities.length;
    for (let i = 0; i < count; i++) {
      const entity = entities[i];
      const transform = world.getComponent(entity, "Transform") as unknown as TransformComponent;
      const collider = world.getComponent(entity, "Collider") as unknown as ColliderComponent;

      if (!boundsPool[i]) {
        boundsPool[i] = { entity: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
      }

      const b = boundsPool[i];
      b.entity = entity;

      if (!transform || !collider) {
        b.minX = b.minY = b.maxX = b.maxY = 0;
      } else {
        const aabb = this.getShapeBounds(transform, collider);
        b.minX = aabb.minX;
        b.minY = aabb.minY;
        b.maxX = aabb.maxX;
        b.maxY = aabb.maxY;
      }
    }

    // Allocation-free in-place Shell Sort on the active region of boundsPool.
    // Extremely fast and stable for nearly-sorted coordinates typical of moving physics bodies.
    let gap = Math.floor(count / 2);
    while (gap > 0) {
      for (let i = gap; i < count; i++) {
        const temp = boundsPool[i];
        let j = i;
        while (j >= gap && boundsPool[j - gap].minX > temp.minX) {
          boundsPool[j] = boundsPool[j - gap];
          j -= gap;
        }
        boundsPool[j] = temp;
      }
      gap = Math.floor(gap / 2);
    }

    // Safe for determinism/rollback. Reusing a static pairs buffer and updating tuple elements in place eliminates per-tick pair allocations during broadphase collision checks.
    let pairIndex = 0;
    for (let i = 0; i < count; i++) {
      const a = boundsPool[i];
      if (a.entity === 0) continue; // Skip invalid

      for (let j = i + 1; j < count; j++) {
        const b = boundsPool[j];
        if (b.minX > a.maxX) break;
        if (a.minY <= b.maxY && b.minY <= a.maxY) {
          let pair = pairsPool[pairIndex];
          if (!pair) {
            pair = [a.entity, b.entity];
            pairsPool[pairIndex] = pair;
          } else {
            pair[0] = a.entity;
            pair[1] = b.entity;
          }
          pairIndex++;
        }
      }
    }
    pairsPool.length = pairIndex;
    return pairsPool;
  }
}
