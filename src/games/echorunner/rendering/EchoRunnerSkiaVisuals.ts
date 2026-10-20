import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { resolveHitFlash, resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import type { SkCanvas } from "../../shared/rendering/SkiaContext";
import {
  resolveEchoPlayerDrawContext,
  resolveEchoBackgroundContext,
  resolveEchoRunnerPalette,
} from "./EchoRunnerVisualUtils";
import {
  getEchoRunnerSpriteFrame,
  resolveEchoRunnerSpriteMotion,
  drawRleSpriteFrame,
} from "./EchoRunnerPixelArt";

import { drawSkiaHitFlashCircle } from "../../shared/rendering/PlatformerSharedVisuals";
import { resolveEchoRunnerDeathZoneDrawData, resolveEchoRunnerStateGateDrawData, resolveEchoRunnerStateSwitchDrawData } from "./EchoRunnerInteractionVisualUtils";

export const drawSkiaEchoStateSwitch: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const state = resolveEchoRunnerStateSwitchDrawData(world, entity);
    if (!state) return;

    const { palette, size, color } = state;
    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveVoidDark));
    canvas.drawRect(Skia.XYWHRect(-size * 0.5, -size * 0.5, size, size), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(color));
    paint.setStrokeWidth(2);
    canvas.drawRect(Skia.XYWHRect(-size * 0.5, -size * 0.5, size, size), paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(
      Skia.XYWHRect(-size * 0.12, -size * 0.12, size * 0.24, size * 0.24),
      paint
    );
    canvas.restore();
  }
};

export const drawSkiaEchoStateGate: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const state = resolveEchoRunnerStateGateDrawData(world, entity);
    if (!state) return;

    const { palette, size, width, color, isOpen } = state;
    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(isOpen ? Skia.PaintStyle.Stroke : Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveVoidDark));
    canvas.drawRect(Skia.XYWHRect(-width * 0.5, -size * 0.5, width, size), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(color));
    paint.setStrokeWidth(2);
    paint.setAlphaf(isOpen ? 0.35 : 1);
    canvas.drawRect(Skia.XYWHRect(-width * 0.5, -size * 0.5, width, size), paint);

    if (!isOpen) {
      for (let bar = -1; bar <= 1; bar++) {
        const x = bar * width * 0.22;
        canvas.drawLine(x, -size * 0.42, x, size * 0.42, paint);
      }
    }
    canvas.restore();
  }
};

export const drawSkiaEchoDeathZone: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const zone = resolveEchoRunnerDeathZoneDrawData(world, entity);
    if (!zone) return;

    const { palette, width, height } = zone;
    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.corruptionCrimson));
    paint.setAlphaf(0.34);
    canvas.drawRect(Skia.XYWHRect(-width * 0.5, -height * 0.5, width, height), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.corruptionAmber));
    paint.setStrokeWidth(2);
    paint.setAlphaf(0.9);
    for (let x = -width * 0.5; x < width * 0.5; x += 10) {
      canvas.drawLine(x, height * 0.5, Math.min(x + height, width * 0.5), -height * 0.5, paint);
    }
    canvas.restore();
  }
};

export {
  drawSkiaMemoryFragment,
  drawSkiaMemoryCore,
  drawSkiaCheckpointNode,
  drawSkiaPulseAttack,
  drawSkiaSentinel,
  drawSkiaHopper,
  drawSkiaWatcher,
  drawSkiaCharger,
} from "../../shared/rendering/PlatformerSharedVisuals";

export const drawSkiaEchoBackground: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, elapsed, palette } = resolveEchoBackgroundContext(world);
    const horizonY = height * 0.56;
    const centerX = width * 0.5;
    const driftX = Math.sin(elapsed * 0.12) * width * 0.018;
    const paint = getPaint();

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveVoidDark));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    // Soft restoration portal rings in the distance.
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.restorationCyanGlow));
    paint.setStrokeWidth(2);
    paint.setAlphaf(0.14);
    canvas.drawOval(Skia.XYWHRect(centerX + driftX - width * 0.31, horizonY - 18 - Math.max(18, height * 0.075), width * 0.62, Math.max(36, height * 0.15)), paint);
    paint.setColor(Skia.Color(palette.corruptionPurpleGlow));
    paint.setAlphaf(0.10);
    canvas.drawOval(Skia.XYWHRect(centerX + driftX - width * 0.23, horizonY - 18 - Math.max(12, height * 0.052), width * 0.46, Math.max(24, height * 0.104)), paint);

    // Pixel signal stars keep the upper half calm.
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    for (let i = 0; i < 22; i++) {
      const starX = (i * 127 + elapsed * (2 + (i % 3))) % width;
      const starY = (i * 59 + (i % 4) * 13) % Math.max(1, horizonY - 18);
      const starSize = i % 5 === 0 ? 3 : 1.5;
      paint.setColor(Skia.Color(i % 4 === 0 ? palette.corruptionPurpleGlow : palette.restorationCyanGlow));
      paint.setAlphaf(0.22 + (i % 3) * 0.07);
      canvas.drawRect(Skia.XYWHRect(starX, starY, starSize, starSize), paint);
    }

    // Perspective grid converges on the archive horizon.
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.archiveGridLine));
    paint.setStrokeWidth(1);
    paint.setAlphaf(0.22);
    const vanishingX = centerX + driftX;
    for (let i = 0; i <= 14; i++) {
      canvas.drawLine(vanishingX, horizonY, (i / 14) * width, height, paint);
    }
    for (let i = 1; i <= 8; i++) {
      const progress = i / 8;
      const gridY = horizonY + Math.pow(progress, 1.65) * (height - horizonY);
      canvas.drawLine(0, gridY, width, gridY, paint);
    }

    // Procedural skyline with windows and aerial relays; matches the Canvas layout.
    for (let i = 0; i < 20; i++) {
      const buildingWidth = 24 + ((i * 13) % 28);
      const buildingHeight = 36 + ((i * 29) % 100);
      const span = width + buildingWidth + 32;
      const wrappedX = ((i * 79 - elapsed * 7) % span + span) % span;
      const buildingX = wrappedX - buildingWidth;
      const buildingY = horizonY - buildingHeight;

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(palette.archiveBorderDark));
      paint.setAlphaf(0.23 + (i % 3) * 0.035);
      canvas.drawRect(Skia.XYWHRect(buildingX, buildingY, buildingWidth, buildingHeight), paint);

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(palette.restorationCyanGlow));
      paint.setStrokeWidth(1);
      paint.setAlphaf(0.28);
      canvas.drawLine(buildingX, buildingY, buildingX + buildingWidth, buildingY, paint);

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(palette.restorationCyanGlow));
      paint.setAlphaf(0.40);
      const rows = Math.floor((buildingHeight - 8) / 14);
      const columns = Math.max(1, Math.floor((buildingWidth - 8) / 10));
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          if ((i + row * 2 + column) % 3 === 0) {
            canvas.drawRect(Skia.XYWHRect(buildingX + 5 + column * 10, buildingY + 8 + row * 14, 3, 5), paint);
          }
        }
      }
      if (i % 4 === 1) {
        paint.reset();
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setColor(Skia.Color(palette.restorationCyanGlow));
        paint.setStrokeWidth(1);
        paint.setAlphaf(0.38);
        canvas.drawLine(buildingX + buildingWidth * 0.5, buildingY, buildingX + buildingWidth * 0.5, buildingY - 12 - (i % 3) * 4, paint);
      }
    }

    // Fast data traces create a second parallax speed.
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveDataStream));
    paint.setAlphaf(0.28);
    for (let i = 0; i < 4; i++) {
      const pillarX = ((i * 210 + elapsed * 20) % (width + 24)) - 12;
      const pillarY = ((i * 150 + elapsed * 35) % (height + 100)) - 50;
      canvas.drawRect(Skia.XYWHRect(pillarX, pillarY, 8 + (i % 2) * 5, 34 + (i % 3) * 22), paint);
    }

    // Foreground ruins scroll subtly and carry thin cyan/gold signals.
    const ruinBaseY = height * 0.78;
    for (let i = 0; i < 7; i++) {
      const ruinWidth = 18 + (i % 3) * 8;
      const span = width + ruinWidth + 24;
      const ruinX = ((i * (width / 7 + 17) - elapsed * 2.2) % span + span) % span - ruinWidth;
      const ruinHeight = 24 + (i % 4) * 13;
      const ruinY = ruinBaseY - ruinHeight;

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(palette.archiveSlate));
      paint.setAlphaf(0.22);
      canvas.drawRect(Skia.XYWHRect(ruinX, ruinY, ruinWidth, ruinHeight), paint);
      canvas.drawRect(Skia.XYWHRect(ruinX - 4, ruinY, ruinWidth + 8, 4), paint);

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(palette.restorationCyanGlow));
      paint.setStrokeWidth(1);
      paint.setAlphaf(0.30);
      canvas.drawLine(ruinX - 3, ruinY + 4, ruinX + ruinWidth + 3, ruinY + 4, paint);
      if (i % 2 === 0) {
        paint.reset();
        paint.setStyle(Skia.PaintStyle.Fill);
        paint.setColor(Skia.Color(palette.restorationGoldGlow));
        paint.setAlphaf(0.22);
        canvas.drawRect(Skia.XYWHRect(ruinX + ruinWidth * 0.5, ruinY + 9, 3, Math.max(6, ruinHeight * 0.35)), paint);
      }
    }

    // Pixel flora and ambient motes complete the foreground.
    for (let i = 0; i < 9; i++) {
      const plantX = (i * 131 + elapsed * 4) % width;
      const baseY = height - 8 - (i % 3) * 5;
      const stemHeight = 14 + (i % 4) * 5;
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setAlphaf(0.9);
      paint.setColor(Skia.Color(i % 3 === 0 ? palette.restorationGoldGlow : palette.restorationCyanGlow));
      canvas.drawRect(Skia.XYWHRect(plantX, baseY - stemHeight, 2, stemHeight), paint);
      canvas.drawRect(Skia.XYWHRect(plantX - 3, baseY - stemHeight + 4, 4, 3), paint);
      canvas.drawRect(Skia.XYWHRect(plantX + 1, baseY - stemHeight + 9, 4, 3), paint);
      if (i % 2 === 0) {
        paint.setColor(Skia.Color(palette.restorationGold));
        canvas.drawRect(Skia.XYWHRect(plantX - 1, baseY - stemHeight - 2, 3, 3), paint);
      }
    }

    for (let i = 0; i < 8; i++) {
      const moteX = (i * 143 + elapsed * (5 + (i % 3))) % width;
      const moteY = (i * 187 + elapsed * (i % 2 === 0 ? 4 : 7)) % height;
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(i % 2 === 0 ? palette.restorationCyanGlow : palette.corruptionPurpleGlow));
      paint.setAlphaf(0.62);
      canvas.drawCircle(moteX, moteY, 1.5 + (i % 3), paint);
    }
  }
};

export const drawSkiaEchoPlayer: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const playerCtx = resolveEchoPlayerDrawContext(world, entity);
    if (!playerCtx) return;

    const { render, size, vx, vy, isGrounded, isAttacking, health, palette } = playerCtx;
    const paint = getPaint();
    const flashState = resolveHitFlash(render, render.color || palette.restorationCyan, 1.0);
    if (flashState.isFlashing) {
      drawSkiaHitFlashCircle(canvas, paint, size * 0.65, palette.restorationWhite);
      return;
    }

    const invState = resolveInvulnerabilityPulse(health?.invulnerableRemaining, 1.0, {
      mode: "tick",
      tick: world.tick,
      pulseDivisor: 4,
      dimOpacity: 0.3,
    });
    const alpha = invState.isInvulnerable ? invState.opacity : 1;
    const transform = world.getComponent(entity, "Transform");
    const facingLeft = (transform?.scaleX ?? 1) < 0;
    const motion = resolveEchoRunnerSpriteMotion(vx, vy, isGrounded, isAttacking);
    const frame = getEchoRunnerSpriteFrame(motion, world.tick);
    const pixelSize = size / 16;
    const originX = -size / 2;
    const originY = -size * 0.8;

    canvas.save();
    if (facingLeft) canvas.scale(-1, 1);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveVoidDark));
    paint.setAlphaf(alpha);
    canvas.drawOval(Skia.XYWHRect(-size * 0.48, size * 0.53, size * 0.96, size * 0.26), paint);

    if (isAttacking) {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(palette.restorationCyan));
      paint.setStrokeWidth(Math.max(1, pixelSize));
      paint.setAlphaf(alpha * 0.8);
      canvas.drawArc(Skia.XYWHRect(-size * 0.72, -size * 0.72, size * 1.44, size * 1.44), -144, 288, false, paint);
    }

    if (motion === "run") {
      const trailStrength = Math.min(1, Math.abs(vx) / 180);
      for (let i = 0; i < 3; i++) {
        paint.reset();
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setColor(Skia.Color(i === 1 ? palette.corruptionPurpleGlow : palette.restorationCyanGlow));
        paint.setStrokeWidth(Math.max(1, pixelSize * (0.6 + i * 0.25)));
        paint.setAlphaf(alpha * trailStrength * (0.12 + i * 0.04));
        const startY = -size * 0.2 + i * size * 0.1;
        const midY = -size * 0.28 + i * size * 0.11 + Math.sin(world.tick * 0.22 + i) * size * 0.035;
        const endY = -size * 0.14 + i * size * 0.1;
        canvas.drawLine(-size * 0.22, startY, -size * (0.42 + i * 0.12), midY, paint);
        canvas.drawLine(-size * (0.42 + i * 0.12), midY, -size * (0.62 + i * 0.13), endY, paint);
      }
    }

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setAlphaf(alpha);
    drawRleSpriteFrame(frame, palette, (x, y, runLength, color) => {
      paint.setColor(Skia.Color(color));
      canvas.drawRect(
        Skia.XYWHRect(originX + x * pixelSize, originY + y * pixelSize, runLength * pixelSize, pixelSize),
        paint,
      );
    });

    canvas.restore();
  }
};
