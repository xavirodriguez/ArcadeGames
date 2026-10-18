import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { resolveHitFlash, resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import {
  resolveEchoPlayerDrawContext,
  resolveEchoBackgroundContext,
} from "./EchoRunnerVisualUtils";
import {
  getEchoRunnerSpriteFrame,
  resolveEchoRunnerSpriteColor,
  resolveEchoRunnerSpriteMotion,
} from "./EchoRunnerPixelArt";

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
    const flashState = resolveHitFlash(render, render.color || palette.restorationCyan, 1.0);
    if (flashState.isFlashing) {
      drawCanvasHitFlashCircle(ctx, size * 0.65, palette.restorationWhite);
      return;
    }

    const invState = resolveInvulnerabilityPulse(health?.invulnerableRemaining, 1.0, {
      mode: "tick",
      tick: world.tick,
      pulseDivisor: 4,
      dimOpacity: 0.3,
    });
    const transform = world.getComponent(entity, "Transform");
    const facingLeft = (transform?.scaleX ?? 1) < 0;
    const motion = resolveEchoRunnerSpriteMotion(vx, vy, isGrounded, isAttacking);
    const frame = getEchoRunnerSpriteFrame(motion, world.tick);
    const pixelSize = size / 12;
    const originX = -size / 2;
    const originY = -size * 0.8;

    ctx.save();
    ctx.globalAlpha = invState.isInvulnerable ? invState.opacity : 1;
    ctx.translate(0, 0);
    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    ctx.fillStyle = palette.archiveVoidDark;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.66, size * 0.48, size * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isAttacking) {
      ctx.strokeStyle = palette.restorationCyan;
      ctx.lineWidth = Math.max(1, pixelSize);
      ctx.globalAlpha *= 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.72, -Math.PI * 0.8, Math.PI * 0.8);
      ctx.stroke();
      ctx.globalAlpha = invState.isInvulnerable ? invState.opacity : 1;
    }

    for (let y = 0; y < frame.length; y++) {
      const row = frame[y] ?? "";
      let x = 0;
      while (x < row.length) {
        const token = row[x] ?? ".";
        if (token === ".") {
          x++;
          continue;
        }
        let runLength = 1;
        while (x + runLength < row.length && row[x + runLength] === token) {
          runLength++;
        }
        const color = resolveEchoRunnerSpriteColor(token, palette);
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(originX + x * pixelSize, originY + y * pixelSize, runLength * pixelSize, pixelSize);
        }
        x += runLength;
      }
    }

    ctx.restore();
  }
};
