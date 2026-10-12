import { World, RenderComponent, TransformComponent, ComponentRegistry } from "@tiny-aster/core";

export interface BasicBallContext {
  render: RenderComponent;
  transform: TransformComponent;
  size: number;
}

// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/renderingUtils.ts:86-91. Considerar extraer a función compartida. Ref: 0bc709f9
export function resolveBasicBallContext<
  TRegistry extends ComponentRegistry = ComponentRegistry
>(
  world: World<TRegistry>,
  entity: number,
  defaultSize = 8
): BasicBallContext | null {
  const render = world.getComponent(entity, "Render" as Extract<keyof TRegistry, string>) as RenderComponent | undefined;
  if (!render || !render.visible) return null;

  const transform = world.getComponent(entity, "Transform" as Extract<keyof TRegistry, string>) as TransformComponent | undefined;
  if (!transform) return null;

  const size = render.size ?? defaultSize;
  return { render, transform, size };
}
