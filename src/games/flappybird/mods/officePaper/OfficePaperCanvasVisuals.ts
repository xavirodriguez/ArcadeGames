import { ShapeDrawer, EffectDrawer, World, THEME_RESOURCE_KEY, Theme } from "@tiny-aster/core";
import { FlappyBirdComponentRegistry } from "../../types/FlappyBirdTypes";
import {
  FLAPPY_PARTICLE_POOL,
  updateVisualParticles,
} from "../../rendering/FlappyBirdParticles";
import {
  resolveFlappyBirdDrawContext,
  resolveFlappyPipeDrawContext,
  resolveFlappyBackgroundSetup
} from "../../rendering/FlappyBirdRenderUtils";
import {
  drawCanvasGlideEnergyBar,
  drawCanvasVisualParticles
} from "../../rendering/FlappyBirdCanvasVisuals";
import { colors } from "../../../../theme/colors";
import { hexToRgba } from "../../../shared/rendering/CosmicPalette";

const canvasGradientCache = new Map<string, CanvasGradient>();
let lastCanvasCtx: CanvasRenderingContext2D | null = null;

function getCachedCanvasGradient(
  ctx: CanvasRenderingContext2D,
  key: string,
  factory: () => CanvasGradient
): CanvasGradient {
  if (lastCanvasCtx !== ctx) {
    lastCanvasCtx = ctx;
    canvasGradientCache.clear();
  }
  let grad = canvasGradientCache.get(key);
  if (!grad) {
    if (canvasGradientCache.size > 40) {
      canvasGradientCache.clear();
    }
    grad = factory();
    canvasGradientCache.set(key, grad);
  }
  return grad;
}

function drawPaperAirplaneDetails(ctx: CanvasRenderingContext2D, size: number, theme?: Theme) {
  const primaryColor = theme?.colorMap?.primary || "#FFFFFF";
  const accentColor = theme?.colorMap?.accent || "#475569";

  // Left wing top fold
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.moveTo(size * 1.3, 0);
  ctx.lineTo(-size * 0.9, -size * 0.8);
  ctx.lineTo(-size * 0.4, 0);
  ctx.closePath();
  ctx.fill();

  // Right wing under shadow
  ctx.fillStyle = "#E2E8F0";
  ctx.beginPath();
  ctx.moveTo(size * 1.3, 0);
  ctx.lineTo(-size * 0.4, 0);
  ctx.lineTo(-size * 0.9, size * 0.8);
  ctx.closePath();
  ctx.fill();

  // Center crease shadow line
  ctx.fillStyle = "#94A3B8";
  ctx.beginPath();
  ctx.moveTo(size * 1.3, 0);
  ctx.lineTo(-size * 0.4, 0);
  ctx.lineTo(-size * 0.6, -size * 0.15);
  ctx.closePath();
  ctx.fill();

  // Crisp outline
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(size * 1.3, 0);
  ctx.lineTo(-size * 0.9, -size * 0.8);
  ctx.lineTo(-size * 0.4, 0);
  ctx.lineTo(-size * 0.9, size * 0.8);
  ctx.closePath();
  ctx.stroke();

  // Center fold line
  ctx.beginPath();
  ctx.moveTo(size * 1.3, 0);
  ctx.lineTo(-size * 0.4, 0);
  ctx.stroke();
}

/**
 * Paper Airplane shape drawer for Office Paper Theme (Canvas2D).
 */
export const drawOfficePaperBird: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveFlappyBirdDrawContext(world, entity, FLAPPY_PARTICLE_POOL);
    if (!drawCtx) return;

    const {
      birdComp,
      transform,
      size,
      isAlive,
      globalOpacity,
      angleRad,
      scaleX,
      scaleY,
    } = drawCtx;

    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);

    ctx.save();
    ctx.globalAlpha = globalOpacity;

    ctx.rotate(angleRad);
    ctx.scale(scaleX, scaleY);

    if (isAlive) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-size * 0.5, -size * 0.2);
      ctx.lineTo(-size * 1.6, -size * 0.2);
      ctx.moveTo(-size * 0.5, size * 0.2);
      ctx.lineTo(-size * 1.6, size * 0.2);
      ctx.stroke();
      ctx.restore();
    }

    drawPaperAirplaneDetails(ctx, size, theme);
    ctx.restore();

    if (birdComp.nearMissTimer > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const alphaVal = birdComp.nearMissTimer / 0.3;
      ctx.fillStyle = hexToRgba("#FFFFFF", alphaVal);
      ctx.font = "bold 13px 'Share Tech Mono', monospace";
      ctx.textAlign = "center";
      const floatY = (0.3 - birdComp.nearMissTimer) * 40;
      ctx.fillText("NEAR_MISS +50", transform.x, transform.y - 35 - floatY);
      ctx.restore();
    }
  }
};

/**
 * Office Stapler Pipe shape drawer for Office Paper Theme (Canvas2D).
 */
export const drawOfficePaperPipe: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const pipeCtx = resolveFlappyPipeDrawContext(world, entity);
    if (!pipeCtx) return;

    const { width, halfWidth, capHeight, capWidth, capHalfWidth, pipeY, pipeHeight, capYOffset } = pipeCtx;
    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const pipeToken = theme?.colorMap?.pipe || "#475569";

    const pillarGrad = getCachedCanvasGradient(ctx, `office_pillar_${halfWidth}_${pipeToken}`, () => {
      const g = ctx.createLinearGradient(-halfWidth, 0, halfWidth, 0);
      g.addColorStop(0, "#334155");
      g.addColorStop(0.5, pipeToken);
      g.addColorStop(1.0, "#1E293B");
      return g;
    });

    ctx.fillStyle = pillarGrad;
    ctx.fillRect(-halfWidth, pipeY, width, pipeHeight);

    ctx.strokeStyle = "#64748B";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-halfWidth, pipeY, width, pipeHeight);

    const collarGrad = getCachedCanvasGradient(ctx, `office_collar_${capHalfWidth}`, () => {
      const g = ctx.createLinearGradient(-capHalfWidth, 0, capHalfWidth, 0);
      g.addColorStop(0, "#64748B");
      g.addColorStop(0.5, "#CBD5E1");
      g.addColorStop(1.0, "#475569");
      return g;
    });

    ctx.fillStyle = collarGrad;
    ctx.fillRect(-capHalfWidth, capYOffset, capWidth, capHeight);
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-capHalfWidth, capYOffset, capWidth, capHeight);

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(-capHalfWidth + 12, capYOffset + capHeight * 0.4, capWidth - 24, 3);
  }
};

/**
 * Office Wooden Desk Ground shape drawer for Office Paper Theme (Canvas2D).
 */
export const drawOfficePaperGround: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 400 } = render;
    const width = size;
    const height = 40;
    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const groundToken = theme?.colorMap?.ground || "#B45309";
    const secondaryToken = theme?.colorMap?.secondary || "#D97706";

    const deskGrad = getCachedCanvasGradient(ctx, `office_desk_${height}_${groundToken}`, () => {
      const g = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
      g.addColorStop(0, secondaryToken);
      g.addColorStop(0.3, groundToken);
      g.addColorStop(1.0, "#78350F");
      return g;
    });
    ctx.fillStyle = deskGrad;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(-width / 2, -height / 2, width, 3);

    ctx.strokeStyle = "#451A03";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-width / 2, -height / 2);
    ctx.lineTo(width / 2, -height / 2);
    ctx.stroke();
  }
};

/**
 * Office Ambient Room Background effect for Office Paper Theme (Canvas2D).
 */
export const scrollingOfficePaperBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world) {
    const bgSetup = resolveFlappyBackgroundSetup(world);
    if (!bgSetup) return;

    const { width, height } = bgSetup;

    updateVisualParticles();

    const bgGrad = getCachedCanvasGradient(ctx, `office_bg_${width}_${height}`, () => {
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, "#0F172A");
      g.addColorStop(0.6, "#1E293B");
      g.addColorStop(1.0, "#090D16");
      return g;
    });
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1.0;
    const gridOffset = (world.tick * 0.5) % 20;

    for (let gx = -20 + gridOffset; gx < width + 20; gx += 20) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let gy = 0; gy < height; gy += 20) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
    ctx.restore();

    drawCanvasVisualParticles(ctx);

    drawCanvasGlideEnergyBar(ctx, world, width, height);
  }
};
