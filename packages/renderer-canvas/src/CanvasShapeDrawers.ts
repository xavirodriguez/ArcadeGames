import { World, ShapeDrawer, CoreComponentRegistry, ShapeType, CircleShape, BoxShape, ColliderComponent, RenderComponent, ConvexPolygonShape } from "@tiny-aster/core";

/**
 * Drawer for circle shapes in HTML5 Canvas.
 */
export class CanvasCircleDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<CanvasRenderingContext2D, TRegistry> {
  public draw(ctx: CanvasRenderingContext2D, world: World<TRegistry>, entity: number): void {
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;
    const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;

    let radius = 5;
    let offsetX = 0;
    let offsetY = 0;

    if (collider && collider.enabled && collider.shape.type === ShapeType.Circle) {
      radius = (collider.shape as CircleShape).radius;
      offsetX = collider.offsetX ?? 0;
      offsetY = collider.offsetY ?? 0;
    } else {
      const renderType = "Render" as Extract<keyof TRegistry, string>;
      const render = world.getComponent(entity, renderType) as RenderComponent | undefined;
      if (render && render.size !== undefined) {
        radius = render.size / 2;
      }
    }

    ctx.beginPath();
    ctx.arc(offsetX, offsetY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Drawer for box shapes in HTML5 Canvas.
 */
export class CanvasBoxDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<CanvasRenderingContext2D, TRegistry> {
  public draw(ctx: CanvasRenderingContext2D, world: World<TRegistry>, entity: number): void {
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;
    const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;

    let width = 10;
    let height = 10;
    let offsetX = 0;
    let offsetY = 0;

    if (collider && collider.enabled && collider.shape.type === ShapeType.Box) {
      const shape = collider.shape as BoxShape;
      width = shape.width;
      height = shape.height;
      offsetX = collider.offsetX ?? 0;
      offsetY = collider.offsetY ?? 0;
    } else {
      const renderType = "Render" as Extract<keyof TRegistry, string>;
      const render = world.getComponent(entity, renderType) as RenderComponent | undefined;
      if (render && render.size !== undefined) {
        width = render.size;
        height = render.size;
      }
    }

    ctx.fillRect(
      offsetX - width / 2,
      offsetY - height / 2,
      width,
      height
    );
  }
}

/**
 * Drawer for polygon shapes in HTML5 Canvas.
 */
export class CanvasPolygonDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<CanvasRenderingContext2D, TRegistry> {
  public draw(ctx: CanvasRenderingContext2D, world: World<TRegistry>, entity: number): void {
    const renderType = "Render" as Extract<keyof TRegistry, string>;
    const render = world.getComponent(entity, renderType) as RenderComponent | undefined;

    let vertices: Array<{ x: number; y: number }> | undefined;
    if (render && (render as any).vertices) {
      vertices = (render as any).vertices;
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

    ctx.beginPath();
    ctx.moveTo(vertices[0].x + offsetX, vertices[0].y + offsetY);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x + offsetX, vertices[i].y + offsetY);
    }
    ctx.closePath();
    ctx.fill();
  }
}
