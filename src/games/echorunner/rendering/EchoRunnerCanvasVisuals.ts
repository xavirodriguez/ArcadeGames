import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { ECHO_PALETTE } from "./EchoRunnerPalette";
import { SOLAR_GARDEN_THEME, SOLAR_GARDEN_VARIANTS } from "../../../theme/solarGardenTheme";
import { SOLAR_GARDEN_DEBUG_FLAGS } from "../../../theme/solarGardenDebug";
import { resolveHitFlash, resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import {
  calculateEchoPlayerPose,
  resolveHopperVisualState,
  resolveSentinelVisualState,
  resolveWatcherVisualState,
  resolveChargerVisualState,
  resolveEchoDrawContext,
  resolveEchoPlayerDrawContext,
  resolveEchoMemoryFragmentDrawContext,
  resolveEchoCollectibleDrawContext,
  resolveEchoCheckpointDrawContext,
  resolveEchoBackgroundContext,
} from "./EchoRunnerVisualUtils";
import {
  computeBiomechanicalDeformation,
  drawBiomechanicalChitinPlate,
  drawBiomechanicalEye
} from "../../shared/rendering/SolarGardenVisuals";

const gradientCache = new Map<number, CanvasGradient>();
let lastCtx: CanvasRenderingContext2D | null = null;

function getMemoryCoreGradient(ctx: CanvasRenderingContext2D, size: number): CanvasGradient {
  if (lastCtx !== ctx) {
    lastCtx = ctx;
    gradientCache.clear();
  }
  const key = 1000 + size;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 0.5);
    grad.addColorStop(0, SOLAR_GARDEN_THEME.SOLAR_WHITE);
    grad.addColorStop(0.35, SOLAR_GARDEN_THEME.SOLAR_GOLD);
    grad.addColorStop(1, SOLAR_GARDEN_THEME.THREAT_ORANGE);
    gradientCache.set(key, grad);
  }
  return grad;
}

function drawCanvasHitFlashCircle(ctx: CanvasRenderingContext2D, radius: number): true {
  ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_WHITE;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return true;
}

function drawCanvasHitFlashRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): true {
  ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_WHITE;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.restore();
  return true;
}

export const drawEchoBackground: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, elapsed } = resolveEchoBackgroundContext(world);

    // Deep Solar Garden Void Background
    ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_BLACK;
    ctx.fillRect(0, 0, width, height);

    // Layer 1: Parallax Distant Solar Forest / Grid Lines
    ctx.strokeStyle = "rgba(45, 69, 52, 0.25)";
    ctx.lineWidth = 1;

    const bgGridSize = 80;
    const bgOffsetX = (elapsed * 5) % bgGridSize;
    const bgOffsetY = (elapsed * 3) % bgGridSize;

    for (let x = bgOffsetX; x < width; x += bgGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = bgOffsetY; y < height; y += bgGridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Layer 2: Architecture Columns & Porcelain Pillars
    ctx.fillStyle = "rgba(240, 244, 248, 0.04)";
    for (let i = 0; i < 5; i++) {
      const px = ((i * 180 + elapsed * 12) % (width + 120)) - 60;
      ctx.fillRect(px, 0, 35, height);
      ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, 0, 35, height);
    }

    // Ambient floating solar garden spores
    if (SOLAR_GARDEN_DEBUG_FLAGS.particles) {
      for (let i = 0; i < 8; i++) {
        const px = ((i * 143 + elapsed * 10) % width);
        const py = ((i * 187 + elapsed * 14) % height);
        ctx.fillStyle = i % 2 === 0 ? SOLAR_GARDEN_THEME.SOLAR_CYAN : SOLAR_GARDEN_THEME.SOLAR_GOLD;
        ctx.globalAlpha = 0.4 + 0.2 * Math.sin(elapsed * 2 + i);
        ctx.beginPath();
        ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }
  }
};

/**
 * Echo Runner Player — Restoration Unit
 * WHITE PORCELAIN + GOLD JOINTS + CRYSTALLINE CORE + SEED / MANTIS SILHOUETTE
 */
export const drawEchoPlayer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const playerCtx = resolveEchoPlayerDrawContext(world, entity);
    if (!playerCtx) return;

    const { render, size, vx, vy, isGrounded, isAttacking, health } = playerCtx;

    ctx.save();

    const flashState = resolveHitFlash(render, render.color || "cyan", 1.0);
    if (flashState.isFlashing && SOLAR_GARDEN_DEBUG_FLAGS.hitFlash) {
      return drawCanvasHitFlashCircle(ctx, size * 0.65);
    }

    const invState = resolveInvulnerabilityPulse(health?.invulnerableRemaining, 1.0, { mode: "tick", tick: world.tick, pulseDivisor: 4, dimOpacity: 0.3 });
    if (invState.isInvulnerable) {
      ctx.globalAlpha = invState.opacity;
    }

    const { tiltAngle, hoverY, leftLegX, leftLegY, rightLegX, rightLegY } = calculateEchoPlayerPose(size, isGrounded, vx, vy, world.tick);

    ctx.translate(0, hoverY);
    ctx.rotate(tiltAngle);

    // Ground Drop Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.7 - hoverY, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pulse attack field aura
    if (isAttacking) {
      ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_CYAN;
      ctx.lineWidth = 2;
      ctx.shadowColor = SOLAR_GARDEN_THEME.SOLAR_CYAN;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Mantis Antennae / Crown Wings
    ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.15, -size * 0.5);
    ctx.lineTo(-size * 0.3, -size * 0.9);
    ctx.moveTo(size * 0.15, -size * 0.5);
    ctx.lineTo(size * 0.3, -size * 0.9);
    ctx.stroke();

    ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_CYAN;
    ctx.beginPath();
    ctx.arc(-size * 0.3, -size * 0.9, 2.5, 0, Math.PI * 2);
    ctx.arc(size * 0.3, -size * 0.9, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Porcelain Head (Upper Helmet/Mantle)
    ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_WHITE;
    ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(0, -size * 0.45, size * 0.35, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Visor / Crystalline Sensor Lens
    ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_CYAN;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.48, size * 0.22, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main Torso Armor (Porcelain Mantis Shell)
    ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_WHITE;
    ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.25);
    ctx.lineTo(size * 0.3, 0);
    ctx.lineTo(size * 0.2, size * 0.45);
    ctx.lineTo(-size * 0.2, size * 0.45);
    ctx.lineTo(-size * 0.3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central Crystalline Core (Solar Cyan / Gold Emission)
    ctx.fillStyle = isAttacking ? SOLAR_GARDEN_THEME.SOLAR_WHITE : SOLAR_GARDEN_THEME.SOLAR_CYAN;
    ctx.shadowColor = SOLAR_GARDEN_THEME.SOLAR_CYAN;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, size * 0.05, isAttacking ? size * 0.18 : size * 0.13, 0, Math.PI * 2);
    ctx.fill();

    // Golden Hinge Joints for Limbs
    ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
    ctx.beginPath();
    ctx.arc(leftLegX, leftLegY, size * 0.09, 0, Math.PI * 2);
    ctx.arc(rightLegX, rightLegY, size * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // Jet / Air Jump Thruster Plume
    if (!isGrounded && vy < -20) {
      ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_CYAN;
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, leftLegY);
      ctx.lineTo(0, leftLegY + size * 0.4);
      ctx.lineTo(size * 0.15, rightLegY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
};

export const drawMemoryFragment: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const fragCtx = resolveEchoMemoryFragmentDrawContext(world, entity);
    if (!fragCtx) return;

    const { size, elapsed, hoverOffset } = fragCtx;

    ctx.save();
    ctx.translate(0, hoverOffset);
    ctx.rotate(elapsed * 1.5);

    ctx.shadowColor = SOLAR_GARDEN_THEME.SOLAR_CYAN;
    ctx.shadowBlur = 8;

    ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_WHITE;
    ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(size * 0.45, 0);
    ctx.lineTo(0, size * 0.6);
    ctx.lineTo(-size * 0.45, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_CYAN;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.25);
    ctx.lineTo(size * 0.18, 0);
    ctx.lineTo(0, size * 0.25);
    ctx.lineTo(-size * 0.18, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
};

export const drawMemoryCore: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const coreCtx = resolveEchoCollectibleDrawContext(world, entity, 24);
    if (!coreCtx) return;

    const { size, elapsed, hoverOffset } = coreCtx;

    ctx.save();
    ctx.translate(0, hoverOffset);

    ctx.shadowColor = SOLAR_GARDEN_THEME.SOLAR_GOLD;
    ctx.shadowBlur = 15;

    ctx.strokeStyle = SOLAR_GARDEN_VARIANTS.SOLAR_GOLD_GLOW;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.3, elapsed * 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.3, -elapsed * 1.5, 0, Math.PI * 2);
    ctx.stroke();

    const gradient = getMemoryCoreGradient(ctx, size);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawCheckpointNode: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const cpCtx = resolveEchoCheckpointDrawContext(world, entity);
    if (!cpCtx) return;

    const { size, isActive } = cpCtx;

    ctx.save();

    const statusColor = isActive ? SOLAR_GARDEN_THEME.SOLAR_GOLD : SOLAR_GARDEN_THEME.THREAT_ORANGE;
    ctx.shadowColor = statusColor;
    ctx.shadowBlur = 10;

    // Porcelain Base Plate
    ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_WHITE;
    ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
    ctx.lineWidth = 2;
    ctx.fillRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);
    ctx.strokeRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);

    // Dark Structure Core
    ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_BLACK;
    ctx.fillRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);
    ctx.strokeRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);

    // Active Gold / Threat Orange Indicator Ring
    ctx.fillStyle = statusColor;
    ctx.fillRect(-size * 0.18, -size * 0.4, size * 0.36, size * 0.35);

    ctx.fillStyle = statusColor;
    ctx.beginPath();
    if (isActive) {
      ctx.arc(0, -size * 0.22, size * 0.08, 0, Math.PI * 2);
    } else {
      ctx.fillRect(-size * 0.04, -size * 0.3, size * 0.08, size * 0.16);
    }
    ctx.fill();

    ctx.restore();
  }
};

/**
 * Crystal Annihilation Pulse & Golden Energy Attraction
 */
export const drawPulseAttack: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 35;
    const progress = Math.min(1.0, (world.tick % 10) / 10); // ~300ms cycle

    ctx.save();

    // 1. Cyan Ring transitioning to Gold
    const ringRadius = size * (0.3 + 0.8 * progress);
    const ringAlpha = 1.0 - progress;

    const ringGrad = ctx.createRadialGradient(0, 0, ringRadius * 0.4, 0, 0, ringRadius);
    ringGrad.addColorStop(0, "rgba(0, 229, 255, 0.95)");
    ringGrad.addColorStop(0.5, "rgba(230, 184, 0, 0.8)");
    ringGrad.addColorStop(1, "rgba(230, 184, 0, 0)");

    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Corruption Fracture — 6 Floating Crystal Fragments
    const fragmentCount = 6;
    for (let i = 0; i < fragmentCount; i++) {
      const angle = (i * Math.PI * 2) / fragmentCount + progress * 0.5;
      const dist = size * 0.85 * progress;
      const fx = Math.cos(angle) * dist;
      const fy = Math.sin(angle) * dist;
      const fragSize = 3.5;

      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(angle + progress * 2.5);

      ctx.fillStyle = i % 2 === 0 ? SOLAR_GARDEN_THEME.SOLAR_CYAN : SOLAR_GARDEN_THEME.SOLAR_WHITE;
      ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(0, -fragSize * 1.5);
      ctx.lineTo(fragSize, 0);
      ctx.lineTo(0, fragSize * 1.5);
      ctx.lineTo(-fragSize, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // 3. Golden Energy Attraction — Particles accelerating toward center
    if (SOLAR_GARDEN_DEBUG_FLAGS.particles) {
      const attrCount = 8;
      for (let i = 0; i < attrCount; i++) {
        const startAngle = (i * Math.PI * 2) / attrCount;
        const inwardProgress = (progress + i / attrCount) % 1.0;
        const attrDist = size * (1.2 - inwardProgress * 1.0);
        const ax = Math.cos(startAngle) * attrDist;
        const ay = Math.sin(startAngle) * attrDist;

        ctx.fillStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
        ctx.globalAlpha = Math.sin(inwardProgress * Math.PI) * ringAlpha;
        ctx.beginPath();
        ctx.arc(ax, ay, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
};

/**
 * Sentinel Enemy — Biomechanical flying drone with dark chitin shell and magenta eye.
 */
export const drawSentinel: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveEchoDrawContext(world, entity, 22);
    if (!drawCtx) return;
    const { size, isHitFlash, state } = drawCtx;

    ctx.save();

    if (isHitFlash && SOLAR_GARDEN_DEBUG_FLAGS.hitFlash) {
      return drawCanvasHitFlashCircle(ctx, size * 0.5);
    }

    const { isAlert, isAttack } = resolveSentinelVisualState(state);

    if (isAlert) {
      const pulse = Math.sin(world.tick * 0.5) * 3;
      ctx.fillStyle = SOLAR_GARDEN_THEME.THREAT_ORANGE;
      ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -size * 0.8 - pulse);
      ctx.lineTo(size * 0.18, -size * 1.1 - pulse);
      ctx.lineTo(-size * 0.18, -size * 1.1 - pulse);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Outer Chitin Armor Plates with Magenta Muscle accent
    drawBiomechanicalChitinPlate(ctx, 0, 0, size * 0.9, size * 0.8, world.tick * 0.05, SOLAR_GARDEN_THEME.BIO_MAGENTA);

    // Central Corrupted Eye Lens
    drawBiomechanicalEye(ctx, 0, -size * 0.05, size * 0.2, world.tick * 0.1, isAttack ? 0.1 : 1.0);

    ctx.restore();
  }
};

/**
 * Hopper Enemy — Insectoid ground pouncer with heavy chitin legs.
 */
export const drawHopper: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveEchoDrawContext(world, entity, 24);
    if (!drawCtx) return;
    const { size, isHitFlash, state } = drawCtx;

    ctx.save();

    if (isHitFlash && SOLAR_GARDEN_DEBUG_FLAGS.hitFlash) {
      return drawCanvasHitFlashRect(ctx, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
    }

    const { scaleX, scaleY } = resolveHopperVisualState(state);
    ctx.scale(scaleX, scaleY);

    // Dark Chitin Body Shell
    drawBiomechanicalChitinPlate(ctx, 0, -size * 0.15, size * 0.8, size * 0.6, world.tick * 0.08, SOLAR_GARDEN_THEME.BIO_ACID);

    ctx.restore();
  }
};

/**
 * Watcher Enemy — Biomechanical sensor turret with dark chitin eyelids.
 */
export const drawWatcher: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveEchoDrawContext(world, entity, 26);
    if (!drawCtx) return;
    const { size, isHitFlash, state } = drawCtx;

    ctx.save();

    if (isHitFlash && SOLAR_GARDEN_DEBUG_FLAGS.hitFlash) {
      return drawCanvasHitFlashCircle(ctx, size * 0.4);
    }

    const { isAlert, isAttack } = resolveWatcherVisualState(state);

    if (isAlert || isAttack) {
      ctx.fillStyle = isAttack ? SOLAR_GARDEN_VARIANTS.BIO_MAGENTA_GLOW : "rgba(255, 59, 0, 0.15)";
      ctx.strokeStyle = isAttack ? SOLAR_GARDEN_THEME.BIO_MAGENTA : SOLAR_GARDEN_THEME.THREAT_ORANGE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.05);
      ctx.arc(0, -size * 0.05, size * 2.2, -Math.PI * 0.2, Math.PI * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Biomechanical Eye and Chitin Base
    ctx.fillStyle = SOLAR_GARDEN_THEME.BIO_BLACK;
    ctx.fillRect(-size * 0.35, size * 0.15, size * 0.7, size * 0.3);

    drawBiomechanicalEye(ctx, 0, -size * 0.05, size * 0.28, world.tick * 0.08);

    ctx.restore();
  }
};

/**
 * Charger Enemy — Battering ram enemy with thick chitin horn plates.
 */
export const drawCharger: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveEchoDrawContext(world, entity, 28);
    if (!drawCtx) return;
    const { size, isHitFlash, state } = drawCtx;

    ctx.save();

    if (isHitFlash && SOLAR_GARDEN_DEBUG_FLAGS.hitFlash) {
      return drawCanvasHitFlashRect(ctx, -size * 0.5, -size * 0.3, size, size * 0.7);
    }

    const { isStunned, isAttack } = resolveChargerVisualState(state);

    // Heavy Chitin Battering Ram Shell
    drawBiomechanicalChitinPlate(ctx, 0, 0, size, size * 0.7, world.tick * 0.05, isAttack ? SOLAR_GARDEN_THEME.BIO_ACID : SOLAR_GARDEN_THEME.BIO_MAGENTA);

    if (isStunned) {
      const elapsed = world.tick * 0.1;
      ctx.strokeStyle = SOLAR_GARDEN_THEME.SOLAR_GOLD;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const angle = elapsed + (i * Math.PI * 2) / 3;
        const sx = Math.cos(angle) * (size * 0.6);
        const sy = Math.sin(angle) * (size * 0.2) - size * 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
};
