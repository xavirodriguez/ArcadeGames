import { World, CoreComponentRegistry } from "@tiny-aster/core";

export function storePreviousTransforms(world: World<CoreComponentRegistry>): void {
  const entities = world.query("Transform");
  const len = entities.length;
  for (let i = 0; i < len; i++) {
    const e = entities[i];
    const t = world.getComponent(e, "Transform") as
      | { x: number; y: number; prevX?: number; prevY?: number }
      | undefined;
    if (!t) continue;

    const mut = world.getMutableComponent(e, "Transform") as
      | { x: number; y: number; prevX?: number; prevY?: number }
      | undefined;
    if (mut) {
      mut.prevX = t.x;
      mut.prevY = t.y;
    }
  }
}

export function getInterpolatedPosition(
  world: World<CoreComponentRegistry>,
  entity: number,
  alpha = 1.0
): { x: number; y: number } {
  const t = world.getComponent(entity, "Transform") as
    | { x: number; y: number; prevX?: number; prevY?: number; worldX?: number; worldY?: number }
    | undefined;
  if (!t) return { x: 0, y: 0 };

  const currX = t.worldX ?? t.x;
  const currY = t.worldY ?? t.y;
  const prevX = t.prevX ?? currX;
  const prevY = t.prevY ?? currY;

  const interpolatedX = prevX + (currX - prevX) * alpha;
  const interpolatedY = prevY + (currY - prevY) * alpha;

  return { x: interpolatedX, y: interpolatedY };
}
