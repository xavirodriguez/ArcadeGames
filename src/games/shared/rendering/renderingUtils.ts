import { World, Entity, RenderComponent, TransformComponent, ShapeDrawer, ComponentRegistry, CoreComponentRegistry } from "@tiny-aster/core";
import { Skia, getPaint } from "./SkiaContext";
import type { SkCanvas, SkPaint } from "./SkiaContext";

/**
 * Resets paint, enables anti-aliasing, and configures style and color for Skia rendering.
 *
 * @param paint - Target SkPaint instance to fill.
 * @param style - "fill" or "stroke".
 * @param color - Color string hex or CSS color name.
 * @param strokeWidth - Stroke width if style is "stroke" (defaults to 1.5).
 * @public
 */
export function fillSkiaPaint(
  paint: SkPaint,
  style: "fill" | "stroke",
  color: string,
  strokeWidth = 1.5
): void {
  paint.reset();
  paint.setAntiAlias(true);
  if (style === "fill") {
    paint.setStyle(Skia.PaintStyle.Fill);
  } else {
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(strokeWidth);
  }
  paint.setColor(Skia.Color(color));
}

/**
 * Shared zero-allocation helper drawing a filled rounded rectangle with Skia.
 *
 * @param canvas - Skia canvas.
 * @param width - Rectangle width.
 * @param height - Rectangle height.
 * @param color - Color string hex or CSS color name.
 * @param rx - Corner radius X.
 * @param ry - Corner radius Y.
 * @public
 */
export function drawSkiaFilledRoundRect(
  canvas: SkCanvas,
  width: number,
  height: number,
  color: string,
  rx: number,
  ry: number
): void {
  const paint = getPaint();
  if (!paint || !ensureSkiaAvailable()) return;

  canvas.save();
  fillSkiaPaint(paint, "fill", color);
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(-width / 2, -height / 2, width, height), rx, ry),
    paint
  );
  canvas.restore();
}

export interface SkiaShapeConfig {
  defaultSize: number;
  defaultColor?: string;
  strokeWidth?: number;
  style?: "stroke" | "fill";
}

/**
 * Higher-order factory function to generate zero-allocation Skia shape drawers.
 * @public
 */
export function defineSkiaShape<TReg extends ComponentRegistry = CoreComponentRegistry>(
  config: SkiaShapeConfig,
  drawPath: (
    canvas: SkCanvas,
    paint: SkPaint,
    size: number,
    color: string,
    world: World<TReg>,
    entity: Entity
  ) => void
): ShapeDrawer<SkCanvas, TReg> {
  return {
    draw(canvas: SkCanvas, world: World<TReg>, entity: Entity) {
      if (!ensureSkiaAvailable()) return;

      const render = getRenderGuard(world, entity);
      if (!render) return;

      const size = render.size ?? config.defaultSize;
      const color = render.color ?? config.defaultColor ?? "#ffffff";

      const paint = getPaint();
      if (!paint) return;

      canvas.save();

      paint.reset();
      paint.setAntiAlias(true);
      if (config.style === "fill") {
        paint.setStyle(Skia.PaintStyle.Fill);
      } else {
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setStrokeWidth(config.strokeWidth ?? 1.5);
      }
      paint.setColor(Skia.Color(color));

      drawPath(canvas, paint, size, color, world, entity);

      canvas.restore();
    }
  };
}

/**
 * Checks whether Skia library is loaded and available for rendering.
 * @public
 */
export function ensureSkiaAvailable(): boolean {
  return Skia !== null && Skia !== undefined;
}

/**
 * Returns the RenderComponent if present and visible and Skia is available, otherwise null.
 * @public
 */
export function getVisibleSkiaRender<TRegistry extends ComponentRegistry = CoreComponentRegistry>(
  world: World<TRegistry>,
  entity: Entity
): RenderComponent | null {
  if (!Skia) return null;
  const render = world.getComponent(entity, "Render" as Extract<keyof TRegistry, string>) as RenderComponent | undefined;
  if (!render || !render.visible) return null;
  return render;
}

/**
 * Returns both RenderComponent and TransformComponent if render is present and visible,
 * otherwise null. Works for Canvas rendering contexts.
 * @public
 */
export function getVisibleCanvasRenderAndTransform<TRegistry extends ComponentRegistry = CoreComponentRegistry>(
  world: World<TRegistry>,
  entity: Entity
): { render: RenderComponent; transform: TransformComponent } | null {
  const render = world.getComponent(entity, "Render" as Extract<keyof TRegistry, string>) as RenderComponent | undefined;
  if (!render || !render.visible) return null;

  const transform = world.getComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as TransformComponent | undefined;
  if (!transform) return null;

  return { render, transform };
}

/**
 * Returns the RenderComponent if present and visible, otherwise null.
 * Agnostic of rendering context (works for Canvas2D and Skia).
 * @public
 */
export function getRenderGuard<TRegistry extends ComponentRegistry = CoreComponentRegistry>(
  world: World<TRegistry>,
  entity: Entity
): RenderComponent | null {
  const render = world.getComponent(entity, "Render" as Extract<keyof TRegistry, string>) as RenderComponent | undefined;
  if (!render || !render.visible) {
    return null;
  }
  return render;
}

/**
 * Returns the TransformComponent if present on entity, otherwise null.
 * @public
 */
export function getDrawableTransform<TRegistry extends ComponentRegistry = CoreComponentRegistry>(
  world: World<TRegistry>,
  entity: Entity
): TransformComponent | null {
  const transform = world.getComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as TransformComponent | undefined;
  return transform ?? null;
}

/**
 * Returns the RenderComponent if visible, otherwise null.
 * Also retrieves size and color from the render component or returns default values.
 * @public
 */
export function getDrawable<TRegistry extends ComponentRegistry = CoreComponentRegistry>(
  world: World<TRegistry>,
  entity: Entity,
  defaultSize = 10,
  defaultColor?: string
): { render: RenderComponent; size: number; color: string } | null {
  const render = getRenderGuard(world, entity);
  if (!render) {
    return null;
  }
  return {
    render,
    size: render.size ?? defaultSize,
    color: render.color || defaultColor || "#ffffff"
  };
}
