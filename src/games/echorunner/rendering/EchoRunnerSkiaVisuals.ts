import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { resolveHitFlash, resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import {
  resolveEchoPlayerDrawContext,
  resolveEchoBackgroundContext,
} from "./EchoRunnerVisualUtils";
import {
  getEchoRunnerSpriteFrame,
  resolveEchoRunnerSpriteColor,
  resolveEchoRunnerSpriteMotion,
} from "./EchoRunnerPixelArt";

import { drawSkiaHitFlashCircle } from "../../shared/rendering/PlatformerSharedVisuals";

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

    const paint = getPaint();

    paint.reset();
    paint.setColor(Skia.Color(palette.archiveVoidDark));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    const bgGridSize = 80;
    const bgOffsetX = (elapsed * 5) % bgGridSize;
    const bgOffsetY = (elapsed * 3) % bgGridSize;

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.archiveGridLineSecondary));
    paint.setStrokeWidth(1.0);

    for (let x = bgOffsetX; x < width; x += bgGridSize) {
      canvas.drawLine(x, 0, x, height, paint);
    }
    for (let y = bgOffsetY; y < height; y += bgGridSize) {
      canvas.drawLine(0, y, width, y, paint);
    }

    paint.setColor(Skia.Color(palette.archiveGridLine));
    const gridSize = 40;
    const offsetX = (elapsed * 15) % gridSize;
    const offsetY = (elapsed * 10) % gridSize;

    for (let x = offsetX; x < width; x += gridSize) {
      canvas.drawLine(x, 0, x, height, paint);
    }
    for (let y = offsetY; y < height; y += gridSize) {
      canvas.drawLine(0, y, width, y, paint);
    }

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveDataStream));
    for (let i = 0; i < 4; i++) {
      const px = (i * 210 + elapsed * 20) % width;
      const py = ((i * 150 + elapsed * 35) % (height + 100)) - 50;
      canvas.drawRect(Skia.XYWHRect(px, py, 12 + (i % 2) * 8, 40 + (i % 3) * 30), paint);
    }

    for (let i = 0; i < 6; i++) {
      const px = (i * 143 + elapsed * 8) % width;
      const py = (i * 187 + elapsed * 12) % height;
      paint.setColor(Skia.Color(i % 2 === 0 ? palette.restorationCyanGlow : palette.corruptionPurpleGlow));
      canvas.drawCircle(px, py, 2 + (i % 3), paint);
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
    const pixelSize = size / 12;
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

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setAlphaf(alpha);
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
          paint.setColor(Skia.Color(color));
          canvas.drawRect(
            Skia.XYWHRect(originX + x * pixelSize, originY + y * pixelSize, runLength * pixelSize, pixelSize),
            paint,
          );
        }
        x += runLength;
      }
    }

    canvas.restore();
  }
};
