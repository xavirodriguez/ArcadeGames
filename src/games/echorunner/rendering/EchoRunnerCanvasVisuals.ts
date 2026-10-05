import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { ECHO_PALETTE } from "./EchoRunnerPalette";
import { SOLAR_GARDEN_PALETTE } from "../../shared/rendering/SolarGardenPalette";
import { drawSolarLeafWing, drawBiomechanicalChitin } from "../../shared/rendering/SolarGardenMotifs";
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
    grad.addColorStop(0, SOLAR_GARDEN_PALETTE.solarWhite);
    grad.addColorStop(0.35, SOLAR_GARDEN_PALETTE.solarGold);
    grad.addColorStop(1, SOLAR_GARDEN_PALETTE.solarCyan);
    gradientCache.set(key, grad);
  }
  return grad;
}

function drawCanvasHitFlashCircle(ctx: CanvasRenderingContext2D, radius: number): true {
  ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarWhite;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return true;
}

function drawCanvasHitFlashRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): true {
  ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarWhite;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.restore();
  return true;
}

function getPulseAttackGradient(ctx: CanvasRenderingContext2D, size: number): CanvasGradient {
  if (lastCtx !== ctx) {
    lastCtx = ctx;
    gradientCache.clear();
  }
  const key = 2000 + size;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size);
    grad.addColorStop(0, "rgba(240, 244, 248, 0.95)");
    grad.addColorStop(0.4, SOLAR_GARDEN_PALETTE.solarCyanGlow);
    grad.addColorStop(0.8, SOLAR_GARDEN_PALETTE.solarGoldGlow);
    grad.addColorStop(1, "rgba(0, 229, 255, 0)");
    gradientCache.set(key, grad);
  }
  return grad;
}

export const drawEchoBackground: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, elapsed } = resolveEchoBackgroundContext(world);

    // Layer 0: Sky / Artificial Sun Atmosphere Void
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, SOLAR_GARDEN_PALETTE.skyDawn);
    skyGrad.addColorStop(1, SOLAR_GARDEN_PALETTE.skyMid);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Distant Artificial Sun Halo
    ctx.save();
    ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarGoldGlow;
    ctx.shadowColor = SOLAR_GARDEN_PALETTE.solarGold;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(width * 0.75, height * 0.25, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Layer 1: Parallax Distant Solar Structures & Porcelain Mountains (0.15x)
    ctx.fillStyle = "rgba(61, 90, 69, 0.35)";
    ctx.strokeStyle = SOLAR_GARDEN_PALETTE.solarGold;
    ctx.lineWidth = 1;

    const bgOffsetX1 = (elapsed * 8) % 300;
    for (let i = -1; i * 300 < width + 300; i++) {
      const px = i * 300 - bgOffsetX1;
      ctx.beginPath();
      ctx.moveTo(px, height);
      ctx.lineTo(px + 80, height - 120);
      ctx.lineTo(px + 140, height - 160);
      ctx.lineTo(px + 220, height - 90);
      ctx.lineTo(px + 300, height);
      ctx.fill();
    }

    // Layer 2: Solar Forest & Glass Canopy Architecture (0.35x)
    ctx.fillStyle = "rgba(27, 38, 59, 0.5)";
    ctx.strokeStyle = SOLAR_GARDEN_PALETTE.glassBorder;
    ctx.lineWidth = 1;

    const bgOffsetX2 = (elapsed * 18) % 200;
    for (let i = -1; i * 200 < width + 200; i++) {
      const px = i * 200 - bgOffsetX2;
      // Solar Trees / Crystal Structures
      ctx.beginPath();
      ctx.rect(px + 60, height - 200, 15, 200);
      ctx.arc(px + 67, height - 210, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Layer 3: Foreground Floating Bio-Spore & Solar Pollen Particles
    for (let i = 0; i < 8; i++) {
      const px = ((i * 123 + elapsed * 15) % width);
      const py = ((i * 177 + elapsed * 10) % height);
      ctx.fillStyle = i % 2 === 0 ? SOLAR_GARDEN_PALETTE.solarGold : SOLAR_GARDEN_PALETTE.bioMagenta;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

export const drawEchoPlayer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const playerCtx = resolveEchoPlayerDrawContext(world, entity);
    if (!playerCtx) return;

    const { render, size, vx, vy, isGrounded, isAttacking, health } = playerCtx;

    ctx.save();

    const flashState = resolveHitFlash(render, render.color || "cyan", 1.0);
    if (flashState.isFlashing) {
      return drawCanvasHitFlashCircle(ctx, size * 0.65);
    }

    const invState = resolveInvulnerabilityPulse(health?.invulnerableRemaining, 1.0, { mode: "tick", tick: world.tick, pulseDivisor: 4, dimOpacity: 0.3 });
    if (invState.isInvulnerable) {
      ctx.globalAlpha = invState.opacity;
    }

    const { tiltAngle, hoverY, leftLegX, leftLegY, rightLegX, rightLegY } = calculateEchoPlayerPose(size, isGrounded, vx, vy, world.tick);

    ctx.translate(0, hoverY);
    ctx.rotate(tiltAngle);

    // Subtle Ground Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.7 - hoverY, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Restoration Pulse Aura when Attacking
    if (isAttacking) {
      ctx.strokeStyle = SOLAR_GARDEN_PALETTE.solarCyan;
      ctx.lineWidth = 2;
      ctx.shadowColor = SOLAR_GARDEN_PALETTE.solarCyan;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Solar Wings / Leaf Trim
    drawSolarLeafWing(ctx, size * 0.7, size * 0.35, Math.PI * 0.2);
    drawSolarLeafWing(ctx, size * 0.7, size * 0.35, -Math.PI * 0.2);

    // Porcelain Body Shell
    ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarWhite;
    ctx.strokeStyle = SOLAR_GARDEN_PALETTE.solarGold;
    ctx.lineWidth = 2;
    ctx.shadowColor = SOLAR_GARDEN_PALETTE.solarGold;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size * 0.3, -size * 0.35, size * 0.6, size * 0.7, 6);
    } else {
      ctx.rect(-size * 0.3, -size * 0.35, size * 0.6, size * 0.7);
    }
    ctx.fill();
    ctx.stroke();

    // Glowing Solar Cyan Core
    ctx.fillStyle = isAttacking ? SOLAR_GARDEN_PALETTE.solarWhite : SOLAR_GARDEN_PALETTE.solarCyan;
    ctx.shadowColor = SOLAR_GARDEN_PALETTE.solarCyan;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, isAttacking ? size * 0.18 : size * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // Leg Joints
    ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarGold;
    ctx.beginPath();
    ctx.arc(leftLegX, leftLegY, size * 0.08, 0, Math.PI * 2);
    ctx.arc(rightLegX, rightLegY, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

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

    // Solar Leaf Crystal Fragment
    drawSolarLeafWing(ctx, size * 0.8, size * 0.4, 0);

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

    ctx.shadowColor = SOLAR_GARDEN_PALETTE.solarGold;
    ctx.shadowBlur = 16;

    ctx.strokeStyle = SOLAR_GARDEN_PALETTE.solarGoldGlow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.85, size * 0.35, elapsed * 2, 0, Math.PI * 2);
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

    const statusColor = isActive ? SOLAR_GARDEN_PALETTE.solarCyan : SOLAR_GARDEN_PALETTE.bioMagenta;
    ctx.shadowColor = statusColor;
    ctx.shadowBlur = 12;

    // Ceramic Pillar Base
    ctx.fillStyle = SOLAR_GARDEN_PALETTE.solarWhite;
    ctx.strokeStyle = SOLAR_GARDEN_PALETTE.solarGold;
    ctx.lineWidth = 2;
    ctx.fillRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);
    ctx.strokeRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);

    ctx.fillStyle = SOLAR_GARDEN_PALETTE.gardenGreen;
    ctx.fillRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);
    ctx.strokeRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);

    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(0, -size * 0.2, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawPulseAttack: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 35;

    ctx.save();

    ctx.shadowColor = SOLAR_GARDEN_PALETTE.solarCyan;
    ctx.shadowBlur = 16;

    const grad = getPulseAttackGradient(ctx, size);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
};

export const drawSentinel: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveEchoDrawContext(world, entity, 22);
    if (!drawCtx) return;
    const { size, isHitFlash } = drawCtx;

    ctx.save();

    if (isHitFlash) {
      return drawCanvasHitFlashCircle(ctx, size * 0.5);
    }

    // Biomechanical Surveillance Flower / Sentinel
    drawBiomechanicalChitin(ctx, size * 0.45, false);

    // Glowing Central Organ Eye
    ctx.fillStyle = SOLAR_GARDEN_PALETTE.bioMagenta;
    ctx.shadowColor = SOLAR_GARDEN_PALETTE.bioMagenta;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawHopper: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveEchoDrawContext(world, entity, 24);
    if (!drawCtx) return;
    const { size, isHitFlash, state } = drawCtx;

    ctx.save();

    if (isHitFlash) {
      return drawCanvasHitFlashRect(ctx, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
    }

    const { scaleX, scaleY } = resolveHopperVisualState(state);

    ctx.scale(scaleX, scaleY);
    drawBiomechanicalChitin(ctx, size * 0.4, true);

    ctx.restore();
  }
};

export const drawWatcher: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveEchoDrawContext(world, entity, 26);
    if (!drawCtx) return;
    const { size, isHitFlash } = drawCtx;

    ctx.save();

    if (isHitFlash) {
      return drawCanvasHitFlashCircle(ctx, size * 0.4);
    }

    // Organic Sensor Seed / Watcher
    drawBiomechanicalChitin(ctx, size * 0.42, false);

    ctx.restore();
  }
};

export const drawCharger: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveEchoDrawContext(world, entity, 28);
    if (!drawCtx) return;
    const { size, isHitFlash } = drawCtx;

    ctx.save();

    if (isHitFlash) {
      return drawCanvasHitFlashRect(ctx, -size * 0.5, -size * 0.3, size, size * 0.7);
    }

    // Armoured Biomechanical Beetle / Charger
    drawBiomechanicalChitin(ctx, size * 0.55, true);

    ctx.restore();
  }
};
