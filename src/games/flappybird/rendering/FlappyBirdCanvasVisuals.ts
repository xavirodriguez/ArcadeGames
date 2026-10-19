import { ShapeDrawer, EffectDrawer, THEME_RESOURCE_KEY, Theme, World } from "@tiny-aster/core";
import { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";
import { computeFlappyThrusterFlame } from "../../shared/rendering/ProceduralShapeUtils";
import {
  StarfieldStar,
  generateStarfield
} from "../../shared/rendering/geometry";
import {
  calculateWarpFactor,
  calculateMegastructureData,
  calculateGroundHazardFlicker,
  calculateScenarioTransitionOverlay,
  MegastructureData
} from "./FlappyBirdBackgroundData";
import {
  FLAPPY_PARTICLE_POOL,
  spawnVisualParticle,
  updateVisualParticles,
  resolveFlappyParticleData
} from "./FlappyBirdParticles";
import {
  resolveFlappyBirdDrawContext,
  resolveFlappyPipeDrawContext,
  maybeSpawnBackgroundDebris,
  resolveGlideEnergyState,
  resolveSectorEventInfo,
  resolveBackgroundWarpState,
  resolveFlappyBackgroundSetup,
  maybeSpawnLaserGateSparks,
  computeWarpLines,
  computeFlappyNebulaPos,
  resolveFlappyVfxColors
} from "./FlappyBirdRenderUtils";
import { colors } from "../../../theme/colors";
import { hexToRgba } from "../../shared/rendering/CosmicPalette";
import { CanvasGlowCache } from "../../shared/rendering/GlowSystem";

export { FLAPPY_PARTICLE_POOL as FLAPPY_CANVAS_PARTICLE_POOL, spawnVisualParticle };

function isOfficeTheme(world: World<FlappyBirdComponentRegistry>): boolean {
  const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
  const layers = theme?.vfxProfile?.backgroundLayers;
  return Array.isArray(layers) && layers.length === 0;
}

function drawCanvasGlideEnergyBar(
  ctx: CanvasRenderingContext2D,
  world: World<FlappyBirdComponentRegistry>,
  width: number,
  height: number,
  showWarningLabel = false
): void {
  const glideState = resolveGlideEnergyState(world, width, height);
  if (!glideState) return;

  const { ratio, isOverheated, barW, barH, bx, by, fillColor } = glideState;
  ctx.save();
  ctx.fillStyle = hexToRgba(colors.surface, 0.75);
  ctx.fillRect(bx, by, barW, barH);

  ctx.fillStyle = fillColor;
  ctx.fillRect(bx, by, barW * ratio, barH);

  ctx.strokeStyle = isOverheated ? colors.red : colors.slate;
  ctx.lineWidth = 1.0;
  ctx.strokeRect(bx, by, barW, barH);

  if (showWarningLabel && isOverheated) {
    ctx.fillStyle = colors.red;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("THRUST OVERHEAT", width / 2, by - 4);
  }
  ctx.restore();
}

/** Draws active visual particles for Canvas2D renderer. */
function drawCanvasVisualParticles(ctx: CanvasRenderingContext2D): void {
  const particles = FLAPPY_PARTICLE_POOL.getActiveParticles();
  for (let i = 0; i < particles.length; i++) {
    const data = resolveFlappyParticleData(particles[i]);
    if (!data) continue;

    const { type, x, y, size, color, angle, ratio } = data;

    ctx.save();
    ctx.translate(x, y);
    if (angle !== undefined && angle !== 0) {
      ctx.rotate(angle);
    }
    ctx.globalAlpha = ratio;

    if (type === "spark") {
      ctx.fillStyle = color;
      ctx.beginPath();
      const sz = size;
      ctx.moveTo(sz * 0.8, 0);
      ctx.lineTo(0, -sz * 0.2);
      ctx.lineTo(-sz * 0.8, 0);
      ctx.lineTo(0, sz * 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (type === "shard") {
      ctx.fillStyle = colors.slate;
      const sz = size;
      ctx.beginPath();
      ctx.moveTo(sz * 0.4, -sz * 0.3);
      ctx.lineTo(sz * 0.1, sz * 0.4);
      ctx.lineTo(-sz * 0.4, sz * 0.1);
      ctx.lineTo(-sz * 0.2, -sz * 0.3);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = colors.red;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    } else if (type === "star") {
      ctx.fillStyle = color;
      ctx.fillRect(-size / 2, -size / 2, size, size);
    }

    ctx.restore();
  }
}

// Zero-allocation gradient cache for Canvas 2D context operations
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

function drawPaperAirplaneDetails(ctx: CanvasRenderingContext2D, size: number) {
  // Left wing top fold
  ctx.fillStyle = "#FFFFFF";
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
  ctx.strokeStyle = "#334155";
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
 * Player Ship / Paper Airplane shape drawer.
 */
export const drawFlappyBird: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveFlappyBirdDrawContext(world, entity, FLAPPY_PARTICLE_POOL);
    if (!drawCtx) return;

    const {
      render,
      birdComp,
      transform,
      size,
      vy,
      isAlive,
      globalOpacity,
      angleRad,
      scaleX,
      scaleY,
      isDyingGlitch,
      speed,
    } = drawCtx;

    const officeTheme = isOfficeTheme(world);

    ctx.save();
    ctx.globalAlpha = globalOpacity;

    ctx.rotate(angleRad);
    ctx.scale(scaleX, scaleY);

    if (officeTheme) {
      // Paper Airplane Rendering
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

      drawPaperAirplaneDetails(ctx, size);
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
      return;
    }

    // Default Interceptor Rendering
    if (isDyingGlitch) {
      ctx.save();
      ctx.translate(-3, -1);
      ctx.fillStyle = hexToRgba(colors.red, 0.6);
      drawArrowheadPath(ctx, size);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(3, 1);
      ctx.fillStyle = hexToRgba(colors.cyan, 0.6);
      drawArrowheadPath(ctx, size);
      ctx.fill();
      ctx.restore();
    }

    if (isAlive) {
      const warpFactor = calculateWarpFactor(world);
      const trailConfig = world.getResource<{ enabled?: boolean; color?: string; width?: number; lengthMultiplier?: number }>("CosmeticTrailConfig");
      const trailColor = trailConfig?.color || colors.cyan;
      const trailWidth = (trailConfig?.width || 2.0) * warpFactor;
      const lengthMult = (trailConfig?.lengthMultiplier || 1.0) * warpFactor;
      const blurVal = trailConfig?.enabled ? Math.round(12 * warpFactor) : Math.round(8 * warpFactor);
      const trailKey = `flappy_trail_${trailColor}_${trailWidth.toFixed(1)}_${lengthMult.toFixed(1)}_${blurVal}`;

      const trailW = Math.ceil(size * (1.8 * lengthMult) + 40 + blurVal * 2);
      const trailH = Math.ceil(trailWidth + blurVal * 2 + 16);

      const offscreenTrail = CanvasGlowCache.getInstance().getOrCreate(trailKey, trailW, trailH, (offCtx) => {
        offCtx.save();
        offCtx.translate(trailW - blurVal - 5, trailH / 2);
        offCtx.strokeStyle = trailConfig?.enabled ? trailColor : hexToRgba(colors.cyan, 0.35);
        offCtx.lineWidth = trailWidth;
        offCtx.shadowColor = trailColor;
        offCtx.shadowBlur = blurVal;
        offCtx.beginPath();
        offCtx.moveTo(0, 0);
        offCtx.lineTo(-size * (1.8 * lengthMult) - Math.min(speed * 0.1 * lengthMult, 25), 0);
        offCtx.stroke();
        offCtx.restore();
      });

      ctx.save();
      ctx.drawImage(offscreenTrail as CanvasImageSource, -size * 0.55 - (trailW - blurVal - 5), -trailH / 2);
      ctx.restore();
    }

    if (isAlive) {
      const { flameLength, flameWidth } = computeFlappyThrusterFlame(size, vy, world.tick);

      const flameGrad = getCachedCanvasGradient(ctx, `flame_${size}`, () => {
        const g = ctx.createLinearGradient(-size * 0.55, 0, -size * 2.2, 0);
        g.addColorStop(0, colors.white);
        g.addColorStop(0.35, colors.amber);
        g.addColorStop(1.0, colors.red);
        return g;
      });

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-size * 0.55, -flameWidth * 0.5);
      ctx.lineTo(-size * 0.55 - flameLength, 0);
      ctx.lineTo(-size * 0.55, flameWidth * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    const hullGrad = getCachedCanvasGradient(ctx, `hull_${size}_${isAlive}`, () => {
      const g = ctx.createLinearGradient(-size * 0.7, 0, size * 1.2, 0);
      if (isAlive) {
        g.addColorStop(0, colors.slate);
        g.addColorStop(0.5, colors.borderLight);
        g.addColorStop(1.0, colors.neutral);
      } else {
        g.addColorStop(0, colors.borderDark);
        g.addColorStop(0.6, colors.slate);
        g.addColorStop(1.0, colors.surface);
      }
      return g;
    });

    ctx.fillStyle = hullGrad;
    drawArrowheadPath(ctx, size);
    ctx.fill();

    ctx.strokeStyle = colors.surface;
    ctx.lineWidth = 1.2;
    drawArrowheadPath(ctx, size);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(colors.white, 0.25);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(size * 0.8, 0);
    ctx.lineTo(-size * 0.2, 0);
    ctx.stroke();

    ctx.save();
    const cockpitKey = `flappy_cockpit_${size}_${isAlive}`;
    const cockW = Math.ceil(size * 1.5 + 20);
    const cockH = Math.ceil(size * 1.5 + 20);
    const offscreenCockpit = CanvasGlowCache.getInstance().getOrCreate(cockpitKey, cockW, cockH, (offCtx) => {
      offCtx.save();
      offCtx.translate(cockW / 2, cockH / 2);
      offCtx.fillStyle = colors.cyan;
      offCtx.shadowColor = colors.cyan;
      offCtx.shadowBlur = isAlive ? 6 : 0;
      offCtx.beginPath();
      offCtx.ellipse(size * 0.15, -size * 0.05, size * 0.35, size * 0.18, 0, 0, Math.PI * 2);
      offCtx.fill();
      offCtx.restore();
    });
    ctx.drawImage(offscreenCockpit as CanvasImageSource, -cockW / 2, -cockH / 2);
    ctx.restore();

    ctx.strokeStyle = hexToRgba(colors.surface, 0.7);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(size * 0.15, -size * 0.05, size * 0.35, size * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = colors.white;
    ctx.beginPath();
    ctx.arc(size * 0.25, -size * 0.09, size * 0.06, 0, Math.PI * 2);
    ctx.fill();

    if (render.dangerPulseIntensity && render.dangerPulseIntensity > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(world.tick * 0.4);
      const alpha = render.dangerPulseIntensity * pulse;
      const alphaQuant = Math.round(alpha * 10) / 10;
      const pulseKey = `flappy_danger_pulse_${size}_${alphaQuant}`;
      const padding = 24;
      const totalW = size * 2.5 + padding * 2;
      const totalH = size * 2.5 + padding * 2;

      const offscreenPulse = CanvasGlowCache.getInstance().getOrCreate(pulseKey, totalW, totalH, (offCtx) => {
        offCtx.save();
        offCtx.translate(totalW / 2, totalH / 2);
        offCtx.strokeStyle = hexToRgba(colors.red, alphaQuant);
        offCtx.lineWidth = 2.2;
        offCtx.shadowColor = colors.red;
        offCtx.shadowBlur = 12 * alphaQuant;
        drawArrowheadPath(offCtx, size + 2);
        offCtx.stroke();
        offCtx.restore();
      });

      ctx.save();
      ctx.drawImage(offscreenPulse as CanvasImageSource, -totalW / 2, -totalH / 2);
      ctx.restore();
    }

    ctx.restore();

    if (birdComp.nearMissTimer > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const alphaVal = birdComp.nearMissTimer / 0.3;
      ctx.fillStyle = hexToRgba(colors.cyan, alphaVal);
      ctx.shadowColor = colors.cyan;
      ctx.shadowBlur = 10 * alphaVal;
      ctx.font = "bold 13px 'Share Tech Mono', monospace";
      ctx.textAlign = "center";
      const floatY = (0.3 - birdComp.nearMissTimer) * 40;
      ctx.fillText("NEAR_MISS +50", transform.x, transform.y - 35 - floatY);
      ctx.restore();
    }
  }
};

function drawArrowheadPath(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(size * 1.2, 0);
  ctx.lineTo(-size * 0.7, -size * 0.85);
  ctx.lineTo(-size * 0.4, -size * 0.35);
  ctx.lineTo(-size * 0.55, 0);
  ctx.lineTo(-size * 0.4, size * 0.35);
  ctx.lineTo(-size * 0.7, size * 0.85);
  ctx.closePath();
}

function applyPipeGradientStops(
  g: CanvasGradient,
  variant: string,
  [s1, s2, s3]: [number, number, number]
): void {
  const isRusted = variant === "rusted";
  g.addColorStop(0, colors.surface);
  g.addColorStop(s1, colors.borderDark);
  g.addColorStop(s2, isRusted ? colors.orange : colors.slate);
  g.addColorStop(s3, colors.borderDark);
  g.addColorStop(1.0, isRusted ? colors.surface : colors.backgroundDark);
}

/**
 * Containment Towers / Office Staplers Shape Drawer.
 */
export const drawFlappyPipe: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const pipeCtx = resolveFlappyPipeDrawContext(world, entity);
    if (!pipeCtx) return;

    const { pos, pipe, width, halfWidth, variant, capHeight, capWidth, capHalfWidth, beaconPulse, isTopPipe, pipeY, pipeHeight, capYOffset, beaconY } = pipeCtx;
    const officeTheme = isOfficeTheme(world);

    if (officeTheme) {
      // Office Stapler / Metal Supply Pillar
      const pillarGrad = getCachedCanvasGradient(ctx, `office_pillar_${halfWidth}`, () => {
        const g = ctx.createLinearGradient(-halfWidth, 0, halfWidth, 0);
        g.addColorStop(0, "#334155");
        g.addColorStop(0.5, "#475569");
        g.addColorStop(1.0, "#1E293B");
        return g;
      });

      ctx.fillStyle = pillarGrad;
      ctx.fillRect(-halfWidth, pipeY, width, pipeHeight);

      ctx.strokeStyle = "#64748B";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-halfWidth, pipeY, width, pipeHeight);

      // Chrome Stapler Collar / Cap
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

      // Silver staple clip accent
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(-capHalfWidth + 12, capYOffset + capHeight * 0.4, capWidth - 24, 3);
      return;
    }

    // Default Containment Pillar
    const pillarGrad = getCachedCanvasGradient(ctx, `pillar_${halfWidth}_${variant}`, () => {
      const g = ctx.createLinearGradient(-halfWidth, 0, halfWidth, 0);
      applyPipeGradientStops(g, variant, [0.25, 0.5, 0.75]);
      return g;
    });

    ctx.fillStyle = pillarGrad;
    ctx.fillRect(-halfWidth, pipeY, width, pipeHeight);

    ctx.strokeStyle = colors.surface;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-halfWidth, pipeY, width, pipeHeight);

    ctx.strokeStyle = hexToRgba(colors.surface, 0.4);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-halfWidth + width * 0.3, pipeY);
    ctx.lineTo(-halfWidth + width * 0.3, pipeY + pipeHeight);
    ctx.moveTo(-halfWidth + width * 0.7, pipeY);
    ctx.lineTo(-halfWidth + width * 0.7, pipeY + pipeHeight);
    ctx.stroke();

    if (variant === "damaged") {
      ctx.strokeStyle = colors.backgroundDark;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-halfWidth + width * 0.2, pipeY + pipeHeight * 0.2);
      ctx.lineTo(-halfWidth + width * 0.4, pipeY + pipeHeight * 0.28);
      ctx.lineTo(-halfWidth + width * 0.3, pipeY + pipeHeight * 0.38);
      ctx.stroke();
    } else if (variant === "rusted") {
      ctx.fillStyle = hexToRgba(colors.orange, 0.3);
      ctx.fillRect(-halfWidth + 4, pipeY + pipeHeight * 0.1, width * 0.4, pipeHeight * 0.3);
    }

    const collarGrad = getCachedCanvasGradient(ctx, `collar_${capHalfWidth}_${variant}`, () => {
      const g = ctx.createLinearGradient(-capHalfWidth, 0, capHalfWidth, 0);
      applyPipeGradientStops(g, variant, [0.3, 0.55, 0.8]);
      return g;
    });

    ctx.fillStyle = collarGrad;
    ctx.fillRect(-capHalfWidth, capYOffset, capWidth, capHeight);
    ctx.strokeStyle = pipe.isNarrowGap ? colors.gold : colors.surface;
    ctx.lineWidth = pipe.isNarrowGap ? 2.0 : 1.5;
    ctx.strokeRect(-capHalfWidth, capYOffset, capWidth, capHeight);

    ctx.strokeStyle = hexToRgba(colors.white, 0.2);
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    if (isTopPipe) {
      ctx.moveTo(-capHalfWidth + 1, capYOffset + capHeight - 1);
      ctx.lineTo(capHalfWidth - 1, capYOffset + capHeight - 1);
    } else {
      ctx.moveTo(-capHalfWidth + 1, capYOffset + 1);
      ctx.lineTo(capHalfWidth - 1, capYOffset + 1);
    }
    ctx.stroke();

    const rivetCount = 4;
    for (let r = 0; r < rivetCount; r++) {
      const rx = -capHalfWidth + 8 + r * ((capWidth - 16) / (rivetCount - 1));
      const ry = capYOffset + capHeight * 0.5;

      ctx.fillStyle = hexToRgba(colors.surface, 0.6);
      ctx.beginPath();
      ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = hexToRgba(colors.white, 0.4);
      ctx.beginPath();
      ctx.arc(rx - 0.5, ry - 0.5, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    const pulseQuant = Math.round(beaconPulse * 10) / 10;
    const beaconKey = `beacon_halo_${pulseQuant}`;
    const offscreenBeacon = CanvasGlowCache.getInstance().getOrCreate(beaconKey, 90, 90, (offCtx) => {
      offCtx.save();
      offCtx.translate(45, 45);
      const g = offCtx.createRadialGradient(0, 0, 4, 0, 0, 45);
      g.addColorStop(0, hexToRgba(colors.red, 0.25));
      g.addColorStop(0.5, hexToRgba(colors.red, 0.08));
      g.addColorStop(1, hexToRgba(colors.red, 0));
      offCtx.fillStyle = g;
      offCtx.beginPath();
      offCtx.arc(0, 0, 45, 0, Math.PI * 2);
      offCtx.fill();
      offCtx.restore();
    });
    ctx.drawImage(offscreenBeacon as CanvasImageSource, -45, beaconY - 45);

    const beaconDotKey = `beacon_dots_${capHalfWidth}_${pulseQuant}`;
    const dotW = capHalfWidth * 2 + 30;
    const dotH = 30;
    const offscreenDots = CanvasGlowCache.getInstance().getOrCreate(beaconDotKey, dotW, dotH, (offCtx) => {
      offCtx.save();
      offCtx.translate(dotW / 2, dotH / 2);
      offCtx.fillStyle = hexToRgba(colors.red, pulseQuant);
      offCtx.shadowColor = colors.red;
      offCtx.shadowBlur = pulseQuant * 12;
      offCtx.beginPath();
      offCtx.arc(-capHalfWidth + 8, 0, 3.5, 0, Math.PI * 2);
      offCtx.arc(capHalfWidth - 8, 0, 3.5, 0, Math.PI * 2);
      offCtx.fill();

      offCtx.shadowBlur = 0;
      offCtx.fillStyle = colors.white;
      offCtx.beginPath();
      offCtx.arc(-capHalfWidth + 8, 0, 1.2, 0, Math.PI * 2);
      offCtx.arc(capHalfWidth - 8, 0, 1.2, 0, Math.PI * 2);
      offCtx.fill();
      offCtx.restore();
    });
    ctx.drawImage(offscreenDots as CanvasImageSource, -dotW / 2, beaconY - dotH / 2);
    ctx.restore();

    if (pipe.movementType === "laser_gate" && isTopPipe) {
      const laserActive = pipe.laserActive ?? true;
      const laserPulse = 0.5 + 0.5 * Math.sin(world.tick * 0.3);
      ctx.save();
      if (laserActive) {
        ctx.strokeStyle = hexToRgba(colors.cyan, 0.7 + 0.3 * laserPulse);
        ctx.lineWidth = 3.0;
        ctx.shadowColor = colors.cyan;
        ctx.shadowBlur = 12 * laserPulse;
        ctx.beginPath();
        ctx.moveTo(0, capYOffset + capHeight);
        ctx.lineTo(0, capYOffset + capHeight + pipe.gapSize);
        ctx.stroke();

        maybeSpawnLaserGateSparks(world, capYOffset, capHeight, pipe.gapSize, pos.x, spawnVisualParticle);
      } else {
        ctx.strokeStyle = hexToRgba(colors.red, 0.25);
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(0, capYOffset + capHeight);
        ctx.lineTo(0, capYOffset + capHeight + pipe.gapSize);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
};

/**
 * Station Hull Ground / Office Wooden Desk Ground Shape Drawer.
 */
export const drawFlappyGround: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 400 } = render;
    const width = size;
    const height = 40;
    const officeTheme = isOfficeTheme(world);

    if (officeTheme) {
      // Office Wooden Desk Surface
      const deskGrad = getCachedCanvasGradient(ctx, `desk_${height}`, () => {
        const g = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
        g.addColorStop(0, "#D97706");
        g.addColorStop(0.3, "#B45309");
        g.addColorStop(1.0, "#78350F");
        return g;
      });
      ctx.fillStyle = deskGrad;
      ctx.fillRect(-width / 2, -height / 2, width, height);

      // Polished Edge Brass Trim
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(-width / 2, -height / 2, width, 3);

      ctx.strokeStyle = "#451A03";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-width / 2, -height / 2);
      ctx.lineTo(width / 2, -height / 2);
      ctx.stroke();
      return;
    }

    // Default Station Hull Ground
    const baseGrad = getCachedCanvasGradient(ctx, `base_${height}`, () => {
      const g = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
      g.addColorStop(0, colors.surface);
      g.addColorStop(1, colors.backgroundDark);
      return g;
    });
    ctx.fillStyle = baseGrad;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    const hazardHeight = 8;
    const hazardFlicker = calculateGroundHazardFlicker(world.tick);

    ctx.save();
    ctx.beginPath();
    ctx.rect(-width / 2, -height / 2, width, hazardHeight);
    ctx.clip();

    ctx.fillStyle = colors.yellow;
    ctx.globalAlpha = hazardFlicker;
    ctx.fillRect(-width / 2, -height / 2, width, hazardHeight);

    ctx.fillStyle = colors.surface;
    ctx.globalAlpha = hazardFlicker;
    const stripeWidth = 12;
    const stripeOffset = (world.tick * 3) % (stripeWidth * 2);

    for (let sx = -width / 2 - stripeWidth * 2; sx < width / 2 + stripeWidth * 2; sx += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(sx + stripeOffset, -height / 2);
      ctx.lineTo(sx + stripeOffset + stripeWidth, -height / 2);
      ctx.lineTo(sx + stripeOffset, -height / 2 + hazardHeight);
      ctx.lineTo(sx + stripeOffset - stripeWidth, -height / 2 + hazardHeight);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = colors.slate;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-width / 2, -height / 2);
    ctx.lineTo(width / 2, -height / 2);
    ctx.stroke();

    ctx.strokeStyle = colors.surface;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-width / 2, height / 2);
    ctx.lineTo(width / 2, height / 2);
    ctx.stroke();
  }
};

function drawCanvasMegastructure(ctx: CanvasRenderingContext2D, data: MegastructureData): void {
  const { megaIndex, megaX, megaY, beaconAlpha, structureOpacity } = data;
  ctx.save();
  ctx.globalAlpha = structureOpacity;
  ctx.fillStyle = hexToRgba(colors.surface, 0.65);

  if (megaIndex === 0) {
    ctx.beginPath();
    ctx.arc(megaX, megaY, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(megaX - 85, megaY - 4, 170, 8);
    ctx.fillRect(megaX - 4, megaY - 85, 8, 170);
    ctx.fillRect(megaX - 80, megaY - 25, 6, 50);
    ctx.fillRect(megaX + 74, megaY - 25, 6, 50);

    ctx.fillStyle = hexToRgba(colors.red, beaconAlpha);
    ctx.beginPath();
    ctx.arc(megaX, megaY - 85, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 1) {
    ctx.beginPath();
    ctx.moveTo(megaX - 60, megaY - 30);
    ctx.lineTo(megaX + 70, megaY - 10);
    ctx.lineTo(megaX + 40, megaY + 35);
    ctx.lineTo(megaX - 50, megaY + 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(megaX - 90, megaY - 45, 12, 90);
    ctx.fillRect(megaX - 90, megaY - 3, 100, 6);

    ctx.fillStyle = hexToRgba(colors.red, beaconAlpha);
    ctx.beginPath();
    ctx.arc(megaX + 70, megaY - 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 2) {
    ctx.lineWidth = 14;
    ctx.strokeStyle = hexToRgba(colors.surface, 0.65);
    ctx.beginPath();
    ctx.arc(megaX, megaY, 55, -Math.PI * 0.7, Math.PI * 0.5);
    ctx.stroke();

    ctx.fillRect(megaX - 10, megaY - 60, 20, 10);
    ctx.fillRect(megaX + 48, megaY - 10, 10, 20);

    ctx.fillStyle = hexToRgba(colors.red, beaconAlpha);
    ctx.beginPath();
    ctx.arc(megaX - 10, megaY - 60, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 3) {
    ctx.fillRect(megaX - 6, megaY - 90, 12, 180);
    ctx.fillRect(megaX - 25, megaY - 40, 50, 6);
    ctx.fillRect(megaX - 35, megaY + 10, 70, 8);

    ctx.beginPath();
    ctx.arc(megaX, megaY - 70, 22, Math.PI * 0.2, Math.PI * 0.8);
    ctx.fill();

    ctx.fillStyle = hexToRgba(colors.red, beaconAlpha);
    ctx.beginPath();
    ctx.arc(megaX, megaY - 90, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 4) {
    ctx.fillRect(megaX - 80, megaY - 10, 160, 8);
    ctx.fillRect(megaX - 70, megaY - 50, 30, 40);
    ctx.fillRect(megaX - 20, megaY - 50, 30, 40);
    ctx.fillRect(megaX + 30, megaY - 50, 30, 40);

    ctx.fillStyle = hexToRgba(colors.red, beaconAlpha);
    ctx.beginPath();
    ctx.arc(megaX + 75, megaY - 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 5) {
    ctx.fillRect(megaX - 50, megaY - 40, 100, 80);
    ctx.fillRect(megaX - 80, megaY - 15, 30, 30);
    ctx.fillRect(megaX + 50, megaY - 25, 40, 50);

    ctx.fillStyle = hexToRgba(colors.red, beaconAlpha);
    ctx.beginPath();
    ctx.arc(megaX - 80, megaY - 15, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 6) {
    ctx.fillRect(megaX - 45, megaY - 80, 10, 160);
    ctx.fillRect(megaX + 35, megaY - 80, 10, 160);
    ctx.beginPath();
    ctx.arc(megaX, megaY, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hexToRgba(colors.red, beaconAlpha);
    ctx.beginPath();
    ctx.arc(megaX - 40, megaY - 80, 2.5, 0, Math.PI * 2);
    ctx.arc(megaX + 40, megaY - 80, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.lineWidth = 10;
    ctx.strokeStyle = hexToRgba(colors.surface, 0.65);
    ctx.beginPath();
    ctx.arc(megaX, megaY, 65, 0, Math.PI * 1.2);
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(megaX, megaY, 40, Math.PI * 0.5, Math.PI * 1.8);
    ctx.stroke();

    ctx.fillStyle = hexToRgba(colors.red, beaconAlpha);
    ctx.beginPath();
    ctx.arc(megaX + 65, megaY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

let staticStars: StarfieldStar[] | null = null;

export const scrollingBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world) {
    const bgSetup = resolveFlappyBackgroundSetup(world);
    if (!bgSetup) return;

    const { gameState, width, height, scenarioTheme, nebulae } = bgSetup;
    const officeTheme = isOfficeTheme(world);

    updateVisualParticles();

    if (officeTheme) {
      // Office 8:47 Ambient Room Background
      const bgGrad = getCachedCanvasGradient(ctx, `office_bg_${width}_${height}`, () => {
        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, "#0F172A");
        g.addColorStop(0.6, "#1E293B");
        g.addColorStop(1.0, "#090D16");
        return g;
      });
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Office Blueprint / Graph Paper Grid Lines
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
      return;
    }

    // Default Space Theme Background
    if (!staticStars) {
      staticStars = generateStarfield(width, height);
    }

    ctx.fillStyle = colors.backgroundDark;
    ctx.fillRect(0, 0, width, height);

    for (let n = 0; n < nebulae.length; n++) {
      const neb = nebulae[n];
      const { nx, ny } = computeFlappyNebulaPos(neb, world.tick, width, height, n);
      const nebGrad = getCachedCanvasGradient(ctx, `neb_${n}_${Math.round(nx)}_${Math.round(ny)}_${width}_${height}_${scenarioTheme.megaIndex}`, () => {
        const g = ctx.createRadialGradient(nx, ny, 10, nx, ny, neb.radius);
        g.addColorStop(0, neb.colorHex);
        g.addColorStop(0.6, hexToRgba(neb.colorHex, 0.4));
        g.addColorStop(1, hexToRgba(colors.backgroundDark, 0));
        return g;
      });
      ctx.save();
      ctx.fillStyle = nebGrad;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    maybeSpawnBackgroundDebris(world, width, height, spawnVisualParticle);

    const warpState = resolveBackgroundWarpState(world, width, height);
    const { warpFactor, showWarpLines, intensity, cx, cy, lineCount, maxR } = warpState;

    const tick = world.tick;
    for (let i = 0; i < staticStars.length; i++) {
      const star = staticStars[i];
      const speed = star.layer === 2 ? 0.08 : star.layer === 0 ? 0.2 : 0.8 * warpFactor;
      let starX = (star.x - tick * speed) % width;
      if (starX < 0) starX += width;

      ctx.save();
      ctx.globalAlpha = star.alpha;

      if (star.layer === 2) {
        ctx.fillStyle = colors.slate;
        ctx.fillRect(starX, star.y, star.size, star.size);
      } else if (star.layer === 0) {
        ctx.fillStyle = colors.white;
        ctx.fillRect(starX, star.y, star.size, star.size);
      } else {
        ctx.fillStyle = colors.blueLight;
        if (warpFactor > 1.2) {
          const lineLength = Math.min(star.size * 3 * warpFactor, 12);
          ctx.fillRect(starX, star.y, lineLength, star.size * 0.8);
        } else {
          ctx.fillRect(starX, star.y, star.size, star.size);
        }
      }
      ctx.restore();
    }

    if (showWarpLines) {
      ctx.save();
      ctx.strokeStyle = hexToRgba(colors.cyan, 0.15 * intensity);
      ctx.lineWidth = 1.2;

      const lines = computeWarpLines(lineCount, tick, cx, cy, maxR, warpFactor);
      for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    const megaData = calculateMegastructureData(tick, width, height, 1600, scenarioTheme.megaIndex);
    if (megaData.visible) {
      drawCanvasMegastructure(ctx, megaData);
    }

    const transitionAlpha = calculateScenarioTransitionOverlay(gameState.scenarioTransitionTicks ?? 0);
    if (transitionAlpha > 0) {
      ctx.save();
      ctx.fillStyle = scenarioTheme.palette?.primaryGlow || colors.cyan;
      ctx.globalAlpha = transitionAlpha * 0.25;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    drawCanvasVisualParticles(ctx);

    drawCanvasGlideEnergyBar(ctx, world, width, height, true);

    const sectorInfo = resolveSectorEventInfo(gameState.currentSectorEvent ?? "none");
    if (sectorInfo) {
      ctx.save();
      ctx.fillStyle = hexToRgba(colors.cyan, 0.15);
      ctx.fillRect(0, 10, width, 22);
      ctx.fillStyle = sectorInfo.textColor;
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(sectorInfo.bannerText, width / 2, 25);
      ctx.restore();
    }

    const { scanlineColor, vignetteOuter } = resolveFlappyVfxColors(world);

    ctx.save();
    ctx.fillStyle = scanlineColor;
    for (let ly = 0; ly < height; ly += 3) {
      ctx.fillRect(0, ly, width, 1);
    }

    const vignGrad = getCachedCanvasGradient(ctx, `vign_${width}_${height}`, () => {
      const g = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.4,
        width / 2, height / 2, width * 0.8
      );
      g.addColorStop(0, "rgba" + "(" + 0 + ", " + 0 + ", " + 0 + ", " + 0 + ")");
      g.addColorStop(1, vignetteOuter);
      return g;
    });
    ctx.fillStyle = vignGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  },
};
