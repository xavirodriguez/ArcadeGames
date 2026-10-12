import { ShapeDrawer, ShapeType, CircleShape, SHIP_FORWARD_AXIS, THEME_RESOURCE_KEY, Theme } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { drawNeonShape } from "../../shared/rendering/CanvasNeonUtils";
import { colors } from "../../../theme/colors";
import { computeAsteroidSilhouette, computeThrustFlame, computeMotionSecondaryEffect } from "../../shared/rendering/ProceduralShapeUtils";
import { resolveHitFlash, resolveInvulnerabilityPulse, resolveAsteroidHitFlash } from "../../shared/rendering/RenderUtils";
import { drawFromGeometryProfileCanvas } from "../../shared/rendering/GenericEntityDrawer";

function applyAsteroidHitFlashStroke(
  ctx: CanvasRenderingContext2D,
  render: any,
  defaultColor: string,
  lineWidth = 2
): { color: string; isHitFlashing: boolean } {
  const { opacity, colorStr, isHitFlashing } = resolveAsteroidHitFlash(render, defaultColor);
  if (isHitFlashing) {
    ctx.globalAlpha = opacity;
  }
  ctx.strokeStyle = colorStr;
  ctx.shadowColor = isHitFlashing ? colors.white : colorStr;
  ctx.shadowBlur = isHitFlashing ? 20 : 10;
  ctx.lineWidth = lineWidth;
  return { color: colorStr, isHitFlashing };
}

/**
 * Procedural player ship shape drawer for HTML5 Canvas.
 * Supports Concept Pack parametric geometry override if available in active Theme.
 */
// TODO(refactor): código duplicado detectado (bloque) con asteroids/rendering/AsteroidsCanvasVisuals.ts:259-265. Considerar extraer a función compartida. Ref: 42774506
export const drawAsteroidsPlayerShip: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const customGeom = theme?.visualTheme?.shapeTokens?.playerGeometry;

    const size = render.size || 15;
    let baseColor = render.color || colors.cyan;
    const tick = Math.floor((world.tick * 5) / 12);

    ctx.save();

    // Hit Flash Transparency Pulse & Glow (R11)
    const flashState = resolveHitFlash(render, baseColor, 1.0);
    const isHitFlashing = flashState.isFlashing;
    if (isHitFlashing) {
      ctx.globalAlpha = flashState.opacity;
      baseColor = flashState.color;
    }

    // Invulnerability Pulse
    if (world.hasComponent(entity, "Invulnerable")) {
      const inv = world.getComponent(entity, "Invulnerable");
      const invState = resolveInvulnerabilityPulse(inv?.remaining, ctx.globalAlpha, { mode: "time" });
      if (invState.isInvulnerable) {
        ctx.globalAlpha = invState.opacity;
      }
    }

    const input = world.getComponent(entity, "Input");
    const isThrusting = Boolean(input && input.actions && input.actions["thrust"]);

    if (customGeom) {
      // Data-driven Concept Pack geometry rendering
      const motionEffect = customGeom.motionEffect || "flame";
      if (isThrusting && motionEffect !== "none") {
        const motionData = computeMotionSecondaryEffect(motionEffect, size, tick, world.renderRandom);
        for (let i = 0; i < motionData.particles.length; i++) {
          const p = motionData.particles[i];
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.offsetX, p.offsetY, Math.max(0.5, p.radius), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      drawFromGeometryProfileCanvas(ctx, customGeom, {
        size,
        baseColor,
        isHitFlashing,
        hitFlashColor: colors.white,
        isThrusting,
        tick,
      });

      ctx.restore();
      return;
    }

    // Fallback default Asteroids ship rendering
    const breath = isThrusting ? 1.0 : (0.85 + 0.15 * Math.sin(tick / 15));

    if (isThrusting) {
      const { flameLen, sparks } = computeThrustFlame(size, world.renderRandom);

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

      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < sparks.length; i++) {
        const { sparkOffset, sparkY, sparkRadius } = sparks[i];
        ctx.beginPath();
        ctx.arc(-(size * 0.4 + sparkOffset), sparkY, sparkRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawNeonShape(
      ctx,
      tick,
      baseColor,
      isHitFlashing ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 240, 255, 0.15)",
      (c, widthScale) => {
        const s = size * breath * widthScale;
        c.moveTo(s * SHIP_FORWARD_AXIS.x, s * SHIP_FORWARD_AXIS.y);
        c.lineTo(-s * 0.7, s * 0.7);
        c.lineTo(-s * 0.5, s * 0.3);
        c.lineTo(-s * 0.5, -s * 0.3);
        c.lineTo(-s * 0.7, -s * 0.7);
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

    if (isHitFlashing) {
      ctx.strokeStyle = colors.white;
      ctx.shadowColor = colors.white;
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const s = size * breath;
      ctx.moveTo(s * SHIP_FORWARD_AXIS.x, s * SHIP_FORWARD_AXIS.y);
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
 * Procedural retro saucer UFO shape drawer for HTML5 Canvas.
 */
export const drawAsteroidsUfo: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 36;
    const radius = size / 2;
    const baseColor = render.color || colors.cyan;

    ctx.save();

    const { isHitFlashing } = applyAsteroidHitFlashStroke(ctx, render, baseColor, 2);

    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = isHitFlashing ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 240, 255, 0.15)";
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -radius * 0.2, radius * 0.45, Math.PI, 0);
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Procedural detailed jagged Asteroid Shape Drawer for HTML5 Canvas.
 * Supports Concept Pack parametric enemy geometry override if available in active Theme.
 */
export const drawAsteroidsAsteroid: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
        // TODO(refactor): código duplicado detectado (bloque) con asteroids/rendering/AsteroidsSkiaVisuals.ts:198-210. Considerar extraer a función compartida. Ref: b4b40449
const render = world.getComponent(entity, "Render");
    const collider = world.getComponent(entity, "Collider");
    if (!render) return;

    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const customGeom = theme?.visualTheme?.shapeTokens?.enemyGeometry;

    let radius = 25;
    if (collider && collider.enabled && collider.shape.type === ShapeType.Circle) {
      radius = (collider.shape as CircleShape).radius;
    } else if (render.size) {
      radius = render.size / 2;
    }

    const baseColor = render.color || colors.pink;
    ctx.save();

    const { isHitFlashing } = applyAsteroidHitFlashStroke(ctx, render, baseColor, 2);

    if (customGeom) {
      drawFromGeometryProfileCanvas(ctx, customGeom, {
        size: radius * 2,
        baseColor,
        isHitFlashing,
        hitFlashColor: colors.white,
      });
      ctx.restore();
      return;
    }

    ctx.lineJoin = "round";

    const numPoints = radius > 30 ? 14 : radius > 18 ? 10 : 7;
    const points = computeAsteroidSilhouette(entity, radius, numPoints);

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        ctx.moveTo(points[i].x, points[i].y);
      } else {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.closePath();

    ctx.fillStyle = isHitFlashing ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 0, 85, 0.12)";
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Glowing laser bullet shape drawer for HTML5 Canvas.
 * Supports Concept Pack parametric projectile geometry override if available in active Theme.
 */
export const drawAsteroidsBullet: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
    // TODO(refactor): código duplicado detectado (método) con space-invaders/rendering/SpaceInvadersCanvasVisuals.ts:431-438. Considerar extraer a función compartida. Ref: 367245d7
draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const customGeom = theme?.visualTheme?.shapeTokens?.projectileGeometry;

    const size = render.size || 2;
    const color = render.color || colors.green;

    ctx.save();

    if (customGeom) {
      drawFromGeometryProfileCanvas(ctx, customGeom, {
        size: size * 4,
        baseColor: color,
      });
      ctx.restore();
      return;
    }

    const length = size * 4;

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();

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
