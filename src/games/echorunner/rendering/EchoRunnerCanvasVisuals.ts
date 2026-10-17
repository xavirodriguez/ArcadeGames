import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { resolveHitFlash, resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import {
  calculateEchoPlayerPose,
  resolveEchoPlayerDrawContext,
  resolveEchoBackgroundContext,
} from "./EchoRunnerVisualUtils";

import { drawCanvasHitFlashCircle } from "../../shared/rendering/PlatformerSharedVisuals";

export {
  drawMemoryFragment,
  drawMemoryCore,
  drawCheckpointNode,
  drawPulseAttack,
  drawSentinel,
  drawHopper,
  drawWatcher,
  drawCharger,
} from "../../shared/rendering/PlatformerSharedVisuals";

export const drawEchoBackground: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const { width, height, elapsed, palette } = resolveEchoBackgroundContext(world);

    // Deep Archive Void Background
    ctx.fillStyle = palette.archiveVoidDark;
    ctx.fillRect(0, 0, width, height);

    // Layer 1: Parallax Distant Memory Grid
    ctx.strokeStyle = palette.archiveGridLineSecondary;
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
    ctx.strokeStyle = palette.archiveGridLine;
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
    ctx.fillStyle = palette.archiveDataStream;
    for (let i = 0; i < 4; i++) {
      const px = ((i * 210 + elapsed * 20) % width);
      const py = ((i * 150 + elapsed * 35) % (height + 100)) - 50;
      ctx.fillRect(px, py, 12 + (i % 2) * 8, 40 + (i % 3) * 30);
    }

    // Ambient particles
    for (let i = 0; i < 6; i++) {
      const px = ((i * 143 + elapsed * 8) % width);
      const py = ((i * 187 + elapsed * 12) % height);
      ctx.fillStyle = i % 2 === 0 ? palette.restorationCyanGlow : palette.corruptionPurpleGlow;
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

    const { render, size, vx, vy, isGrounded, isAttacking, health, palette } = playerCtx;

    ctx.save();

    const flashState = resolveHitFlash(render, render.color || palette.restorationCyan, 1.0);
    if (flashState.isFlashing) {
      return drawCanvasHitFlashCircle(ctx, size * 0.65, palette.restorationWhite);
    }

    const invState = resolveInvulnerabilityPulse(health?.invulnerableRemaining, 1.0, { mode: "tick", tick: world.tick, pulseDivisor: 4, dimOpacity: 0.3 });
    if (invState.isInvulnerable) {
      ctx.globalAlpha = invState.opacity;
    }

    const { tiltAngle, hoverY, leftLegX, leftLegY, rightLegX, rightLegY } = calculateEchoPlayerPose(size, isGrounded, vx, vy, world.tick);

    ctx.translate(0, hoverY);
    ctx.rotate(tiltAngle);

    ctx.fillStyle = palette.archiveVoidDark;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.7 - hoverY, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isAttacking) {
      ctx.strokeStyle = palette.restorationCyan;
      ctx.lineWidth = 2;
      ctx.shadowColor = palette.restorationCyan;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.shadowColor = palette.restorationCyan;
    ctx.shadowBlur = 10;

    ctx.strokeStyle = palette.corruptionCrimson;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, -size * 0.5);
    ctx.lineTo(-size * 0.32, -size * 0.85);
    ctx.stroke();

    ctx.fillStyle = palette.corruptionCrimson;
    ctx.beginPath();
    ctx.arc(-size * 0.32, -size * 0.85, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.archiveSlate;
    ctx.strokeStyle = palette.restorationCyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -size * 0.4, size * 0.35, Math.PI, 0);
    ctx.lineTo(0, -size * 0.4);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = palette.corruptionCrimson;
    ctx.fillStyle = palette.corruptionCrimson;
    ctx.beginPath();
    ctx.ellipse(size * 0.08, -size * 0.45, size * 0.24, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = palette.restorationCyan;
    ctx.fillStyle = palette.archiveBorderDark;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6, 4);
    } else {
      ctx.rect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isAttacking ? palette.restorationWhite : palette.restorationCyan;
    ctx.beginPath();
    ctx.arc(0, size * 0.1, isAttacking ? size * 0.16 : size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    if (isAttacking) {
      ctx.fillStyle = palette.restorationCyan;
      ctx.fillRect(size * 0.1, -size * 0.05, size * 0.4, size * 0.18);
      ctx.fillStyle = palette.restorationWhite;
      ctx.beginPath();
      ctx.arc(size * 0.5, size * 0.04, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = palette.archiveBorderLight;
    ctx.beginPath();
    ctx.arc(leftLegX, leftLegY, size * 0.08, 0, Math.PI * 2);
    ctx.arc(rightLegX, rightLegY, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    if (!isGrounded && vy < -20) {
      ctx.fillStyle = palette.restorationCyan;
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
