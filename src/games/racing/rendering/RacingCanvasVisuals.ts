import type { ShapeDrawer } from "@tiny-aster/core";
import type { RacingComponentRegistry } from "../types/RacingRegistry";

export const drawRacingCar: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 16;
    const color = render.color ?? "#00e5ff";
    const input = world.getComponent(entity, "Input");
    const boosting = input?.actions.boost === true;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = boosting ? 18 : 10;
    ctx.beginPath();
    ctx.roundRect(-size, -size * 0.55, size * 2, size * 1.1, size * 0.3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.fillRect(-size * 0.45, -size * 0.4, size * 0.9, size * 0.8);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(size * 0.5, -size * 0.35, size * 0.18, size * 0.7);
    if (boosting) {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(-size * 1.65, -size * 0.35);
      ctx.lineTo(-size * 1.65, size * 0.35);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
};

export const drawTrackWall: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const wall = world.getComponent(entity, "RacingWall");
    if (!render || !wall) return;
    ctx.save();
    ctx.fillStyle = "#111827";
    ctx.strokeStyle = render.color ?? "#ff2a6d";
    ctx.lineWidth = 3;
    ctx.shadowColor = render.color ?? "#ff2a6d";
    ctx.shadowBlur = 8;
    ctx.fillRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height);
    ctx.strokeRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height);
    ctx.restore();
  }
};

export const drawCheckpoint: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const checkpoint = world.getComponent(entity, "Checkpoint");
    if (!checkpoint) return;
    ctx.save();
    ctx.strokeStyle = checkpoint.isFinish ? "#fbbf24" : "rgba(255,255,255,0.16)";
    ctx.setLineDash(checkpoint.isFinish ? [10, 8] : [4, 8]);
    ctx.lineWidth = checkpoint.isFinish ? 4 : 2;
    ctx.strokeRect(-checkpoint.width / 2, -checkpoint.height / 2, checkpoint.width, checkpoint.height);
    ctx.restore();
  }
};

export const drawTrackZone: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 80;
    ctx.save();
    ctx.fillStyle = render.color ?? "rgba(255, 255, 255, 0.25)";
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

export const drawTrackObstacle: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 30;
    ctx.save();
    ctx.fillStyle = render.color ?? "#f59e0b";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
};
