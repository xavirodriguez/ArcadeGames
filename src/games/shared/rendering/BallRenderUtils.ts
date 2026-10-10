import { World, RenderComponent, TransformComponent, CoreComponentRegistry } from "@tiny-aster/core";

export interface BasicBallContext {
  render: RenderComponent;
  transform: TransformComponent;
  size: number;
}

export function resolveBasicBallContext(
  world: World<CoreComponentRegistry>,
  entity: number,
  defaultSize = 8
): BasicBallContext | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render || !render.visible) return null;

  const transform = world.getComponent(entity, "Transform") as TransformComponent | undefined;
  if (!transform) return null;

  const size = render.size ?? defaultSize;
  return { render, transform, size };
}
