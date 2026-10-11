import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { resolveHitFlash, resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import {
  calculateEchoPlayerPose,
  resolveEchoPlayerDrawContext,
  resolveEchoBackgroundContext,
} from "./EchoRunnerVisualUtils";

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

function drawSkiaHitFlashCircle(canvas: any, paint: any, radius: number, color: string): true {
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(color));
  canvas.drawCircle(0, 0, radius, paint);
  canvas.restore();
  return true;
}

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
    const playerCtx = resolveEchoPlayerDrawContext(world, entity);
    if (!playerCtx) return;

    const { render, size, vx, vy, isGrounded, isAttacking, health, palette } = playerCtx;

    const paint = getPaint();
    canvas.save();

    const flashState = resolveHitFlash(render, render.color || palette.restorationCyan, 1.0);
    if (flashState.isFlashing) {
      return drawSkiaHitFlashCircle(canvas, paint, size * 0.65, palette.restorationWhite);
    }

    let alpha = 1.0;
    const invState = resolveInvulnerabilityPulse(health?.invulnerableRemaining, 1.0, { mode: "tick", tick: world.tick, pulseDivisor: 4, dimOpacity: 0.3 });
    if (invState.isInvulnerable) {
      alpha = invState.opacity;
    }

    const { tiltAngle, hoverY, leftLegX, leftLegY, rightLegX, rightLegY } = calculateEchoPlayerPose(size, isGrounded, vx, vy, world.tick);

    canvas.translate(0, hoverY);
    canvas.rotate((tiltAngle * 180) / Math.PI, 0, 0);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.35)"));
    paint.setAlphaf(alpha);
    canvas.drawOval(Skia.XYWHRect(-size * 0.5, size * 0.7 - hoverY - size * 0.15, size, size * 0.3), paint);

    if (isAttacking) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(palette.restorationCyan));
      paint.setStrokeWidth(2.0);
      paint.setAlphaf(alpha);
      canvas.drawCircle(0, 0, size * 0.85, paint);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.corruptionCrimson));
    paint.setStrokeWidth(1.5);
    paint.setAlphaf(alpha);
    canvas.drawLine(-size * 0.22, -size * 0.5, -size * 0.32, -size * 0.85, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(-size * 0.32, -size * 0.85, 2, paint);

    const headPath = Skia.Path.Make();
    headPath.addArc(Skia.XYWHRect(-size * 0.35, -size * 0.75, size * 0.7, size * 0.7), 180, 180);
    headPath.close();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveSlate));
    paint.setAlphaf(alpha);
    canvas.drawPath(headPath, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.restorationCyan));
    paint.setStrokeWidth(2.0);
    canvas.drawPath(headPath, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.corruptionCrimson));
    canvas.drawOval(Skia.XYWHRect(size * 0.08 - size * 0.24, -size * 0.45 - size * 0.07, size * 0.48, size * 0.14), paint);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveBorderDark));
    paint.setAlphaf(alpha);
    canvas.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6), 4, 4), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.restorationCyan));
    paint.setStrokeWidth(2.0);
    canvas.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(-size * 0.3, -size * 0.15, size * 0.6, size * 0.6), 4, 4), paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(isAttacking ? palette.restorationWhite : palette.restorationCyan));
    canvas.drawCircle(0, size * 0.1, isAttacking ? size * 0.16 : size * 0.12, paint);

    if (isAttacking) {
      paint.setColor(Skia.Color(palette.restorationCyan));
      canvas.drawRect(Skia.XYWHRect(size * 0.1, -size * 0.05, size * 0.4, size * 0.18), paint);
      paint.setColor(Skia.Color(palette.restorationWhite));
      canvas.drawCircle(size * 0.5, size * 0.04, 3, paint);
    }

    paint.setColor(Skia.Color(palette.archiveBorderLight));
    canvas.drawCircle(leftLegX, leftLegY, size * 0.08, paint);
    canvas.drawCircle(rightLegX, rightLegY, size * 0.08, paint);

    if (!isGrounded && vy < -20) {
      paint.setColor(Skia.Color(palette.restorationCyan));
      const flamePath = Skia.Path.Make();
      flamePath.moveTo(-size * 0.15, leftLegY);
      flamePath.lineTo(0, leftLegY + size * 0.35);
      flamePath.lineTo(size * 0.15, rightLegY);
      flamePath.close();
      canvas.drawPath(flamePath, paint);
    }

    canvas.restore();
  }
};
