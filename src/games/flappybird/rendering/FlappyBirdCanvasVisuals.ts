import { ShapeDrawer, EffectDrawer, TransformComponent } from "@tiny-aster/core";
import { FLAPPY_CONFIG, FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";
import { computeFlappyThrusterFlame } from "../../shared/rendering/ProceduralShapeUtils";
import {
  StarfieldStar,
  generateStarfield
} from "../../shared/rendering/geometry";
import {
  calculateWarpFactor,
  calculateMegastructureData,
  calculateGroundHazardFlicker,
  BACKGROUND_NEBULAE,
  MegastructureData
} from "./FlappyBirdBackgroundData";
import { createParticlePool, VisualParticlePool } from "../../shared/rendering/VisualParticlePool";
import { applyFlappyParticlePhysics } from "./particleEvents";
import {
  resolveFlappyBirdDrawContext,
  resolveFlappyPipeDrawContext,
  maybeSpawnBackgroundDebris,
  resolveGlideEnergyState,
  resolveSectorEventInfo
} from "./FlappyBirdRenderUtils";

// DUP-04: duplicación intencional de dibujadores visuales entre Canvas2D y Skia.
// Primitivas de dibujo específicas de Canvas/Skia mantenidas intencionalmente separadas. Ver docs/tech-debt/duplication.md

// ============================================================================
// ZERO-ALLOCATION PRE-ALLOCATED VISUAL PARTICLE POOL (NEON VOID SPARKS & SHARDS)
// ============================================================================

export const FLAPPY_CANVAS_PARTICLE_POOL: VisualParticlePool = createParticlePool(150);

export function spawnVisualParticle(
  type: "spark" | "shard" | "star",
  x: number,
  y: number,
  vx: number,
  vy: number,
  maxLife: number,
  size: number,
  color: string,
  angle = 0,
  angularVelocity = 0
): void {
  FLAPPY_CANVAS_PARTICLE_POOL.spawn(x, y, vx, vy, maxLife, size, color, { type, angle, angularVelocity });
}

function updateVisualParticles(): void {
  FLAPPY_CANVAS_PARTICLE_POOL.update(0.016, applyFlappyParticlePhysics);
}

function drawCanvasVisualParticles(ctx: CanvasRenderingContext2D): void {
  const particles = FLAPPY_CANVAS_PARTICLE_POOL.getActiveParticles();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.active) continue;

    const ratio = p.life / p.maxLife;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.angle !== undefined && p.angle !== 0) {
      ctx.rotate(p.angle);
    }
    ctx.globalAlpha = ratio;

    if (p.type === "spark") {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      const sz = p.size;
      ctx.moveTo(sz * 0.8, 0);
      ctx.lineTo(0, -sz * 0.2);
      ctx.lineTo(-sz * 0.8, 0);
      ctx.lineTo(0, sz * 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === "shard") {
      ctx.fillStyle = "#5A6173";
      const sz = p.size;
      ctx.beginPath();
      ctx.moveTo(sz * 0.4, -sz * 0.3);
      ctx.lineTo(sz * 0.1, sz * 0.4);
      ctx.lineTo(-sz * 0.4, sz * 0.1);
      ctx.lineTo(-sz * 0.2, -sz * 0.3);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#FF3300";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    } else if (p.type === "star") {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
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

/**
 * Player Ship ("Interceptor") shape drawer.
 * Arrowhead spearhead silhouette, titanium hull, cyan cockpit, thermonuclear thruster flame.
 */
export const drawFlappyBird: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveFlappyBirdDrawContext(world, entity, FLAPPY_CANVAS_PARTICLE_POOL);
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

    ctx.save();
    ctx.globalAlpha = globalOpacity;

    // --- VELOCITY TILT AND SQUASH AND STRETCH ---
    ctx.rotate(angleRad);
    ctx.scale(scaleX, scaleY);

    // --- RGB CHROMATIC ABERRATION SPLIT ON DEATH ---
    if (isDyingGlitch) {
      ctx.save();
      ctx.translate(-3, -1);
      ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
      drawArrowheadPath(ctx, size);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(3, 1);
      ctx.fillStyle = "rgba(0, 243, 255, 0.6)";
      drawArrowheadPath(ctx, size);
      ctx.fill();
      ctx.restore();
    }

    // --- CYAN LIGHT TRAIL / PARAMETERIZED COSMETIC TRAIL ---
    if (isAlive) {
      const warpFactor = calculateWarpFactor(world);
      const trailConfig = world.getResource<{ enabled?: boolean; color?: string; width?: number; lengthMultiplier?: number }>("CosmeticTrailConfig");
      const trailColor = trailConfig?.color || "#00F3FF";
      const trailWidth = (trailConfig?.width || 2.0) * warpFactor;
      const lengthMult = (trailConfig?.lengthMultiplier || 1.0) * warpFactor;

      ctx.save();
      ctx.strokeStyle = trailConfig?.enabled ? trailColor : "rgba(0, 243, 255, 0.35)";
      ctx.lineWidth = trailWidth;
      ctx.shadowColor = trailColor;
      ctx.shadowBlur = trailConfig?.enabled ? 12 * warpFactor : 8 * warpFactor;
      ctx.beginPath();
      ctx.moveTo(-size * 0.55, 0);
      ctx.lineTo(-size * (1.8 * lengthMult) - Math.min(speed * 0.1 * lengthMult, 25), 0);
      ctx.stroke();
      ctx.restore();
    }

    // --- THERMONUCLEAR REACTIVE THRUSTER FLAME ---
    if (isAlive) {
      const { flameLength, flameWidth } = computeFlappyThrusterFlame(size, vy, world.tick);

      const flameGrad = getCachedCanvasGradient(ctx, `flame_${size}`, () => {
        const g = ctx.createLinearGradient(-size * 0.55, 0, -size * 2.2, 0);
        g.addColorStop(0, "#FFFFFF");   // White thermonuclear core
        g.addColorStop(0.35, "#FFC000"); // Hot yellow-orange
        g.addColorStop(1.0, "#FF3300");  // Thermonuclear red tip
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

    // --- TITANIUM HULL GRADIENT ---
    const hullGrad = getCachedCanvasGradient(ctx, `hull_${size}_${isAlive}`, () => {
      const g = ctx.createLinearGradient(-size * 0.7, 0, size * 1.2, 0);
      if (isAlive) {
        g.addColorStop(0, "#5A6173"); // Dark titanium tail
        g.addColorStop(0.5, "#8B93A5"); // Mid-tone titanium
        g.addColorStop(1.0, "#D3D9E2"); // Light metallic nose
      } else {
        g.addColorStop(0, "#3A3F4B"); // Lead gray dead state
        g.addColorStop(0.6, "#5A6173");
        g.addColorStop(1.0, "#696969");
      }
      return g;
    });

    ctx.fillStyle = hullGrad;
    drawArrowheadPath(ctx, size);
    ctx.fill();

    // Dark armor plate seam border
    ctx.strokeStyle = "#1A1D24";
    ctx.lineWidth = 1.2;
    drawArrowheadPath(ctx, size);
    ctx.stroke();

    // Structural panel detail line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(size * 0.8, 0);
    ctx.lineTo(-size * 0.2, 0);
    ctx.stroke();

    // --- ELLIPTICAL CYAN COCKPIT (ONLY CYAN SATURATED ELEMENT ON SCREEN) ---
    ctx.save();
    ctx.fillStyle = "#00F3FF";
    ctx.shadowColor = "#00F3FF";
    ctx.shadowBlur = isAlive ? 6 : 0;

    ctx.beginPath();
    ctx.ellipse(size * 0.15, -size * 0.05, size * 0.35, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(size * 0.15, -size * 0.05, size * 0.35, size * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Off-center white highlight reflection dot (no eyes/pupils)
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(size * 0.25, -size * 0.09, size * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // --- COYOTE TIME DANGER PULSE OVERLAY ---
    if (render.dangerPulseIntensity && render.dangerPulseIntensity > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(world.tick * 0.4);
      const alpha = render.dangerPulseIntensity * pulse;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = "#FF0000";
      ctx.shadowBlur = 12 * alpha;
      drawArrowheadPath(ctx, size + 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // Squash-and-stretch pop

    // --- TACTICAL NEAR MISS OVERLAY ---
    if (birdComp.nearMissTimer > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const alphaVal = birdComp.nearMissTimer / 0.3;
      ctx.fillStyle = `rgba(0, 243, 255, ${alphaVal})`;
      ctx.shadowColor = "#00F3FF";
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
  ctx.moveTo(size * 1.2, 0);                   // Prow (nose tip)
  ctx.lineTo(-size * 0.7, -size * 0.85);       // Top fin tip
  ctx.lineTo(-size * 0.4, -size * 0.35);       // Top wing notch
  ctx.lineTo(-size * 0.55, 0);                 // Rear engine notch center
  ctx.lineTo(-size * 0.4, size * 0.35);        // Bottom wing notch
  ctx.lineTo(-size * 0.7, size * 0.85);        // Bottom fin tip
  ctx.closePath();
}

// ============================================================================
// CONTAINMENT TOWERS (OBSTACLES) — INDUSTRIAL METALLIC PILLARS & RED BEACONS
// ============================================================================

export const drawFlappyPipe: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const pipeCtx = resolveFlappyPipeDrawContext(world, entity);
    if (!pipeCtx) return;

    const {
      pos,
      pipe,
      width,
      halfWidth,
      variant,
      geometry,
      capHeight,
      capWidth,
      capHalfWidth,
      beaconPulse,
    } = pipeCtx;

    const { isTopPipe, pipeY, pipeHeight, capYOffset, beaconY } = geometry;

    // --- METALLIC PILLAR BODY VARIANT GRADIENT ---
    const pillarGrad = getCachedCanvasGradient(ctx, `pillar_${halfWidth}_${variant}`, () => {
      const g = ctx.createLinearGradient(-halfWidth, 0, halfWidth, 0);
      if (variant === "damaged") {
        g.addColorStop(0, "#191B22");
        g.addColorStop(0.25, "#2C313C");
        g.addColorStop(0.5, "#424856");
        g.addColorStop(0.75, "#2C313C");
        g.addColorStop(1.0, "#13151A");
      } else if (variant === "rusted") {
        g.addColorStop(0, "#2A1810");
        g.addColorStop(0.25, "#4A2B1D");
        g.addColorStop(0.5, "#6B3E2A");
        g.addColorStop(0.75, "#4A2B1D");
        g.addColorStop(1.0, "#1F110B");
      } else {
        g.addColorStop(0, "#1A1A22");
        g.addColorStop(0.25, "#2A2A35");
        g.addColorStop(0.5, "#3F3F50");
        g.addColorStop(0.75, "#2A2A35");
        g.addColorStop(1.0, "#121218");
      }
      return g;
    });

    ctx.fillStyle = pillarGrad;
    ctx.fillRect(-halfWidth, pipeY, width, pipeHeight);

    // Dark vertical armor panel seams
    ctx.strokeStyle = "#121218";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-halfWidth, pipeY, width, pipeHeight);

    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-halfWidth + width * 0.3, pipeY);
    ctx.lineTo(-halfWidth + width * 0.3, pipeY + pipeHeight);
    ctx.moveTo(-halfWidth + width * 0.7, pipeY);
    ctx.lineTo(-halfWidth + width * 0.7, pipeY + pipeHeight);
    ctx.stroke();

    // Additional surface detail per variant
    if (variant === "damaged") {
      ctx.strokeStyle = "#0D0E12";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-halfWidth + width * 0.2, pipeY + pipeHeight * 0.2);
      ctx.lineTo(-halfWidth + width * 0.4, pipeY + pipeHeight * 0.28);
      ctx.lineTo(-halfWidth + width * 0.3, pipeY + pipeHeight * 0.38);
      ctx.stroke();
    } else if (variant === "rusted") {
      ctx.fillStyle = "rgba(180, 80, 30, 0.3)";
      ctx.fillRect(-halfWidth + 4, pipeY + pipeHeight * 0.1, width * 0.4, pipeHeight * 0.3);
    }

    // --- REINFORCED DOCKING COLLAR AT THE GAP MOUTH ---
    const collarGrad = getCachedCanvasGradient(ctx, `collar_${capHalfWidth}_${variant}`, () => {
      const g = ctx.createLinearGradient(-capHalfWidth, 0, capHalfWidth, 0);
      if (variant === "damaged") {
        g.addColorStop(0, "#252833");
        g.addColorStop(0.3, "#3E4454");
        g.addColorStop(0.55, "#5A6278");
        g.addColorStop(0.8, "#3E4454");
        g.addColorStop(1.0, "#1B1D26");
      } else if (variant === "rusted") {
        g.addColorStop(0, "#382015");
        g.addColorStop(0.3, "#543222");
        g.addColorStop(0.55, "#734530");
        g.addColorStop(0.8, "#543222");
        g.addColorStop(1.0, "#28170F");
      } else {
        g.addColorStop(0, "#22222D");
        g.addColorStop(0.3, "#3A3A4A");
        g.addColorStop(0.55, "#525266");
        g.addColorStop(0.8, "#3A3A4A");
        g.addColorStop(1.0, "#181822");
      }
      return g;
    });

    ctx.fillStyle = collarGrad;
    ctx.fillRect(-capHalfWidth, capYOffset, capWidth, capHeight);
    ctx.strokeStyle = pipe.isNarrowGap ? "#FFD700" : "#121218";
    ctx.lineWidth = pipe.isNarrowGap ? 2.0 : 1.5;
    ctx.strokeRect(-capHalfWidth, capYOffset, capWidth, capHeight);

    // Collar bevel line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
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

    // Industrial Rivets along collar
    const rivetCount = 4;
    for (let r = 0; r < rivetCount; r++) {
      const rx = -capHalfWidth + 8 + r * ((capWidth - 16) / (rivetCount - 1));
      const ry = capYOffset + capHeight * 0.5;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(rx - 0.5, ry - 0.5, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- STROBOSCOPIC RED WARNING BEACONS (#FF0000) WITH SOFT AMBIENT GLOW HALO ---
    ctx.save();
    // Soft radial ambient light halo projecting onto nearby background
    const beaconGlowGrad = getCachedCanvasGradient(ctx, `beacon_halo_${beaconPulse.toFixed(2)}`, () => {
      const g = ctx.createRadialGradient(0, beaconY, 4, 0, beaconY, 45);
      g.addColorStop(0, "rgba(255, 0, 0, 0.25)");
      g.addColorStop(0.5, "rgba(255, 0, 0, 0.08)");
      g.addColorStop(1, "rgba(255, 0, 0, 0)");
      return g;
    });
    ctx.fillStyle = beaconGlowGrad;
    ctx.beginPath();
    ctx.arc(0, beaconY, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 0, 0, ${beaconPulse})`;
    ctx.shadowColor = "#FF0000";
    ctx.shadowBlur = beaconPulse * 12;

    // Beacons on left and right edges of the docking lip
    ctx.beginPath();
    ctx.arc(-capHalfWidth + 8, beaconY, 3.5, 0, Math.PI * 2);
    ctx.arc(capHalfWidth - 8, beaconY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(-capHalfWidth + 8, beaconY, 1.2, 0, Math.PI * 2);
    ctx.arc(capHalfWidth - 8, beaconY, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- LASER GATE OVERLAY & SPARKS ---
    if (pipe.movementType === "laser_gate" && isTopPipe) {
      const laserActive = pipe.laserActive ?? true;
      const laserPulse = 0.5 + 0.5 * Math.sin(world.tick * 0.3);
      ctx.save();
      if (laserActive) {
        ctx.strokeStyle = `rgba(0, 243, 255, ${0.7 + 0.3 * laserPulse})`;
        ctx.lineWidth = 3.0;
        ctx.shadowColor = "#00F3FF";
        ctx.shadowBlur = 12 * laserPulse;
        ctx.beginPath();
        ctx.moveTo(0, capYOffset + capHeight);
        ctx.lineTo(0, capYOffset + capHeight + pipe.gapSize);
        ctx.stroke();

        if (world.tick % 4 === 0) {
          const sparkY = capYOffset + capHeight + world.renderRandom.next() * pipe.gapSize;
          const sparkAngle = world.renderRandom.next() * Math.PI * 2;
          const sparkSpeed = world.renderRandom.nextRange(20, 60);
          spawnVisualParticle("spark", pos.x, sparkY, Math.cos(sparkAngle) * sparkSpeed, Math.sin(sparkAngle) * sparkSpeed, 0.25, 2.5, "#00F3FF");
        }
      } else {
        ctx.strokeStyle = "rgba(255, 0, 0, 0.25)";
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

// ============================================================================
// STATION HULL GROUND — INDUSTRIAL METALLIC BASE WITH CAUTION STRIPES
// ============================================================================

export const drawFlappyGround: ShapeDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const { size = 400 } = render;
    const width = size;
    const height = 40;

    // Dark industrial metal base
    const baseGrad = getCachedCanvasGradient(ctx, `base_${height}`, () => {
      const g = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
      g.addColorStop(0, "#22222C");
      g.addColorStop(1, "#0D0D12");
      return g;
    });
    ctx.fillStyle = baseGrad;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    // Yellow / Black hazard warning caution rim at the top with non-linear flickering
    const hazardHeight = 8;
    const hazardFlicker = calculateGroundHazardFlicker(world.tick);

    ctx.save();
    ctx.beginPath();
    ctx.rect(-width / 2, -height / 2, width, hazardHeight);
    ctx.clip();

    ctx.fillStyle = "#FFCC00"; // Yellow caution
    ctx.globalAlpha = hazardFlicker;
    ctx.fillRect(-width / 2, -height / 2, width, hazardHeight);

    // Black diagonal stripes scrolling with camera
    ctx.fillStyle = "#111116";
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

    // Top bounding metal seam
    ctx.strokeStyle = "#5A6173";
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-width / 2, -height / 2);
    ctx.lineTo(width / 2, -height / 2);
    ctx.stroke();

    // Bottom dark bounding line
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-width / 2, height / 2);
    ctx.lineTo(width / 2, height / 2);
    ctx.stroke();
  }
};

// Helper to draw 8 distinct megastructure silhouette designs in Canvas2D
function drawCanvasMegastructure(ctx: CanvasRenderingContext2D, data: MegastructureData): void {
  const { megaIndex, megaX, megaY, beaconAlpha, structureOpacity } = data;
  ctx.save();
  ctx.globalAlpha = structureOpacity;
  ctx.fillStyle = "rgba(15, 18, 28, 0.65)"; // Dark void silhouette

  if (megaIndex === 0) {
    // Design 0: Radial Station (Hub core + radial spoke arms)
    ctx.beginPath();
    ctx.arc(megaX, megaY, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(megaX - 85, megaY - 4, 170, 8);
    ctx.fillRect(megaX - 4, megaY - 85, 8, 170);
    ctx.fillRect(megaX - 80, megaY - 25, 6, 50);
    ctx.fillRect(megaX + 74, megaY - 25, 6, 50);

    ctx.fillStyle = `rgba(255, 0, 0, ${beaconAlpha})`;
    ctx.beginPath();
    ctx.arc(megaX, megaY - 85, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 1) {
    // Design 1: Ship Wreckage (Angular wedge hull fragment + solar arrays)
    ctx.beginPath();
    ctx.moveTo(megaX - 60, megaY - 30);
    ctx.lineTo(megaX + 70, megaY - 10);
    ctx.lineTo(megaX + 40, megaY + 35);
    ctx.lineTo(megaX - 50, megaY + 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(megaX - 90, megaY - 45, 12, 90);
    ctx.fillRect(megaX - 90, megaY - 3, 100, 6);

    ctx.fillStyle = `rgba(255, 0, 0, ${beaconAlpha})`;
    ctx.beginPath();
    ctx.arc(megaX + 70, megaY - 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 2) {
    // Design 2: Broken Ring (Fragmented orbital ring arc)
    ctx.lineWidth = 14;
    ctx.strokeStyle = "rgba(15, 18, 28, 0.65)";
    ctx.beginPath();
    ctx.arc(megaX, megaY, 55, -Math.PI * 0.7, Math.PI * 0.5);
    ctx.stroke();

    ctx.fillRect(megaX - 10, megaY - 60, 20, 10);
    ctx.fillRect(megaX + 48, megaY - 10, 10, 20);

    ctx.fillStyle = `rgba(255, 0, 0, ${beaconAlpha})`;
    ctx.beginPath();
    ctx.arc(megaX - 10, megaY - 60, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 3) {
    // Design 3: Communications Tower (Tall lattice spire + transmitter dish)
    ctx.fillRect(megaX - 6, megaY - 90, 12, 180);
    ctx.fillRect(megaX - 25, megaY - 40, 50, 6);
    ctx.fillRect(megaX - 35, megaY + 10, 70, 8);

    ctx.beginPath();
    ctx.arc(megaX, megaY - 70, 22, Math.PI * 0.2, Math.PI * 0.8);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 0, 0, ${beaconAlpha})`;
    ctx.beginPath();
    ctx.arc(megaX, megaY - 90, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 4) {
    // Design 4: Solar Farm Arrays (Grid of angled solar panels)
    ctx.fillRect(megaX - 80, megaY - 10, 160, 8);
    ctx.fillRect(megaX - 70, megaY - 50, 30, 40);
    ctx.fillRect(megaX - 20, megaY - 50, 30, 40);
    ctx.fillRect(megaX + 30, megaY - 50, 30, 40);

    ctx.fillStyle = `rgba(255, 0, 0, ${beaconAlpha})`;
    ctx.beginPath();
    ctx.arc(megaX + 75, megaY - 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 5) {
    // Design 5: Mining Rig Hull (Blocky industrial excavator frame)
    ctx.fillRect(megaX - 50, megaY - 40, 100, 80);
    ctx.fillRect(megaX - 80, megaY - 15, 30, 30);
    ctx.fillRect(megaX + 50, megaY - 25, 40, 50);

    ctx.fillStyle = `rgba(255, 0, 0, ${beaconAlpha})`;
    ctx.beginPath();
    ctx.arc(megaX - 80, megaY - 15, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (megaIndex === 6) {
    // Design 6: Orbital Relay Spire (Twin pylons with central power core)
    ctx.fillRect(megaX - 45, megaY - 80, 10, 160);
    ctx.fillRect(megaX + 35, megaY - 80, 10, 160);
    ctx.beginPath();
    ctx.arc(megaX, megaY, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 0, 0, ${beaconAlpha})`;
    ctx.beginPath();
    ctx.arc(megaX - 40, megaY - 80, 2.5, 0, Math.PI * 2);
    ctx.arc(megaX + 40, megaY - 80, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Design 7: Derelict Habitat Ring (Dual concentric outer ring arches)
    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(15, 18, 28, 0.65)";
    ctx.beginPath();
    ctx.arc(megaX, megaY, 65, 0, Math.PI * 1.2);
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(megaX, megaY, 40, Math.PI * 0.5, Math.PI * 1.8);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 0, 0, ${beaconAlpha})`;
    ctx.beginPath();
    ctx.arc(megaX + 65, megaY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ============================================================================
// THE DEEP VOID PARALLAX BACKGROUND (#050510) WITH WARP & MEGASTRUCTURE
// ============================================================================

let staticStars: StarfieldStar[] | null = null;

export const scrollingBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = {
  draw(ctx, world) {
    const gameState = world.getSingleton("FlappyState");
    if (!gameState) return;
    const { width = 400, height = 600 } = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 400, height: 600 };

    if (!staticStars) {
      staticStars = generateStarfield(width, height);
    }

    updateVisualParticles();

    // --- DEEP VOID BASE (#050510) ---
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, width, height);

    // --- ANIMATED LOW-OPACITY RADIAL NEBULAE CLOUDS ---
    for (let n = 0; n < BACKGROUND_NEBULAE.length; n++) {
      const neb = BACKGROUND_NEBULAE[n];
      const nx = width * neb.xRatio + Math.sin(world.tick * 0.01 + n) * 15;
      const ny = height * neb.yRatio + Math.cos(world.tick * 0.008 + n * 2) * 10;
      const nebGrad = getCachedCanvasGradient(ctx, `neb_${n}_${width}_${height}`, () => {
        const g = ctx.createRadialGradient(nx, ny, 10, nx, ny, neb.radius);
        g.addColorStop(0, neb.colorHex);
        g.addColorStop(0.6, neb.colorHex + "66");
        g.addColorStop(1, "#05051000");
        return g;
      });
      ctx.save();
      ctx.fillStyle = nebGrad;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // --- SPORADIC DISTANT BACKGROUND DEBRIS / SPARKS ---
    maybeSpawnBackgroundDebris(world, width, height, spawnVisualParticle);

    // Hypervelocity combo factor calculation
    let warpFactor = 1.0;
    const comboEntities = world.query("Combo");
    if (comboEntities.length > 0) {
      const combo = world.getComponent(comboEntities[0], "Combo") as any;
      if (combo && combo.multiplier > 1) {
        warpFactor = 1.0 + (combo.multiplier - 1) * 0.35;
      }
    }

    // --- PARALLAX STARFIELD LAYERS ---
    const tick = world.tick;
    for (let i = 0; i < staticStars.length; i++) {
      const star = staticStars[i];
      let speed = star.layer === 2 ? 0.08 : star.layer === 0 ? 0.2 : 0.8 * warpFactor;
      let starX = (star.x - tick * speed) % width;
      if (starX < 0) starX += width;

      ctx.save();
      ctx.globalAlpha = star.alpha;

      if (star.layer === 2) {
        ctx.fillStyle = "#5A6173";
        ctx.fillRect(starX, star.y, star.size, star.size);
      } else if (star.layer === 0) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(starX, star.y, star.size, star.size);
      } else {
        // Pale white-blue / violet non-saturated star
        ctx.fillStyle = "#E0E5FF";
        if (warpFactor > 1.2) {
          // Hypervelocity speed-line stretch
          const lineLength = Math.min(star.size * 3 * warpFactor, 12);
          ctx.fillRect(starX, star.y, lineLength, star.size * 0.8);
        } else {
          ctx.fillRect(starX, star.y, star.size, star.size);
        }
      }
      ctx.restore();
    }

    // --- AD-HOC RADIAL WARP SPEED LINES (WARPFACTOR > 1.5) ---
    // Opting for an ad-hoc local implementation instead of registering global SharedVFX
    // to preserve zero side-effects on shared VFX state across other minigames (e.g. Geometry Wars)
    // while pinning radial speed lines strictly to Flappy Bird's viewport center and combo factor.
    if (warpFactor > 1.5) {
      const cx = width / 2;
      const cy = height / 2;
      const lineCount = 20;
      const maxR = Math.sqrt(cx * cx + cy * cy);
      const intensity = Math.min((warpFactor - 1.5) / 1.5, 1.0);

      ctx.save();
      ctx.strokeStyle = "rgba(0, 243, 255, " + (0.15 * intensity).toFixed(3) + ")";
      ctx.lineWidth = 1.2;

      for (let l = 0; l < lineCount; l++) {
        const angle = (l / lineCount) * Math.PI * 2 + (tick * 0.02);
        const innerR = 40 + (l * 17 + tick * 8) % (maxR * 0.5);
        const outerR = innerR + 40 * warpFactor;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.stroke();
      }
      ctx.restore();
    }

    // --- OCCASIONAL ISOLATED ABANDONED MEGASTRUCTURE SILHOUETTE ---
    const megaData = calculateMegastructureData(tick, width, height);
    if (megaData.visible) {
      drawCanvasMegastructure(ctx, megaData);
    }

    // --- DRAW ACTIVE PARTICLES (SPARKS & SHARDS) ---
    drawCanvasVisualParticles(ctx);

    // --- GLIDE ENERGY METER HUD OVERLAY ---
    const glideState = resolveGlideEnergyState(world, width, height);
    if (glideState) {
      const { ratio, isOverheated, barW, barH, bx, by, fillColor } = glideState;
      ctx.save();
      ctx.fillStyle = "rgba(10, 15, 25, 0.75)";
      ctx.fillRect(bx, by, barW, barH);

      ctx.fillStyle = fillColor;
      ctx.fillRect(bx, by, barW * ratio, barH);

      ctx.strokeStyle = isOverheated ? "#FF3300" : "#5A6173";
      ctx.lineWidth = 1.0;
      ctx.strokeRect(bx, by, barW, barH);

      if (isOverheated) {
        ctx.fillStyle = "#FF3300";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("THRUST OVERHEAT", width / 2, by - 4);
      }
      ctx.restore();
    }

    // --- SECTOR EVENT HUD OVERLAY BANNER ---
    const sectorInfo = resolveSectorEventInfo(gameState.currentSectorEvent ?? "none");
    if (sectorInfo) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 243, 255, 0.15)";
      ctx.fillRect(0, 10, width, 22);
      ctx.fillStyle = sectorInfo.textColor;
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(sectorInfo.bannerText, width / 2, 25);
      ctx.restore();
    }

    // --- CRT SCANLINES & SCREEN VIGNETTE ---
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
    for (let ly = 0; ly < height; ly += 3) {
      ctx.fillRect(0, ly, width, 1);
    }

    // Subtle dark edge vignette
    const vignGrad = getCachedCanvasGradient(ctx, `vign_${width}_${height}`, () => {
      const g = ctx.createRadialGradient(
        width / 2, height / 2, width * 0.4,
        width / 2, height / 2, width * 0.8
      );
      g.addColorStop(0, "rgba(0, 0, 0, 0)");
      g.addColorStop(1, "rgba(0, 0, 0, 0.45)");
      return g;
    });
    ctx.fillStyle = vignGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  },
};
