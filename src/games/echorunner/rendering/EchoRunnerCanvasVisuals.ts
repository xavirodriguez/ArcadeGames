import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { resolveHitFlash, resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import {
  resolveEchoPlayerDrawContext,
  resolveEchoBackgroundContext,
  resolveEchoRunnerPalette,
} from "./EchoRunnerVisualUtils";
import {
  getEchoRunnerSpriteFrame,
  resolveEchoRunnerSpriteColor,
  resolveEchoRunnerSpriteMotion,
} from "./EchoRunnerPixelArt";

import { drawCanvasHitFlashCircle } from "../../shared/rendering/PlatformerSharedVisuals";
import { resolveEchoRunnerDeathZoneDrawData, resolveEchoRunnerStateGateDrawData, resolveEchoRunnerStateSwitchDrawData } from "./EchoRunnerInteractionVisualUtils";

export const drawEchoStateSwitch: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const state = resolveEchoRunnerStateSwitchDrawData(world, entity);
    if (!state) return;

    const { palette, size, color, activated } = state;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = palette.archiveVoidDark;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(size * 0.5, 0);
    ctx.lineTo(0, size * 0.5);
    ctx.lineTo(-size * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    const coreSize = activated ? size * 0.26 : size * 0.16;
    ctx.fillRect(-coreSize * 0.5, -coreSize * 0.5, coreSize, coreSize);
    ctx.restore();
  }
};

export const drawEchoStateGate: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const state = resolveEchoRunnerStateGateDrawData(world, entity);
    if (!state) return;

    const { palette, size, width, color, isOpen } = state;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.fillStyle = palette.archiveVoidDark;
    ctx.shadowColor = color;
    ctx.shadowBlur = isOpen ? 4 : 12;

    if (isOpen) {
      ctx.globalAlpha = 0.28;
      ctx.strokeRect(-width * 0.5, -size * 0.5, width, size);
      ctx.beginPath();
      ctx.moveTo(-width * 0.28, -size * 0.36);
      ctx.lineTo(-width * 0.28, size * 0.36);
      ctx.moveTo(width * 0.28, -size * 0.36);
      ctx.lineTo(width * 0.28, size * 0.36);
      ctx.stroke();
    } else {
      ctx.fillRect(-width * 0.5, -size * 0.5, width, size);
      ctx.strokeRect(-width * 0.5, -size * 0.5, width, size);
      for (let bar = -1; bar <= 1; bar++) {
        ctx.beginPath();
        ctx.moveTo(bar * width * 0.22, -size * 0.42);
        ctx.lineTo(bar * width * 0.22, size * 0.42);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};

export const drawEchoDeathZone: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const zone = resolveEchoRunnerDeathZoneDrawData(world, entity);
    if (!zone) return;

    const { palette, width, height } = zone;
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = palette.corruptionCrimson;
    ctx.fillRect(-width * 0.5, -height * 0.5, width, height);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = palette.corruptionAmber;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -width * 0.5; x < width * 0.5; x += 10) {
      ctx.moveTo(x, height * 0.5);
      ctx.lineTo(Math.min(x + height, width * 0.5), -height * 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }
};

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

    // The Archive visual pass: portal glow, parallax ruins and a perspective data plane.
    ctx.fillStyle = palette.archiveVoidDark;
    ctx.fillRect(0, 0, width, height);
    ctx.save();

    const horizonY = height * 0.56;
    const centerX = width * 0.5;
    const driftX = Math.sin(elapsed * 0.12) * width * 0.018;

    // Soft rings suggest the Archive's restoration gateway in the distance.
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = palette.restorationCyanGlow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX + driftX, horizonY - 18, width * 0.31, Math.max(18, height * 0.075), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = palette.corruptionPurpleGlow;
    ctx.beginPath();
    ctx.ellipse(centerX + driftX, horizonY - 18, width * 0.23, Math.max(12, height * 0.052), 0, 0, Math.PI * 2);
    ctx.stroke();

    // Sparse pixel stars keep the upper half calm and preserve contrast for gameplay.
    for (let i = 0; i < 22; i++) {
      const starX = (i * 127 + elapsed * (2 + (i % 3))) % width;
      const starY = (i * 59 + (i % 4) * 13) % Math.max(1, horizonY - 18);
      ctx.globalAlpha = 0.22 + (i % 3) * 0.07;
      ctx.fillStyle = i % 4 === 0 ? palette.corruptionPurpleGlow : palette.restorationCyanGlow;
      const starSize = i % 5 === 0 ? 3 : 1.5;
      ctx.fillRect(starX, starY, starSize, starSize);
    }

    // Perspective lines converge at the horizon (batched single path)
    const vanishingX = centerX + driftX;
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = palette.archiveGridLine;
    ctx.lineWidth = 1;

    if (typeof Path2D !== "undefined") {
      const gridPath = new Path2D();
      for (let i = 0; i <= 14; i++) {
        gridPath.moveTo(vanishingX, horizonY);
        gridPath.lineTo((i / 14) * width, height);
      }
      for (let i = 1; i <= 8; i++) {
        const progress = i / 8;
        const gridY = horizonY + Math.pow(progress, 1.65) * (height - horizonY);
        gridPath.moveTo(0, gridY);
        gridPath.lineTo(width, gridY);
      }
      ctx.stroke(gridPath);
    } else {
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo((i / 14) * width, height);
      }
      for (let i = 1; i <= 8; i++) {
        const progress = i / 8;
        const gridY = horizonY + Math.pow(progress, 1.65) * (height - horizonY);
        ctx.moveTo(0, gridY);
        ctx.lineTo(width, gridY);
      }
      ctx.stroke();
    }

    // Procedural skyline: deterministic building silhouettes, lit windows and slow parallax.
    for (let i = 0; i < 20; i++) {
      const buildingWidth = 24 + ((i * 13) % 28);
      const buildingHeight = 36 + ((i * 29) % 100);
      const span = width + buildingWidth + 32;
      const wrappedX = ((i * 79 - elapsed * 7) % span + span) % span;
      const buildingX = wrappedX - buildingWidth;
      const buildingY = horizonY - buildingHeight;

      ctx.globalAlpha = 0.23 + (i % 3) * 0.035;
      ctx.fillStyle = palette.archiveBorderDark;
      ctx.fillRect(buildingX, buildingY, buildingWidth, buildingHeight);

      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = palette.restorationCyanGlow;
      ctx.beginPath();
      ctx.moveTo(buildingX, buildingY);
      ctx.lineTo(buildingX + buildingWidth, buildingY);
      ctx.stroke();

      ctx.globalAlpha = 0.40;
      ctx.fillStyle = palette.restorationCyanGlow;
      const rows = Math.floor((buildingHeight - 8) / 14);
      const columns = Math.max(1, Math.floor((buildingWidth - 8) / 10));
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          if ((i + row * 2 + column) % 3 === 0) {
            ctx.fillRect(buildingX + 5 + column * 10, buildingY + 8 + row * 14, 3, 5);
          }
        }
      }

      if (i % 4 === 1) {
        ctx.globalAlpha = 0.38;
        ctx.beginPath();
        ctx.moveTo(buildingX + buildingWidth * 0.5, buildingY);
        ctx.lineTo(buildingX + buildingWidth * 0.5, buildingY - 12 - (i % 3) * 4);
        ctx.stroke();
      }
    }

    // Vertical data traces move faster than the skyline to strengthen the parallax.
    for (let i = 0; i < 4; i++) {
      const pillarX = ((i * 210 + elapsed * 20) % (width + 24)) - 12;
      const pillarY = ((i * 150 + elapsed * 35) % (height + 100)) - 50;
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = palette.archiveDataStream;
      ctx.fillRect(pillarX, pillarY, 8 + (i % 2) * 5, 34 + (i % 3) * 22);
    }

    // Foreground Archive ruins scroll subtly instead of reading as a static overlay.
    const ruinBaseY = height * 0.78;
    for (let i = 0; i < 7; i++) {
      const ruinWidth = 18 + (i % 3) * 8;
      const span = width + ruinWidth + 24;
      const ruinX = ((i * (width / 7 + 17) - elapsed * 2.2) % span + span) % span - ruinWidth;
      const ruinHeight = 24 + (i % 4) * 13;
      const ruinY = ruinBaseY - ruinHeight;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = palette.archiveSlate;
      ctx.fillRect(ruinX, ruinY, ruinWidth, ruinHeight);
      ctx.fillRect(ruinX - 4, ruinY, ruinWidth + 8, 4);
      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = palette.restorationCyanGlow;
      ctx.beginPath();
      ctx.moveTo(ruinX - 3, ruinY + 4);
      ctx.lineTo(ruinX + ruinWidth + 3, ruinY + 4);
      ctx.stroke();
      if (i % 2 === 0) {
        ctx.fillStyle = palette.restorationGoldGlow;
        ctx.fillRect(ruinX + ruinWidth * 0.5, ruinY + 9, 3, Math.max(6, ruinHeight * 0.35));
      }
    }

    // Original procedural pixel flora anchors the foreground.
    for (let i = 0; i < 9; i++) {
      const plantX = (i * 131 + elapsed * 4) % width;
      const baseY = height - 8 - (i % 3) * 5;
      const stemHeight = 14 + (i % 4) * 5;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = i % 3 === 0 ? palette.restorationGoldGlow : palette.restorationCyanGlow;
      ctx.fillRect(plantX, baseY - stemHeight, 2, stemHeight);
      ctx.fillRect(plantX - 3, baseY - stemHeight + 4, 4, 3);
      ctx.fillRect(plantX + 1, baseY - stemHeight + 9, 4, 3);
      if (i % 2 === 0) {
        ctx.fillStyle = palette.restorationGold;
        ctx.fillRect(plantX - 1, baseY - stemHeight - 2, 3, 3);
      }
    }

    // Ambient motes drift at different speeds; all positions remain deterministic.
    for (let i = 0; i < 8; i++) {
      const moteX = (i * 143 + elapsed * (5 + (i % 3))) % width;
      const moteY = (i * 187 + elapsed * (i % 2 === 0 ? 4 : 7)) % height;
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = i % 2 === 0 ? palette.restorationCyanGlow : palette.corruptionPurpleGlow;
      ctx.beginPath();
      ctx.arc(moteX, moteY, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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
    const pixelSize = size / 16;
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

    // Motion streaks are only drawn while running to keep idle frames crisp.
    if (motion === "run") {
      const spriteAlpha = ctx.globalAlpha;
      const trailStrength = Math.min(1, Math.abs(vx) / 180);
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = spriteAlpha * trailStrength * (0.12 + i * 0.04);
        ctx.strokeStyle = i === 1 ? palette.corruptionPurpleGlow : palette.restorationCyanGlow;
        ctx.lineWidth = Math.max(1, pixelSize * (0.6 + i * 0.25));
        ctx.beginPath();
        ctx.moveTo(-size * 0.22, -size * 0.2 + i * size * 0.1);
        ctx.lineTo(-size * (0.42 + i * 0.12), -size * 0.28 + i * size * 0.11 + Math.sin(world.tick * 0.22 + i) * size * 0.035);
        ctx.lineTo(-size * (0.62 + i * 0.13), -size * 0.14 + i * size * 0.1);
        ctx.stroke();
      }
      ctx.globalAlpha = spriteAlpha;
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
