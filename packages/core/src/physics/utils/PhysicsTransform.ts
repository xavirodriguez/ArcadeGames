import { AABB } from "../collision/CollisionTypes";
import { PhysicsTransformLike, ColliderLike, getColliderWorldCenter } from "../PhysicsTypes";
import { ShapeType, ConvexPolygonShape } from "../shapes/Shapes";

/**
 * Computes the world-space Axis-Aligned Bounding Box (AABB) for a given transform and collider.
 *
 * @param transform - World position, rotation, and optional scale.
 * @param collider - Collider definition containing shape geometry and spatial offsets.
 * @returns Computed world-space AABB bounds `{ minX, minY, maxX, maxY }`.
 * @public
 */
export function getColliderWorldBounds(
  transform: PhysicsTransformLike,
  collider: ColliderLike
): AABB {
  const { cx, cy } = getColliderWorldCenter(transform, collider);
  const shape = collider.shape;

  if (shape.type === ShapeType.Circle) {
    return {
      minX: cx - shape.radius,
      minY: cy - shape.radius,
      maxX: cx + shape.radius,
      maxY: cy + shape.radius,
    };
  } else if (shape.type === ShapeType.Box) {
    const rot = transform.worldRotation ?? transform.rotation ?? 0;
    if (rot === 0) {
      const halfW = shape.width / 2;
      const halfH = shape.height / 2;
      return {
        minX: cx - halfW,
        minY: cy - halfH,
        maxX: cx + halfW,
        maxY: cy + halfH,
      };
    } else {
      const halfW = shape.width / 2;
      const halfH = shape.height / 2;
      const cos = Math.abs(Math.cos(rot));
      const sin = Math.abs(Math.sin(rot));
      const boundingHalfW = halfW * cos + halfH * sin;
      const boundingHalfH = halfW * sin + halfH * cos;
      return {
        minX: cx - boundingHalfW,
        minY: cy - boundingHalfH,
        maxX: cx + boundingHalfW,
        maxY: cy + boundingHalfH,
      };
    }
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

      for (let i = 0; i < poly.vertices.length; i++) {
        const v = poly.vertices[i];
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
