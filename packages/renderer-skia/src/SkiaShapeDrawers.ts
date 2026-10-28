import { World, ShapeDrawer, CoreComponentRegistry, ShapeType, CircleShape, BoxShape, ColliderComponent, RenderComponent, ConvexPolygonShape } from "@tiny-aster/core";
import { SkCanvas, SkPaint, Skia } from "@shopify/react-native-skia";

/**
 * Drawer for circle shapes using React Native Skia.
 */
export class SkiaCircleDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<SkCanvas, TRegistry> {
  constructor(private readonly paint: SkPaint) {}

  public draw(canvas: SkCanvas, world: World<TRegistry>, entity: number): void {
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;
    const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;
    if (!collider || !collider.enabled || collider.shape.type !== ShapeType.Circle) return;

    const shape = collider.shape as CircleShape;
    const offsetX = collider.offsetX ?? 0;
    const offsetY = collider.offsetY ?? 0;

    canvas.drawCircle(offsetX, offsetY, shape.radius, this.paint);
  }
}

/**
 * Drawer for box shapes using React Native Skia.
 */
export class SkiaBoxDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<SkCanvas, TRegistry> {
  constructor(private readonly paint: SkPaint) {}

  public draw(canvas: SkCanvas, world: World<TRegistry>, entity: number): void {
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;
    const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;
    if (!collider || !collider.enabled || collider.shape.type !== ShapeType.Box) return;

    const shape = collider.shape as BoxShape;
    const offsetX = collider.offsetX ?? 0;
    const offsetY = collider.offsetY ?? 0;

    canvas.drawRect(
      Skia.XYWHRect(offsetX - shape.width / 2, offsetY - shape.height / 2, shape.width, shape.height),
      this.paint
    );
  }
}

/**
 * Drawer for convex polygon shapes using React Native Skia.
 * Mirrors the behaviour of CanvasPolygonDrawer so that entities with
 * ShapeType.Polygon colliders are visible on native.
 */
export class SkiaPolygonDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<SkCanvas, TRegistry> {
  constructor(private readonly paint: SkPaint) {}

  public draw(canvas: SkCanvas, world: World<TRegistry>, entity: number): void {
    const renderType = "Render" as Extract<keyof TRegistry, string>;
    const render = world.getComponent(entity, renderType) as RenderComponent | undefined;

    let vertices: Array<{ x: number; y: number }> | undefined;
    if (render) {
      const renderWithVertices = render as RenderComponent & { vertices?: Array<{ x: number; y: number }> };
      if (renderWithVertices.vertices) {
        vertices = renderWithVertices.vertices;
      }
    }

    let offsetX = 0;
    let offsetY = 0;

    if (!vertices) {
      const colliderType = "Collider" as Extract<keyof TRegistry, string>;
      const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;
      if (collider && collider.enabled && collider.shape.type === ShapeType.Polygon) {
        vertices = (collider.shape as ConvexPolygonShape).vertices;
        offsetX = collider.offsetX ?? 0;
        offsetY = collider.offsetY ?? 0;
      }
    }

    if (!vertices || vertices.length === 0) return;

    const path = Skia.Path.Make();
    path.moveTo(vertices[0].x + offsetX, vertices[0].y + offsetY);
    for (let i = 1; i < vertices.length; i++) {
      path.lineTo(vertices[i].x + offsetX, vertices[i].y + offsetY);
    }
    path.close();

    canvas.drawPath(path, this.paint);
  }
}
