import { EffectDrawer, ShapeDrawer, ShapeType, CircleShape, SHIP_FORWARD_AXIS } from "@tiny-aster/core";
import { ActiveMissionState } from "../../shared/missions/MissionTypes";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { drawNeonShape } from "../../shared/rendering/CanvasNeonUtils";
import { colors } from "../../../theme/colors";
import { computeAsteroidSilhouette, computeThrustFlame } from "../../shared/rendering/ProceduralShapeUtils";
import { resolveHitFlash, resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";

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

    // Thrust check & breathing glow (R8)
    const input = world.getComponent(entity, "Input");
    const isThrusting = Boolean(input && input.actions && input.actions["thrust"]);
    const breath = isThrusting ? 1.0 : (0.85 + 0.15 * Math.sin(tick / 15));

    // Draw Thrust Flame if thrust is active
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

      // Lingering Hot Plasma Exhaust Sparks
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < sparks.length; i++) {
        const { sparkOffset, sparkY, sparkRadius } = sparks[i];
        ctx.beginPath();
        ctx.arc(-(size * 0.4 + sparkOffset), sparkY, sparkRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Neon Ship Body via drawNeonShape pattern (R7 & R11)
    drawNeonShape(
      ctx,
      tick,
      baseColor,
      isHitFlashing ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 240, 255, 0.15)",
      (c, widthScale) => {
        const s = size * breath * widthScale;
        // Ship nose points along SHIP_FORWARD_AXIS (+X, 0)
        c.moveTo(s * SHIP_FORWARD_AXIS.x, s * SHIP_FORWARD_AXIS.y);
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
<<<<<<< HEAD
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

    const flashState = resolveHitFlash(render, baseColor, 1.0);
    const isHitFlashing = flashState.isFlashing;
    let color = baseColor;
    if (isHitFlashing) {
      ctx.globalAlpha = flashState.opacity;
      color = flashState.color;
    }

    ctx.strokeStyle = color;
    ctx.shadowColor = isHitFlashing ? colors.white : color;
    ctx.shadowBlur = isHitFlashing ? 20 : 10;
    ctx.lineWidth = 2;

    // Draw main saucer body
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = isHitFlashing ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 240, 255, 0.15)";
    ctx.fill();
    ctx.stroke();

    // Draw top dome
    ctx.beginPath();
    ctx.arc(0, -radius * 0.2, radius * 0.45, Math.PI, 0);
    ctx.stroke();
=======
 * Overlay shape drawer for Canvas2D Mission HUD.
 */
export const drawAsteroidsMissionHUD: EffectDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world) {
    const activeMission = world.getResource<ActiveMissionState>("ActiveMission");
    if (!activeMission) return;

    ctx.save();
    const x = 20;
    const y = 80;
    const width = 280;
    const height = 48;

    ctx.fillStyle = "rgba(10, 14, 39, 0.85)";
    ctx.fillRect(x, y, width, height);

    let statusColor = "#00D9FF";
    let statusText = `🎯 ${activeMission.title.toUpperCase()}`;

    if (activeMission.completed) {
      statusColor = "#00FF41";
      statusText = `★ ${activeMission.title.toUpperCase()} (COMPLETADA)`;
    } else if (activeMission.failed) {
      statusColor = "#FF4444";
      statusText = `✕ ${activeMission.title.toUpperCase()} (FALLIDA)`;
    }

    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, width, height);

    ctx.font = "bold 12px monospace";
    ctx.fillStyle = statusColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.shadowColor = statusColor;
    ctx.shadowBlur = 6;
    ctx.fillText(statusText, x + 8, y + 6);

    ctx.font = "11px monospace";
    ctx.fillStyle = "#E8E8E8";
    ctx.shadowBlur = 0;

    let progressStr = `${activeMission.currentCount} / ${activeMission.targetCount}`;
    if (activeMission.targetTimer > 0) {
      progressStr = `${activeMission.currentTimer.toFixed(1)}s / ${activeMission.targetTimer}s`;
    }
    ctx.fillText(progressStr, x + 8, y + 26);

    const barX = x + 130;
    const barY = y + 28;
    const barW = width - 140;
    const barH = 8;
    const ratio = activeMission.targetCount > 0
      ? Math.min(1, Math.max(0, activeMission.currentCount / activeMission.targetCount))
      : activeMission.targetTimer > 0
      ? Math.min(1, Math.max(0, (activeMission.targetTimer - activeMission.currentTimer) / activeMission.targetTimer))
      : 0;

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = statusColor;
    ctx.fillRect(barX, barY, barW * ratio, barH);
>>>>>>> origin/master

    ctx.restore();
  }
};

/**
 * Procedural detailed jagged Asteroid Shape Drawer for HTML5 Canvas.
 * Renders jagged rock forms with zero allocation per frame (inline deterministic LCG).
 */
export const drawAsteroidsAsteroid: ShapeDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = {
  draw(ctx, world, entity) {
    // TODO(refactor): código duplicado detectado (bloque) con asteroids/rendering/AsteroidsSkiaVisuals.ts:139-150. Considerar extraer a función compartida. Ref: 02c1f5f2
    const render = world.getComponent(entity, "Render");
    const collider = world.getComponent(entity, "Collider");
    if (!render) return;

    let radius = 25;
    if (collider && collider.enabled && collider.shape.type === ShapeType.Circle) {
      radius = (collider.shape as CircleShape).radius;
    } else if (render.size) {
      radius = render.size / 2;
    }

    // TODO(refactor): código duplicado detectado (bloque) con asteroids/rendering/AsteroidsCanvasVisuals.ts:19-28. Considerar extraer a función compartida. Ref: 8e471d6c
    let baseColor = render.color || colors.pink; // Neon pink default (R9)
    ctx.save();

    const flashState = resolveHitFlash(render, baseColor, 1.0);
    const isHitFlashing = flashState.isFlashing;
    let color = baseColor;
    if (isHitFlashing) {
      ctx.globalAlpha = flashState.opacity;
      color = flashState.color;
    }

    ctx.strokeStyle = color;
    ctx.shadowColor = isHitFlashing ? colors.white : color;
    ctx.shadowBlur = isHitFlashing ? 20 : 10;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    // Geometry points based on radius (R12)
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
