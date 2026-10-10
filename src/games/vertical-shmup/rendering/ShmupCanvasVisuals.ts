import { ShapeDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";

// TODO(refactor): código duplicado detectado (bloque) con vertical-shmup/rendering/ShmupCanvasVisuals.ts:24-30. Considerar extraer a función compartida. Ref: 24b4917a
export const drawShmupPlayer: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 20;
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#00e5ff";
    ctx.fillStyle = render.color ?? "#00e5ff";
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
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 20;
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff2a6d";
    ctx.fillStyle = render.color ?? "#ff2a6d";
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

// TODO(refactor): código duplicado detectado (bloque) con vertical-shmup/rendering/ShmupCanvasVisuals.ts:57-62. Considerar extraer a función compartida. Ref: 3409df9c
export const drawShmupPlayerBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 4;
    ctx.fillStyle = render.color ?? "#ffe600";
    ctx.shadowBlur = 8;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillRect(-size / 2, -size * 2, size, size * 4);
  }
};

export const drawShmupEnemyBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 4;
    ctx.fillStyle = render.color ?? "#ff5a5a";
    ctx.shadowBlur = 8;
    ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }
};
