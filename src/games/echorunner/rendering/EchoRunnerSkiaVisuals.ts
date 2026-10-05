import { ShapeDrawer, EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { ECHO_PALETTE } from "./EchoRunnerPalette";
import { SOLAR_GARDEN_THEME } from "../../../theme/solarGardenTheme";
import { SOLAR_GARDEN_DEBUG_FLAGS } from "../../../theme/solarGardenDebug";
import { resolveHitFlash, resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";

import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
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

function drawSkiaHitFlashCircle(canvas: any, paint: any, radius: number): true {
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_WHITE));
  canvas.drawCircle(0, 0, radius, paint);
  canvas.restore();
  return true;
}

function drawSkiaHitFlashRect(canvas: any, paint: any, x: number, y: number, w: number, h: number): true {
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_WHITE));
  canvas.drawRect(Skia.XYWHRect(x, y, w, h), paint);
  canvas.restore();
  return true;
}

export const drawSkiaEchoBackground: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, elapsed } = resolveEchoBackgroundContext(world);

    const paint = getPaint();

    paint.reset();
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.BIO_BLACK));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    const bgGridSize = 80;
    const bgOffsetX = (elapsed * 5) % bgGridSize;
    const bgOffsetY = (elapsed * 3) % bgGridSize;

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(45, 69, 52, 0.25)"));
    paint.setStrokeWidth(1.0);

    for (let x = bgOffsetX; x < width; x += bgGridSize) {
      canvas.drawLine(x, 0, x, height, paint);
    }
    for (let y = bgOffsetY; y < height; y += bgGridSize) {
      canvas.drawLine(0, y, width, y, paint);
    }

    if (SOLAR_GARDEN_DEBUG_FLAGS.particles) {
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      for (let i = 0; i < 8; i++) {
        const px = (i * 143 + elapsed * 10) % width;
        const py = (i * 187 + elapsed * 14) % height;
        paint.setColor(Skia.Color(i % 2 === 0 ? SOLAR_GARDEN_THEME.SOLAR_CYAN : SOLAR_GARDEN_THEME.SOLAR_GOLD));
        canvas.drawCircle(px, py, 2 + (i % 3), paint);
      }
    }
  }
};

export const drawSkiaEchoPlayer: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    const playerCtx = resolveEchoPlayerDrawContext(world, entity);
    if (!playerCtx) return;

    const { render, size, vx, vy, isGrounded, isAttacking, health } = playerCtx;

    const paint = getPaint();
    canvas.save();

    const flashState = resolveHitFlash(render, render.color || "cyan", 1.0);
    if (flashState.isFlashing && SOLAR_GARDEN_DEBUG_FLAGS.hitFlash) {
      return drawSkiaHitFlashCircle(canvas, paint, size * 0.65);
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
      paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_CYAN));
      paint.setStrokeWidth(2.0);
      paint.setAlphaf(alpha);
      canvas.drawCircle(0, 0, size * 0.9, paint);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_GOLD));
    paint.setStrokeWidth(1.5);
    paint.setAlphaf(alpha);
    canvas.drawLine(-size * 0.15, -size * 0.5, -size * 0.3, -size * 0.9, paint);
    canvas.drawLine(size * 0.15, -size * 0.5, size * 0.3, -size * 0.9, paint);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_WHITE));
    paint.setAlphaf(alpha);

    const headPath = Skia.Path.Make();
    headPath.addArc(Skia.XYWHRect(-size * 0.35, -size * 0.75, size * 0.7, size * 0.7), 180, 180);
    headPath.close();
    canvas.drawPath(headPath, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_GOLD));
    paint.setStrokeWidth(1.5);
    canvas.drawPath(headPath, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_CYAN));
    canvas.drawOval(Skia.XYWHRect(-size * 0.22, -size * 0.56, size * 0.44, size * 0.16), paint);

    const torsoPath = Skia.Path.Make();
    torsoPath.moveTo(0, -size * 0.25);
    torsoPath.lineTo(size * 0.3, 0);
    torsoPath.lineTo(size * 0.2, size * 0.45);
    torsoPath.lineTo(-size * 0.2, size * 0.45);
    torsoPath.lineTo(-size * 0.3, 0);
    torsoPath.close();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_WHITE));
    paint.setAlphaf(alpha);
    canvas.drawPath(torsoPath, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_GOLD));
    paint.setStrokeWidth(2.0);
    canvas.drawPath(torsoPath, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(isAttacking ? SOLAR_GARDEN_THEME.SOLAR_WHITE : SOLAR_GARDEN_THEME.SOLAR_CYAN));
    canvas.drawCircle(0, size * 0.05, isAttacking ? size * 0.18 : size * 0.13, paint);

    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_GOLD));
    canvas.drawCircle(leftLegX, leftLegY, size * 0.09, paint);
    canvas.drawCircle(rightLegX, rightLegY, size * 0.09, paint);

    canvas.restore();
  }
};

export const drawSkiaMemoryFragment: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    const fragCtx = resolveEchoMemoryFragmentDrawContext(world, entity);
    if (!fragCtx) return;

    const { size, elapsed, hoverOffset } = fragCtx;

    const paint = getPaint();
    canvas.save();

    canvas.translate(0, hoverOffset);
    canvas.rotate((elapsed * 1.5 * 180) / Math.PI, 0, 0);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_WHITE));

    const path = Skia.Path.Make();
    path.moveTo(0, -size * 0.6);
    path.lineTo(size * 0.45, 0);
    path.lineTo(0, size * 0.6);
    path.lineTo(-size * 0.45, 0);
    path.close();

    canvas.drawPath(path, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_GOLD));
    paint.setStrokeWidth(2.0);
    canvas.drawPath(path, paint);

    canvas.restore();
  }
};

export const drawSkiaMemoryCore: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    const coreCtx = resolveEchoCollectibleDrawContext(world, entity, 24);
    if (!coreCtx) return;

    const { size, elapsed, hoverOffset } = coreCtx;

    const paint = getPaint();
    canvas.save();

    canvas.translate(0, hoverOffset);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_GOLD));
    canvas.drawCircle(0, 0, size * 0.45, paint);

    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_CYAN));
    canvas.drawCircle(0, 0, size * 0.25, paint);

    canvas.restore();
  }
};

export const drawSkiaCheckpointNode: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    const cpCtx = resolveEchoCheckpointDrawContext(world, entity);
    if (!cpCtx) return;

    const { size, isActive } = cpCtx;

    const paint = getPaint();
    canvas.save();

    const statusColor = isActive ? SOLAR_GARDEN_THEME.SOLAR_GOLD : SOLAR_GARDEN_THEME.THREAT_ORANGE;

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_WHITE));
    canvas.drawRect(Skia.XYWHRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2), paint);

    paint.setColor(Skia.Color(statusColor));
    canvas.drawCircle(0, -size * 0.1, size * 0.2, paint);

    canvas.restore();
  }
};

export const drawSkiaPulseAttack: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 35;

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.SOLAR_CYAN));

    const path = Skia.Path.Make();
    path.moveTo(0, 0);
    path.addArc(Skia.XYWHRect(-size, -size, size * 2, size * 2), -63, 126);
    path.close();

    canvas.drawPath(path, paint);

    canvas.restore();
  }
};

export const drawSkiaSentinel: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const drawCtx = resolveEchoDrawContext(world, entity, 22);
    if (!drawCtx) return;
    const { size, isHitFlash } = drawCtx;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash && SOLAR_GARDEN_DEBUG_FLAGS.hitFlash) {
      return drawSkiaHitFlashCircle(canvas, paint, size * 0.5);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.BIO_BLACK));
    canvas.drawCircle(0, 0, size * 0.45, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.BIO_MAGENTA));
    paint.setStrokeWidth(2.0);
    canvas.drawCircle(0, 0, size * 0.45, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.BIO_MAGENTA));
    canvas.drawCircle(0, 0, size * 0.15, paint);

    canvas.restore();
  }
};

export const drawSkiaHopper: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const drawCtx = resolveEchoDrawContext(world, entity, 24);
    if (!drawCtx) return;
    const { size, isHitFlash } = drawCtx;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash && SOLAR_GARDEN_DEBUG_FLAGS.hitFlash) {
      return drawSkiaHitFlashRect(canvas, paint, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.BIO_BLACK));
    canvas.drawRect(Skia.XYWHRect(-size * 0.35, -size * 0.3, size * 0.7, size * 0.5), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.BIO_ACID));
    paint.setStrokeWidth(2.0);
    canvas.drawRect(Skia.XYWHRect(-size * 0.35, -size * 0.3, size * 0.7, size * 0.5), paint);

    canvas.restore();
  }
};

export const drawSkiaWatcher: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const drawCtx = resolveEchoDrawContext(world, entity, 26);
    if (!drawCtx) return;
    const { size, isHitFlash } = drawCtx;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash && SOLAR_GARDEN_DEBUG_FLAGS.hitFlash) {
      return drawSkiaHitFlashCircle(canvas, paint, size * 0.4);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.BIO_BLACK));
    canvas.drawCircle(0, 0, size * 0.35, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.BIO_MAGENTA));
    paint.setStrokeWidth(2.0);
    canvas.drawCircle(0, 0, size * 0.35, paint);

    canvas.restore();
  }
};

export const drawSkiaCharger: ShapeDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const drawCtx = resolveEchoDrawContext(world, entity, 28);
    if (!drawCtx) return;
    const { size, isHitFlash } = drawCtx;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash && SOLAR_GARDEN_DEBUG_FLAGS.hitFlash) {
      return drawSkiaHitFlashRect(canvas, paint, -size * 0.5, -size * 0.3, size, size * 0.7);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.BIO_BLACK));
    canvas.drawRect(Skia.XYWHRect(-size * 0.45, -size * 0.3, size * 0.9, size * 0.6), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SOLAR_GARDEN_THEME.BIO_ACID));
    paint.setStrokeWidth(2.0);
    canvas.drawRect(Skia.XYWHRect(-size * 0.45, -size * 0.3, size * 0.9, size * 0.6), paint);

    canvas.restore();
  }
};
