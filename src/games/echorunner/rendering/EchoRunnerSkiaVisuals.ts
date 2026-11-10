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
import {
  drawSpriteSkia,
  getCurrentFrameRect,
  type SpriteAnimatorComponent
} from "../../shared/sprites";

import { drawSkiaHitFlashCircle } from "../../shared/rendering/PlatformerSharedVisuals";
import { resolveEchoRunnerDeathZoneDrawData, resolveEchoRunnerStateGateDrawData, resolveEchoRunnerStateSwitchDrawData } from "./EchoRunnerInteractionVisualUtils";
import {
  resolveEchoStarsLayout,
  resolveEchoPerspectiveGrid,
  resolveEchoSkylineLayout,
  resolveEchoPillarLayout,
  resolveEchoRuinsLayout,
  resolveEchoFloraLayout,
  resolveEchoMotesLayout,
  resolveEchoPlayerRunTrails,
} from "./EchoRunnerVisualHelpers";

export const drawSkiaEchoStateSwitch: ShapeDrawer<any, CoreComponentRegistry> = {
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

export const drawSkiaEchoStateGate: ShapeDrawer<any, CoreComponentRegistry> = {
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

export const drawSkiaEchoDeathZone: ShapeDrawer<any, CoreComponentRegistry> = {
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
    const stars = resolveEchoStarsLayout(width, horizonY, elapsed, palette);
    for (const star of stars) {
      paint.setColor(Skia.Color(star.color));
      paint.setAlphaf(star.alpha);
      canvas.drawRect(Skia.XYWHRect(star.x, star.y, star.size, star.size), paint);
    }

    // Perspective grid converges on the archive horizon.
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.archiveGridLine));
    paint.setStrokeWidth(1);
    paint.setAlphaf(0.22);
    const vanishingX = centerX + driftX;
    const grid = resolveEchoPerspectiveGrid(width, height, horizonY, vanishingX);
    for (const line of grid.radialLines) {
      canvas.drawLine(line.x1, line.y1, line.x2, line.y2, paint);
    }
    for (const hLine of grid.horizontalLines) {
      canvas.drawLine(0, hLine.y, width, hLine.y, paint);
    }

    // Procedural skyline with windows and aerial relays; matches the Canvas layout.
    const skyline = resolveEchoSkylineLayout(width, horizonY, elapsed);
    for (const b of skyline) {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(palette.archiveBorderDark));
      paint.setAlphaf(b.fillAlpha);
      canvas.drawRect(Skia.XYWHRect(b.x, b.y, b.width, b.height), paint);

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(palette.restorationCyanGlow));
      paint.setStrokeWidth(1);
      paint.setAlphaf(0.28);
      canvas.drawLine(b.x, b.y, b.x + b.width, b.y, paint);

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(palette.restorationCyanGlow));
      paint.setAlphaf(0.40);
      for (const w of b.windows) {
        canvas.drawRect(Skia.XYWHRect(w.x, w.y, w.width, w.height), paint);
      }

      if (b.hasAntenna) {
        paint.reset();
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setColor(Skia.Color(palette.restorationCyanGlow));
        paint.setStrokeWidth(1);
        paint.setAlphaf(0.38);
        canvas.drawLine(b.antennaX, b.y, b.antennaX, b.antennaTopY, paint);
      }
    }

    // Fast data traces create a second parallax speed.
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveDataStream));
    paint.setAlphaf(0.28);
    const pillars = resolveEchoPillarLayout(width, height, elapsed);
    for (const p of pillars) {
      canvas.drawRect(Skia.XYWHRect(p.x, p.y, p.width, p.height), paint);
    }

    // Foreground ruins scroll subtly and carry thin cyan/gold signals.
    const ruins = resolveEchoRuinsLayout(width, height, elapsed);
    for (const r of ruins) {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(palette.archiveSlate));
      paint.setAlphaf(0.22);
      canvas.drawRect(Skia.XYWHRect(r.x, r.y, r.width, r.height), paint);
      canvas.drawRect(Skia.XYWHRect(r.x - 4, r.y, r.width + 8, 4), paint);

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(palette.restorationCyanGlow));
      paint.setStrokeWidth(1);
      paint.setAlphaf(0.30);
      canvas.drawLine(r.x - 3, r.y + 4, r.x + r.width + 3, r.y + 4, paint);

      if (r.hasRelicGlow) {
        paint.reset();
        paint.setStyle(Skia.PaintStyle.Fill);
        paint.setColor(Skia.Color(palette.restorationGoldGlow));
        paint.setAlphaf(0.22);
        canvas.drawRect(Skia.XYWHRect(r.relicX, r.relicY, r.relicWidth, r.relicHeight), paint);
      }
    }

    // Pixel flora and ambient motes complete the foreground.
    const flora = resolveEchoFloraLayout(width, height, elapsed, palette);
    for (const f of flora) {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setAlphaf(0.9);
      paint.setColor(Skia.Color(f.color));
      canvas.drawRect(Skia.XYWHRect(f.x, f.baseY - f.stemHeight, 2, f.stemHeight), paint);
      canvas.drawRect(Skia.XYWHRect(f.x - 3, f.baseY - f.stemHeight + 4, 4, 3), paint);
      canvas.drawRect(Skia.XYWHRect(f.x + 1, f.baseY - f.stemHeight + 9, 4, 3), paint);
      if (f.hasBloom) {
        paint.setColor(Skia.Color(palette.restorationGold));
        canvas.drawRect(Skia.XYWHRect(f.bloomX, f.bloomY, 3, 3), paint);
      }
    }

    const motes = resolveEchoMotesLayout(width, height, elapsed, palette);
    for (const m of motes) {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(m.color));
      paint.setAlphaf(0.62);
      canvas.drawCircle(m.x, m.y, m.radius, paint);
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
    const spriteAnimator = world.getComponent(entity, "SpriteAnimator") as
      | SpriteAnimatorComponent
      | undefined;
    const spriteFrame = spriteAnimator ? getCurrentFrameRect(spriteAnimator) : null;
    if (spriteAnimator && spriteFrame) {
      const scaledAnimator = { ...spriteAnimator, scale: size / spriteFrame.w };
      if (drawSpriteSkia(canvas, scaledAnimator, 0, 0, paint, {
        anchor: "feet",
        opacity: alpha
      })) {
        return;
      }
    }

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
      const trails = resolveEchoPlayerRunTrails(size, vx, world.tick, pixelSize, palette);
      for (const t of trails) {
        paint.reset();
        paint.setStyle(Skia.PaintStyle.Stroke);
        paint.setColor(Skia.Color(t.color));
        paint.setStrokeWidth(t.lineWidth);
        paint.setAlphaf(alpha * t.alphaFactor);
        canvas.drawLine(t.startX, t.startY, t.midX, t.midY, paint);
        canvas.drawLine(t.midX, t.midY, t.endX, t.endY, paint);
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
