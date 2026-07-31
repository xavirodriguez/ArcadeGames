import { World, ComponentRegistry, BlueprintRegistryMap } from "../../ecs/World";
import { Entity } from "../../ecs/Entity";
import { Shape, ShapeType, ConvexPolygonShape } from "../shapes/Shapes";
import { NarrowPhase } from "../collision/NarrowPhase";
import { TransformComponent, ColliderComponent } from "../../ecs/CoreComponents";
import { EventRegistry } from "../../events/EventBus";

/** @public */
export class PhysicsQuery {
  public static pointCast<
    TComponents extends ComponentRegistry,
    TEvents extends EventRegistry = any,
    TBlueprints extends BlueprintRegistryMap<TComponents> = any
  >(
    world: World<TComponents, TEvents, TBlueprints>,
    x: number,
    y: number
  ): Entity[] {
    const results: Entity[] = [];
    const entities = world.query("Collider" as any, "Transform" as any);
    for (const entity of entities) {
      const transform = world.getComponent(entity, "Transform" as any) as TransformComponent | undefined;
      const collider = world.getComponent(entity, "Collider" as any) as ColliderComponent | undefined;
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
    TComponents extends ComponentRegistry,
    TEvents extends EventRegistry = any,
    TBlueprints extends BlueprintRegistryMap<TComponents> = any
  >(
    world: World<TComponents, TEvents, TBlueprints>,
    shape: Shape,
    x: number,
    y: number
  ): Entity[] {
    const results: Entity[] = [];
    const entities = world.query("Collider" as any, "Transform" as any);
    for (const entity of entities) {
      const transform = world.getComponent(entity, "Transform" as any) as TransformComponent | undefined;
      const collider = world.getComponent(entity, "Collider" as any) as ColliderComponent | undefined;
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
