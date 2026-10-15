import { World, RenderComponent, TransformComponent, ComponentRegistry } from "@tiny-aster/core";
import { getVisibleCanvasRenderAndTransform } from "./renderingUtils";

export interface BasicBallContext {
  render: RenderComponent;
  transform: TransformComponent;
  size: number;
}

export function resolveBasicBallContext<
  TRegistry extends ComponentRegistry = ComponentRegistry
>(
  world: World<TRegistry>,
  entity: number,
  defaultSize = 8
): BasicBallContext | null {
  const ctx = getVisibleCanvasRenderAndTransform(world, entity);
  if (!ctx) return null;
  return { render: ctx.render, transform: ctx.transform, size: ctx.render.size ?? defaultSize };
}
