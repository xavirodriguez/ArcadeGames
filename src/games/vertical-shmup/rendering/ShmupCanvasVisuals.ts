import { ShapeDrawer, World, Entity } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";

export interface ShmupDrawerContext {
  size: number;
  color: string;
}

export function resolveShmupDrawerContext(
  world: World<ShmupComponentRegistry>,
  entity: Entity,
  defaultSize: number,
  defaultColor: string
): ShmupDrawerContext | null {
  const render = world.getComponent(entity, "Render");
  if (!render) return null;
  const size = render.size ?? defaultSize;
  const color = render.color ?? defaultColor;
  return { size, color };
}

export const drawShmupPlayer: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const frame = resolveShmupDrawerContext(world, entity, 20, "#00e5ff");
    if (!frame) return;
    const { size, color } = frame;

    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, size);
    ctx.lineTo(0, size * 0.55);
    ctx.lineTo(-size * 0.7, size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

export const drawShmupEnemy: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const frame = resolveShmupDrawerContext(world, entity, 20, "#ff2a6d");
    if (!frame) return;
    const { size, color } = frame;

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size, -size * 0.4);
    ctx.lineTo(size * 0.45, -size);
    ctx.lineTo(-size * 0.45, -size);
    ctx.lineTo(-size, -size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

export const drawShmupPlayerBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const frame = resolveShmupDrawerContext(world, entity, 4, "#ffe600");
    if (!frame) return;
    const { size, color } = frame;

    ctx.fillStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fillRect(-size / 2, -size * 2, size, size * 4);
  }
};

export const drawShmupEnemyBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const frame = resolveShmupDrawerContext(world, entity, 4, "#ff5a5a");
    if (!frame) return;
    const { size, color } = frame;

    ctx.fillStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }
};
