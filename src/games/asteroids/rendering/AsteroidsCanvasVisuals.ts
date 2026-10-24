import { ShapeDrawer, SHIP_FORWARD_AXIS, THEME_RESOURCE_KEY, Theme, resolveThemeColorWithFallback, World } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { drawNeonShape } from "../../shared/rendering/CanvasNeonUtils";
import { colors } from "../../../theme/colors";
import { computeAsteroidSilhouette, computeThrustFlame } from "../../shared/rendering/ProceduralShapeUtils";
import { resolveHitFlash, resolveInvulnerabilityPulse, resolveAsteroidHitFlash } from "../../shared/rendering/RenderUtils";
import { drawFromGeometryProfileCanvas } from "../../shared/rendering/GenericEntityDrawer";
import { resolveAsteroidSaucerSetup, resolveAsteroidDrawSetup, resolvePlayerShipSetup, resolveCustomMotionData } from "./AsteroidsVisualHelpers";

function applyAsteroidHitFlashStroke(
  ctx: CanvasRenderingContext2D,
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
  render: any,
  defaultColor: string,
  lineWidth = 2
): { color: string; isHitFlashing: boolean } {
  const { opacity, colorStr, isHitFlashing } = resolveAsteroidHitFlash(render, defaultColor);
  if (isHitFlashing) {
    ctx.globalAlpha = opacity;
  }
  ctx.strokeStyle = colorStr;
  const hitFlashColor = resolveThemeColorWithFallback(world, colors.white, "hitFlash");
  ctx.shadowColor = isHitFlashing ? hitFlashColor : colorStr;
  ctx.shadowBlur = isHitFlashing ? 20 : 10;
  ctx.lineWidth = lineWidth;
  return { color: colorStr, isHitFlashing };
}

/**
 * Procedural player ship shape drawer for HTML5 Canvas.
 * Supports Concept Pack parametric geometry override if available in active Theme.
 */
export const drawAsteroidsPlayerShip: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    const setup = resolvePlayerShipSetup(world, world.getComponent(entity, "Render"), entity);
    if (!setup) return;

    const { render, customGeom, size, tick, isThrusting } = setup;
    let baseColor = render.color || resolveThemeColorWithFallback(world, colors.cyan, "player-ship", "player", "primary");

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

    const hitFlashColor = resolveThemeColorWithFallback(world, colors.white, "hitFlash");

    if (customGeom) {
      // Data-driven Concept Pack geometry rendering
      const motionData = resolveCustomMotionData(customGeom, isThrusting, size, tick, world.renderRandom);
      if (motionData) {
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
        hitFlashColor,
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
      const thrustFlameColor = resolveThemeColorWithFallback(world, colors.orangeDark, "thrustFlame", "accent");
      const sparkColor = resolveThemeColorWithFallback(world, colors.gold, "spark", "secondary");

      ctx.strokeStyle = thrustFlameColor;
      ctx.fillStyle = sparkColor;
      ctx.shadowColor = thrustFlameColor;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(-size * 0.4, -size * 0.4);
      ctx.lineTo(-(size * 0.4 + flameLen), 0);
      ctx.lineTo(-size * 0.4, size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = resolveThemeColorWithFallback(world, colors.white, "spark", "primary");
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
      isHitFlashing ? resolveThemeColorWithFallback(world, colors.overlay, "overlay") : resolveThemeColorWithFallback(world, colors.border, "border"),
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
      ctx.strokeStyle = hitFlashColor;
      ctx.shadowColor = hitFlashColor;
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
    const setup = resolveAsteroidSaucerSetup(world.getComponent(entity, "Render"), resolveThemeColorWithFallback(world, colors.cyan, "ufo", "enemy"));
    if (!setup) return;

    const { render, radius, baseColor } = setup;

    ctx.save();

    const { isHitFlashing } = applyAsteroidHitFlashStroke(ctx, world, render, baseColor, 2);

    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = isHitFlashing ? resolveThemeColorWithFallback(world, colors.overlay, "overlay") : resolveThemeColorWithFallback(world, colors.border, "border");
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
    const setup = resolveAsteroidDrawSetup(world, world.getComponent(entity, "Render"), entity);
    if (!setup) return;

    const { render, radius, customGeom } = setup;

    const baseColor = render.color || resolveThemeColorWithFallback(world, colors.pink, "asteroid", "enemy");
    ctx.save();

    const { isHitFlashing } = applyAsteroidHitFlashStroke(ctx, world, render, baseColor, 2);

    if (customGeom) {
      drawFromGeometryProfileCanvas(ctx, customGeom, {
        size: radius * 2,
        baseColor,
        isHitFlashing,
        hitFlashColor: resolveThemeColorWithFallback(world, colors.white, "hitFlash"),
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

    ctx.fillStyle = isHitFlashing ? resolveThemeColorWithFallback(world, colors.overlay, "overlay") : resolveThemeColorWithFallback(world, colors.border, "border");
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
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const customGeom = theme?.visualTheme?.shapeTokens?.projectileGeometry;

    const size = render.size || 2;
    const color = render.color || resolveThemeColorWithFallback(world, colors.green, "bullet", "player-bullet");

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
    ctx.strokeStyle = resolveThemeColorWithFallback(world, colors.white, "bulletCore", "bullet");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.stroke();

    ctx.restore();
  }
};
