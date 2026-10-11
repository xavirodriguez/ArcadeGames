import { ShapeType, CircleShape, ColliderComponent, RenderComponent } from "@tiny-aster/core";

export function resolveAsteroidRadius(
  render: RenderComponent | { size?: number } | undefined,
  collider: ColliderComponent | { enabled?: boolean; shape?: { type: ShapeType; radius?: number } } | undefined
): number {
  if (collider && collider.enabled && collider.shape && collider.shape.type === ShapeType.Circle) {
    return (collider.shape as CircleShape).radius;
  }
  if (render && render.size) {
    return render.size / 2;
  }
  return 25;
}
