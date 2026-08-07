import { World, BlueprintRegistryMap } from "../../ecs/World";
import { Entity } from "../../ecs/Entity";
import { Shape, ShapeType, ConvexPolygonShape } from "../shapes/Shapes";
import { NarrowPhase } from "../collision/NarrowPhase";
import { ComponentRegistry } from "../../ecs/Component";
import { EventRegistry } from "../../events/EventBus";
import { PhysicsTransformLike, ColliderLike } from "../PhysicsTypes";

/** @public */
export class PhysicsQuery {
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

      const worldX = transform.worldX ?? transform.x;
      const worldY = transform.worldY ?? transform.y;
      const cx = worldX + (collider.offsetX ?? 0);
      const cy = worldY + (collider.offsetY ?? 0);

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

      const worldX = transform.worldX ?? transform.x;
      const worldY = transform.worldY ?? transform.y;
      const cx = worldX + (collider.offsetX ?? 0);
      const cy = worldY + (collider.offsetY ?? 0);
      const rot = transform.worldRotation ?? transform.rotation ?? 0;

      const manifold = NarrowPhase.test(shape, x, y, 0, collider.shape, cx, cy, rot);
      if (manifold.colliding) {
        results.push(entity);
      }
    }
    return results;
  }
}
