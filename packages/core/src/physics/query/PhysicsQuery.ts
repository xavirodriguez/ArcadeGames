import { World, BlueprintRegistryMap } from "../../ecs/World";
import { Entity } from "../../ecs/Entity";
import { Shape, ShapeType, ConvexPolygonShape } from "../shapes/Shapes";
import { NarrowPhase } from "../collision/NarrowPhase";
import { ComponentRegistry } from "../../ecs/Component";
import { EventRegistry } from "../../events/EventBus";
import { PhysicsTransformLike, ColliderLike, getColliderWorldCenter } from "../PhysicsTypes";
import { getColliderWorldBounds } from "../utils/PhysicsTransform";

/**
 * Utility for performing physics-based spatial queries on the ECS world.
 *
 * @remarks
 * Enforces strong type-safety by parameterizing over the world's `ComponentRegistry` to avoid type assertions.
 * Uses `PhysicsTransformLike` and `ColliderLike` structural subtyping to query entities without strict component registry coupling.
 *
 * @public
 */
export class PhysicsQuery {
  /**
   * Casts a 2D point into the world and returns all entities whose collider intersects the point.
   *
   * @remarks
   * Evaluates point intersection against Circle, Box, and Convex Polygon geometries, accounting for world rotation and offsets.
   *
   * @param world - Simulation world instance containing Transform and Collider components.
   * @param x - Target world-space X coordinate.
   * @param y - Target world-space Y coordinate.
   * @returns Array of entity IDs overlapping the query point.
   */
  // TODO(refactor): código duplicado detectado (método) con physics/query/PhysicsQuery.ts:124-134. Considerar extraer a función compartida. Ref: aee69b7e
  public static pointCast<
    TComponents extends ComponentRegistry = ComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, x: number, y: number): Entity[] {
    const results: Entity[] = [];
    const colliderType = "Collider" as Extract<keyof TComponents, string>;
    const transformType = "Transform" as Extract<keyof TComponents, string>;
    const entities = world.query(colliderType, transformType);
    for (const entity of entities) {
      const transform = world.getComponent(entity, transformType) as unknown as PhysicsTransformLike | undefined;
      const collider = world.getComponent(entity, colliderType) as unknown as ColliderLike | undefined;
      if (!transform || !collider || !collider.enabled) continue;

      const bounds = getColliderWorldBounds(transform, collider);
      if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) {
        continue;
      }

      const { cx, cy } = getColliderWorldCenter(transform, collider);

      const shape = collider.shape;
      if (shape.type === ShapeType.Circle) {
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq <= shape.radius * shape.radius) {
          results.push(entity);
        }
      } else if (shape.type === ShapeType.Box) {
        const halfW = shape.width / 2;
        const halfH = shape.height / 2;
        const rot = transform.worldRotation ?? transform.rotation ?? 0;
        if (rot !== 0) {
          const cos = Math.cos(-rot);
          const sin = Math.sin(-rot);
          const rx = cos * (x - cx) - sin * (y - cy);
          const ry = sin * (x - cx) + cos * (y - cy);
          if (Math.abs(rx) <= halfW && Math.abs(ry) <= halfH) {
            results.push(entity);
          }
        } else {
          if (Math.abs(x - cx) <= halfW && Math.abs(y - cy) <= halfH) {
            results.push(entity);
          }
        }
      } else if (shape.type === ShapeType.Polygon) {
        const poly = shape as ConvexPolygonShape;
        if (poly.vertices) {
          const rot = transform.worldRotation ?? transform.rotation ?? 0;
          const cos = Math.cos(rot);
          const sin = Math.sin(rot);
          const worldVerts = poly.vertices.map((v) => {
            const rx = cos * v.x - sin * v.y;
            const ry = sin * v.x + cos * v.y;
            return { x: cx + rx, y: cy + ry };
          });
          let inside = false;
          for (let i = 0, j = worldVerts.length - 1; i < worldVerts.length; j = i++) {
            const xi = worldVerts[i].x, yi = worldVerts[i].y;
            const xj = worldVerts[j].x, yj = worldVerts[j].y;
            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          if (inside) {
            results.push(entity);
          }
        }
      }
    }
    return results;
  }

  /**
   * Casts a primitive geometry shape into the world and returns all entities overlapping the shape.
   *
   * @remarks
   * Evaluates narrowphase SAT overlap using `NarrowPhase.test` between the input shape and world colliders.
   *
   * @param world - Simulation world instance containing Transform and Collider components.
   * @param shape - Query shape geometry (Circle, Box, or Convex Polygon).
   * @param x - World-space position X of the query shape center.
   * @param y - World-space position Y of the query shape center.
   * @returns Array of entity IDs overlapping the query shape.
   */
  // TODO(refactor): código duplicado detectado (método) con physics/query/PhysicsQuery.ts:36-46. Considerar extraer a función compartida. Ref: 75a89c85
  public static shapeCast<
    TComponents extends ComponentRegistry = ComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, shape: Shape, x: number, y: number): Entity[] {
    const results: Entity[] = [];
    const colliderType = "Collider" as Extract<keyof TComponents, string>;
    const transformType = "Transform" as Extract<keyof TComponents, string>;
    const entities = world.query(colliderType, transformType);
    for (const entity of entities) {
      const transform = world.getComponent(entity, transformType) as unknown as PhysicsTransformLike | undefined;
      const collider = world.getComponent(entity, colliderType) as unknown as ColliderLike | undefined;
      if (!transform || !collider || !collider.enabled) continue;

      const { cx, cy } = getColliderWorldCenter(transform, collider);
      const rot = transform.worldRotation ?? transform.rotation ?? 0;

      const manifold = NarrowPhase.test(shape, x, y, 0, collider.shape, cx, cy, rot);
      if (manifold.colliding) {
        results.push(entity);
      }
    }
    return results;
  }
}
