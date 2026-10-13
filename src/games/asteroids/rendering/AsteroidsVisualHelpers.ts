import { ShapeType, CircleShape, ColliderComponent, RenderComponent } from "@tiny-aster/core";

/**
 * Resolves asteroid radius from attached Collider or Render size.
 */
export function resolveAsteroidRadius(
  render: RenderComponent | undefined,
  collider: ColliderComponent | undefined,
  defaultRadius = 25
): number {
  if (collider && collider.enabled && collider.shape.type === ShapeType.Circle) {
    return (collider.shape as CircleShape).radius;
  }
  if (render?.size) {
    return render.size / 2;
  }
  return defaultRadius;
}
