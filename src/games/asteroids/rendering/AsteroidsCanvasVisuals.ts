import { ShapeDrawer, World, ShapeType, CircleShape, ColliderComponent, RenderComponent } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";

/**
 * Procedural player ship shape drawer for HTML5 Canvas.
 * Renders a glowing, sleek retro spacecraft with animated thruster plumes.
 */
export const drawAsteroidsPlayerShip: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 15;
    let color = render.color || "#00f0ff"; // Glowing cyan default

    ctx.save();

    // Hit Flash Transparency Pulse
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if ((render.hitFlashFrames >> 1) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = "#ffffff";
    }

    // Invulnerability Pulse
    const hasInvulnerable = world.hasComponent(entity, "Invulnerable" as any);
    if (hasInvulnerable) {
      const inv = world.getComponent(entity, "Invulnerable" as any) as { remaining: number } | undefined;
      if (inv && inv.remaining > 0) {
        const pulse = Math.floor(inv.remaining * 10) % 2;
        if (pulse === 0) {
          ctx.globalAlpha = 0.3;
        }
      }
    }

    // Draw Thrust Flame if thrust is active
    const input = world.getComponent(entity, "Input");
    if (input && input.actions && input.actions["thrust"]) {
      const renderRandom = world.renderRandom;
      const flicker = 1.0 + 0.3 * (renderRandom.next() - 0.5);
      const flameLen = size * 1.5 * flicker;

      ctx.strokeStyle = "#ff4500"; // Neon orange
      ctx.fillStyle = "#ffcc00"; // Neon yellow core
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(-size * 0.4, -size * 0.4);
      ctx.lineTo(-(size * 0.4 + flameLen), 0);
      ctx.lineTo(-size * 0.4, size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Draw Main Ship Body (sleek triangle with inner lines)
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(size, 0); // Nose pointing RIGHT (+X)
    ctx.lineTo(-size * 0.7, size * 0.7); // Right back
    ctx.lineTo(-size * 0.5, size * 0.3); // Center back indent
    ctx.lineTo(-size * 0.5, -size * 0.3); // Center back indent
    ctx.lineTo(-size * 0.7, -size * 0.7); // Left back
    ctx.closePath();
    ctx.stroke();

    // Inner detail (cockpit line)
    ctx.beginPath();
    ctx.moveTo(size * 0.3, 0);
    ctx.lineTo(-size * 0.3, size * 0.3);
    ctx.lineTo(-size * 0.3, -size * 0.3);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Procedural detailed jagged Asteroid Shape Drawer for HTML5 Canvas.
 * Renders jagged rock forms with zero allocation per frame (inline deterministic LCG).
 */
export const drawAsteroidsAsteroid: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    const collider = world.getComponent(entity, "Collider");
    if (!render) return;

    let radius = 25;
    if (collider && collider.enabled && collider.shape.type === ShapeType.Circle) {
      radius = (collider.shape as CircleShape).radius;
    } else if (render.size) {
      radius = render.size / 2;
    }

    let color = render.color || "#ff66cc"; // Neon pink default
    ctx.save();

    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if ((render.hitFlashFrames >> 1) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = "#ffffff";
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    const numPoints = 11;
    // Inline high-speed LCG state (0 function allocations!)
    let s = entity + 45000;

    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;

      // Deterministic inline LCG
      s = (s * 1664525 + 1013904223) % 4294967296;
      const rngValue = s / 4294967296;

      const offsetFactor = rngValue * 0.35 - 0.175; // up to 35% radius variance
      const currentRadius = radius * (1.0 + offsetFactor);
      const x = Math.cos(angle) * currentRadius;
      const y = Math.sin(angle) * currentRadius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Glowing laser bullet shape drawer for HTML5 Canvas.
 * Creates a high-fidelity bullet with a bright white core.
 */
export const drawAsteroidsBullet: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 2;
    const color = render.color || "#00ff66"; // Glowing laser green
    const length = size * 4;

    ctx.save();

    // Laser glow line (aligned to +X direction/horizontally)
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();

    // White core line for brightness
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();

    ctx.restore();
  }
};
