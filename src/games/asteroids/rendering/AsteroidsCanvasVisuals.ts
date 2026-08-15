import { ShapeDrawer, ShapeType, CircleShape } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { drawNeonShape } from "../../shared/rendering/CanvasNeonUtils";
import { colors } from "../../../theme/colors";

/**
 * Procedural player ship shape drawer for HTML5 Canvas.
 * Renders a glowing, sleek retro spacecraft with neon effects and animated thruster plumes.
 */
export const drawAsteroidsPlayerShip: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 15;
    let baseColor = render.color || colors.cyan;
    const tick = Math.floor(Date.now() / 40);

    ctx.save();

    // Hit Flash Transparency Pulse & Glow (R11)
    const isHitFlashing = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;
    if (isHitFlashing) {
      if ((render.hitFlashFrames! >> 1) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      baseColor = colors.white;
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

    // Thrust check & breathing glow (R8)
    const input = world.getComponent(entity, "Input");
    const isThrusting = Boolean(input && input.actions && input.actions["thrust"]);
    const breath = isThrusting ? 1.0 : (0.85 + 0.15 * Math.sin(tick / 15));

    // Draw Thrust Flame if thrust is active
    if (isThrusting) {
      const renderRandom = world.renderRandom;
      const flicker = 1.0 + 0.3 * (renderRandom.next() - 0.5);
      const flameLen = size * 1.5 * flicker;

      ctx.strokeStyle = colors.orangeDark;
      ctx.fillStyle = colors.gold;
      ctx.shadowColor = colors.orangeDark;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(-size * 0.4, -size * 0.4);
      ctx.lineTo(-(size * 0.4 + flameLen), 0);
      ctx.lineTo(-size * 0.4, size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Neon Ship Body via drawNeonShape pattern (R7 & R11)
    drawNeonShape(
      ctx,
      tick,
      baseColor,
      isHitFlashing ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 240, 255, 0.15)",
      (c, widthScale) => {
        const s = size * breath * widthScale;
        c.moveTo(s, 0); // Nose pointing RIGHT (+X)
        c.lineTo(-s * 0.7, s * 0.7); // Right back
        c.lineTo(-s * 0.5, s * 0.3); // Center back indent
        c.lineTo(-s * 0.5, -s * 0.3); // Center back indent
        c.lineTo(-s * 0.7, -s * 0.7); // Left back
        c.closePath();
      },
      (c) => {
        const s = size * breath;
        c.moveTo(s * 0.3, 0);
        c.lineTo(-s * 0.3, s * 0.3);
        c.lineTo(-s * 0.3, -s * 0.3);
        c.closePath();
      }
    );

    // Apply intense white hit flash glow if hit flashing (R11)
    if (isHitFlashing) {
      ctx.strokeStyle = colors.white;
      ctx.shadowColor = colors.white;
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const s = size * breath;
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.7, s * 0.7);
      ctx.lineTo(-s * 0.5, s * 0.3);
      ctx.lineTo(-s * 0.5, -s * 0.3);
      ctx.lineTo(-s * 0.7, -s * 0.7);
      ctx.closePath();
      ctx.stroke();
    }

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

    let color = render.color || colors.pink; // Neon pink default (R9)
    ctx.save();

    const isHitFlashing = render.hitFlashFrames !== undefined && render.hitFlashFrames > 0;
    if (isHitFlashing) {
      if ((render.hitFlashFrames! >> 1) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
      color = colors.white;
    }

    ctx.strokeStyle = color;
    ctx.shadowColor = isHitFlashing ? colors.white : color;
    ctx.shadowBlur = isHitFlashing ? 20 : 10;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    // Geometry points based on radius (R12)
    const numPoints = radius > 30 ? 14 : radius > 18 ? 10 : 7;
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

    // Body fill (R9)
    ctx.fillStyle = isHitFlashing ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 0, 85, 0.12)";
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Glowing laser bullet shape drawer for HTML5 Canvas.
 * Creates a high-fidelity bullet with a bright white core and halo (R10).
 */
export const drawAsteroidsBullet: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 2;
    const color = render.color || colors.green; // Glowing laser green
    const length = size * 4;

    ctx.save();

    // Laser outer glow line with halo (R10)
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();

    // White core line for brightness
    ctx.shadowBlur = 0;
    ctx.strokeStyle = colors.white;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();

    ctx.restore();
  }
};
