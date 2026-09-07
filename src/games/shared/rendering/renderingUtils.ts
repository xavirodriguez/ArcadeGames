import { World, Entity, RenderComponent } from "@tiny-aster/core";

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
  const render = world.getComponent(entity, "Render" as Extract<keyof TRegistry, string>) as RenderComponent | undefined;
  if (!render || render.visible === false) {
    return null;
  }
  return {
    render,
    size: render.size ?? defaultSize,
    color: render.color || defaultColor || "#ffffff"
  };
}
