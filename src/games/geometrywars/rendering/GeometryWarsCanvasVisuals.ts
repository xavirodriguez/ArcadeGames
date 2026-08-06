import { ShapeDrawer, TransformComponent } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";

/**
 * Shape drawer for the Geometry Wars player ship (neon diamond/arrow).
 * @public
 */
export const drawPlayerShip: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const transform = world.getComponent(entity, "Transform") as TransformComponent;
    if (!transform) return;

    const size = render.size ?? 16;
    const color = render.color ?? "#00f0ff";

    ctx.save();
    // Move to world location (the renderer rotates and moves the context to worldX, worldY, worldRotation automatically before calling draw, or we can use local coords. In Tiny Aster, standard Renderer handles global rotation/scale if configured, let's draw centered at (0,0))
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    // Draw arrow/diamond shape
    ctx.beginPath();
    ctx.moveTo(size, 0); // Nose pointing right (0 degrees is along +X)
    ctx.lineTo(-size / 2, -size / 2);
    ctx.lineTo(-size / 4, 0);
    ctx.lineTo(-size / 2, size / 2);
    ctx.closePath();
    ctx.stroke();

    // Hot inner core
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(size * 0.4, 0);
    ctx.lineTo(-size * 0.2, -size * 0.2);
    ctx.lineTo(-size * 0.1, 0);
    ctx.lineTo(-size * 0.2, size * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
};

/**
 * Shape drawer for Particle (glow square).
 * @public
 */
export const drawParticle: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 3;
    const color = render.color ?? "#ffffff";

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
};

/**
 * Shape drawer for Chaser enemy (magenta diamond).
 * @public
 */
export const drawChaser: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 14;
    const color = render.color ?? "#ff00ff";

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for Evader enemy (orange triangle / star).
 * @public
 */
export const drawEvader: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 14;
    const color = render.color ?? "#ffaa00";

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size / 2, -size / 2);
    ctx.lineTo(-size / 2, size / 2);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for Grunt enemy (cyan small triangle).
 * @public
 */
export const drawGrunt: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 10;
    const color = render.color ?? "#00ffff";

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, -size * 0.7);
    ctx.lineTo(-size, size * 0.7);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for bullets.
 * @public
 */
export const drawBullet: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 4;
    const color = render.color ?? "#ffff00";

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    // Draw a small bright laser line
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();

    ctx.restore();
  }
};
