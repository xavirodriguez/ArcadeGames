import { World, Entity, RenderComponent } from "@tiny-aster/core";

/**
 * Returns the RenderComponent if visible, otherwise null.
 * Also retrieves size from the render component or returns defaultSize.
 * @public
 */
export function getDrawable<TRegistry extends Record<string, any>>(
  world: World<TRegistry>,
  entity: Entity,
  defaultSize: number = 10
): { render: RenderComponent; size: number } | null {
  const render = world.getComponent(entity, "Render" as Extract<keyof TRegistry, string>) as RenderComponent | undefined;
  if (!render || render.visible === false) {
    return null;
  }
  return {
    render,
    size: render.size ?? defaultSize
  };
}
