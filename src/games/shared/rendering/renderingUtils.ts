import { World, Entity, RenderComponent, TransformComponent } from "@tiny-aster/core";
import { Skia } from "./SkiaContext";

/**
 * Checks whether Skia library is loaded and available for rendering.
 * @public
 */
export function ensureSkiaAvailable(): boolean {
  return Skia !== null && Skia !== undefined;
}

/**
 * Returns the RenderComponent if present and visible, otherwise null.
 * Agnostic of rendering context (works for Canvas2D and Skia).
 * @public
 */
export function getRenderGuard<TRegistry extends Record<string, any> = Record<string, any>>(
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
export function getDrawableTransform<TRegistry extends Record<string, any> = Record<string, any>>(
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
export function getDrawable<TRegistry extends Record<string, any>>(
  world: World<TRegistry>,
  entity: Entity,
  defaultSize: number = 10,
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
