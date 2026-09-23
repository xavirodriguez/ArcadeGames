import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { ECHO_PALETTE } from "./EchoRunnerPalette";
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
    grad.addColorStop(0, ECHO_PALETTE.restorationWhite);
    grad.addColorStop(0.35, ECHO_PALETTE.restorationGold);
    grad.addColorStop(1, ECHO_PALETTE.corruptionAmber);
    gradientCache.set(key, grad);
  }
  return grad;
}

function drawCanvasHitFlashCircle(ctx: CanvasRenderingContext2D, radius: number): true {
  ctx.fillStyle = ECHO_PALETTE.restorationWhite;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return true;
}

function drawCanvasHitFlashRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): true {
  ctx.fillStyle = ECHO_PALETTE.restorationWhite;
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
    grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    grad.addColorStop(0.4, ECHO_PALETTE.restorationCyanGlow);
    grad.addColorStop(1, "rgba(0, 240, 255, 0)");
    gradientCache.set(key, grad);
  }
  return grad;
}

export const drawEchoBackground: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, elapsed } = resolveEchoBackgroundContext(world);

    // Deep Archive Void Background
    ctx.fillStyle = ECHO_PALETTE.archiveVoidDark;
    ctx.fillRect(0, 0, width, height);

    // Layer 1: Parallax Distant Memory Grid
    ctx.strokeStyle = ECHO_PALETTE.archiveGridLineSecondary;
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

    // Layer 2: Foreground Digital Matrix Grid
    ctx.strokeStyle = ECHO_PALETTE.archiveGridLine;
    const gridSize = 40;
    const offsetX = (elapsed * 15) % gridSize;
    const offsetY = (elapsed * 10) % gridSize;

    for (let x = offsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Layer 3: Memory Stream Data Pillars
    ctx.fillStyle = ECHO_PALETTE.archiveDataStream;
    for (let i = 0; i < 4; i++) {
      const px = ((i * 210 + elapsed * 20) % width);
      const py = ((i * 150 + elapsed * 35) % (height + 100)) - 50;
      ctx.fillRect(px, py, 12 + (i % 2) * 8, 40 + (i % 3) * 30);
    }

    // Ambient particles
    for (let i = 0; i < 6; i++) {
      const px = ((i * 143 + elapsed * 8) % width);
      const py = ((i * 187 + elapsed * 12) % height);
      ctx.fillStyle = i % 2 === 0 ? ECHO_PALETTE.restorationCyanGlow : ECHO_PALETTE.corruptionPurpleGlow;
      ctx.beginPath();
      ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
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

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.7 - hoverY, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isAttacking) {
      ctx.strokeStyle = ECHO_PALETTE.restorationCyan;
      ctx.lineWidth = 2;
      ctx.shadowColor = ECHO_PALETTE.restorationCyan;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.shadowColor = ECHO_PALETTE.restorationCyan;
    ctx.shadowBlur = 10;

    ctx.strokeStyle = ECHO_PALETTE.corruptionCrimson;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, -size * 0.5);
    ctx.lineTo(-size * 0.32, -size * 0.85);
    ctx.stroke();

    ctx.fillStyle = ECHO_PALETTE.corruptionCrimson;
    ctx.beginPath();
    ctx.arc(-size * 0.32, -size * 0.85, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ECHO_PALETTE.archiveSlate;
    ctx.strokeStyle = ECHO_PALETTE.restorationCyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -size * 0.4, size * 0.35, Math.PI, 0);
    ctx.lineTo(0, -size * 0.4);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = ECHO_PALETTE.corruptionCrimson;
    ctx.fillStyle = ECHO_PALETTE.corruptionCrimson;
    ctx.beginPath();
    ctx.ellipse(size * 0.08, -size * 0.45, size * 0.24, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = ECHO_PALETTE.restorationCyan;
    ctx.fillStyle = ECHO_PALETTE.archiveBorderDark;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6, 4);
    } else {
      ctx.rect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isAttacking ? ECHO_PALETTE.restorationWhite : ECHO_PALETTE.restorationCyan;
    ctx.beginPath();
    ctx.arc(0, size * 0.1, isAttacking ? size * 0.16 : size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    if (isAttacking) {
      ctx.fillStyle = ECHO_PALETTE.restorationCyan;
      ctx.fillRect(size * 0.1, -size * 0.05, size * 0.4, size * 0.18);
      ctx.fillStyle = ECHO_PALETTE.restorationWhite;
      ctx.beginPath();
      ctx.arc(size * 0.5, size * 0.04, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = ECHO_PALETTE.archiveBorderLight;
    ctx.beginPath();
    ctx.arc(leftLegX, leftLegY, size * 0.08, 0, Math.PI * 2);
    ctx.arc(rightLegX, rightLegY, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    if (!isGrounded && vy < -20) {
      ctx.fillStyle = ECHO_PALETTE.restorationCyan;
      ctx.beginPath();
      ctx.moveTo(-size * 0.15, leftLegY);
      ctx.lineTo(0, leftLegY + size * 0.35);
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

    const { size, elapsed, hoverOffset, strokeColor, fillColor } = fragCtx;

    ctx.save();
    ctx.translate(0, hoverOffset);
    ctx.rotate(elapsed * 1.5);

    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 8;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(size * 0.45, 0);
    ctx.lineTo(0, size * 0.6);
    ctx.lineTo(-size * 0.45, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ECHO_PALETTE.restorationWhite;
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

    ctx.shadowColor = ECHO_PALETTE.restorationGold;
    ctx.shadowBlur = 15;

    ctx.strokeStyle = ECHO_PALETTE.restorationGoldGlow;
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

    const statusColor = isActive ? ECHO_PALETTE.archiveNodeActive : ECHO_PALETTE.archiveNodeInactive;
    ctx.shadowColor = statusColor;
    ctx.shadowBlur = 10;

    ctx.fillStyle = ECHO_PALETTE.archiveSlate;
    ctx.strokeStyle = ECHO_PALETTE.archiveBorderLight;
    ctx.lineWidth = 2;
    ctx.fillRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);
    ctx.strokeRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);

    ctx.fillStyle = ECHO_PALETTE.archiveBorderDark;
    ctx.fillRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);
    ctx.strokeRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8);

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

export const drawPulseAttack: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 35;

    ctx.save();

    ctx.shadowColor = ECHO_PALETTE.restorationCyan;
    ctx.shadowBlur = 12;

    const grad = getPulseAttackGradient(ctx, size);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size, -Math.PI * 0.35, Math.PI * 0.35);
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
    const { size, isHitFlash, state } = drawCtx;

    ctx.save();

    if (isHitFlash) {
      return drawCanvasHitFlashCircle(ctx, size * 0.5);
    }

    const { isAlert, isAttack, glowColor } = resolveSentinelVisualState(state);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    if (isAlert) {
      const pulse = Math.sin(world.tick * 0.5) * 3;
      ctx.fillStyle = ECHO_PALETTE.corruptionAmber;
      ctx.strokeStyle = ECHO_PALETTE.restorationGold;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -size * 0.8 - pulse);
      ctx.lineTo(size * 0.18, -size * 1.1 - pulse);
      ctx.lineTo(-size * 0.18, -size * 1.1 - pulse);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = ECHO_PALETTE.corruptionAmber;
      ctx.lineWidth = 1.5;
      const ringRadius = size * (0.8 + 0.3 * Math.sin(world.tick * 0.3));
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (isAttack) {
      ctx.strokeStyle = ECHO_PALETTE.corruptionCrimson;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = ECHO_PALETTE.archiveBorderDark;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isAlert && Math.floor(world.tick / 4) % 2 === 0 ? ECHO_PALETTE.restorationWhite : glowColor;
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = ECHO_PALETTE.archiveBorderLight;
    ctx.beginPath();
    ctx.moveTo(-size * 0.45, size * 0.1);
    ctx.lineTo(-size * 0.6, size * 0.3);
    ctx.moveTo(size * 0.45, size * 0.1);
    ctx.lineTo(size * 0.6, size * 0.3);
    ctx.stroke();

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

    const { isAlert, isAttack, glowColor, scaleX, scaleY } = resolveHopperVisualState(state);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;

    if (isAlert) {
      ctx.fillStyle = ECHO_PALETTE.corruptionAmber;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.7);
      ctx.lineTo(-size * 0.2, -size * 0.95);
      ctx.lineTo(size * 0.2, -size * 0.95);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = ECHO_PALETTE.archiveSlate;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    ctx.scale(scaleX, scaleY);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.15, size * 0.3);
    ctx.lineTo(size * 0.15, size * 0.3);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size * 0.35, -size * 0.4, size * 0.7, size * 0.45, 3);
    } else {
      ctx.rect(-size * 0.35, -size * 0.4, size * 0.7, size * 0.45);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = glowColor;
    ctx.fillRect(-size * 0.2, -size * 0.28, size * 0.4, size * 0.1);

    ctx.restore();
  }
};

export const drawWatcher: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveEchoDrawContext(world, entity, 26);
    if (!drawCtx) return;
    const { size, isHitFlash, state } = drawCtx;

    ctx.save();

    if (isHitFlash) {
      return drawCanvasHitFlashCircle(ctx, size * 0.4);
    }

    const { isAlert, isAttack, glowColor } = resolveWatcherVisualState(state);

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    if (isAlert || isAttack) {
      ctx.fillStyle = isAttack ? ECHO_PALETTE.corruptionCrimsonGlow : "rgba(249, 115, 22, 0.15)";
      ctx.strokeStyle = isAttack ? ECHO_PALETTE.corruptionCrimson : ECHO_PALETTE.corruptionAmber;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.05);
      ctx.arc(0, -size * 0.05, size * 2.2, -Math.PI * 0.2, Math.PI * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = ECHO_PALETTE.archiveBorderDark;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, size * 0.3, size * 0.3, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ECHO_PALETTE.archiveSlate;
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isAlert || isAttack ? glowColor : "rgba(59, 130, 246, 0.4)";
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isAlert && Math.floor(world.tick / 3) % 2 === 0 ? ECHO_PALETTE.restorationWhite : "#60a5fa";
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

export const drawCharger: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawCtx = resolveEchoDrawContext(world, entity, 28);
    if (!drawCtx) return;
    const { size, isHitFlash, state } = drawCtx;

    ctx.save();

    if (isHitFlash) {
      return drawCanvasHitFlashRect(ctx, -size * 0.5, -size * 0.3, size, size * 0.7);
    }

    const { isStunned, isAlert, isAttack, glowColor } = resolveChargerVisualState(state);

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;

    if (isAlert) {
      ctx.fillStyle = ECHO_PALETTE.corruptionAmber;
      ctx.strokeStyle = ECHO_PALETTE.restorationGold;
      ctx.lineWidth = 1.5;

      const pulse = (world.tick % 8) * 2;
      ctx.beginPath();
      ctx.moveTo(size * 0.5 + pulse, -size * 0.1);
      ctx.lineTo(size * 0.7 + pulse, 0);
      ctx.lineTo(size * 0.5 + pulse, size * 0.1);
      ctx.stroke();
    } else if (isAttack) {
      ctx.strokeStyle = ECHO_PALETTE.corruptionCrimsonGlow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.2);
      ctx.lineTo(-size * 0.9, -size * 0.2);
      ctx.moveTo(-size * 0.5, size * 0.1);
      ctx.lineTo(-size * 0.85, size * 0.1);
      ctx.stroke();
    }

    ctx.fillStyle = ECHO_PALETTE.archiveSlate;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size * 0.3);
    ctx.lineTo(size * 0.5, -size * 0.3);
    ctx.lineTo(size * 0.4, size * 0.4);
    ctx.lineTo(-size * 0.4, size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = glowColor;
    ctx.fillRect(-size * 0.25, -size * 0.1, size * 0.1, size * 0.3);
    ctx.fillRect(size * 0.15, -size * 0.1, size * 0.1, size * 0.3);

    if (isStunned) {
      const elapsed = world.tick * 0.1;
      ctx.strokeStyle = ECHO_PALETTE.restorationGold;
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
