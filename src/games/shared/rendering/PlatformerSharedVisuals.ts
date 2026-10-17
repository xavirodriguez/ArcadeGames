import { ShapeDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { Skia, getPaint, SkCanvas, SkPaint } from "./SkiaContext";
import {
  resolveEchoDrawContext,
  resolveEchoMemoryFragmentDrawContext,
  resolveEchoCollectibleDrawContext,
  resolveEchoCheckpointDrawContext,
  resolveSentinelVisualState,
  resolveHopperVisualState,
  resolveWatcherVisualState,
  resolveChargerVisualState,
  computeChargerBodyPoints,
  resolveEchoRunnerPalette,
  EchoRunnerResolvedPalette
} from "./PlatformerSharedVisualUtils";
import { colors } from "../../../theme/colors";
import { hexToRgba } from "./CosmicPalette";

export { drawPlatformerTilemap } from "./PlatformerSharedTilemap";

const gradientCache = new Map<string, CanvasGradient>();
let lastCtx: CanvasRenderingContext2D | null = null;

function getMemoryCoreGradient(ctx: CanvasRenderingContext2D, size: number, palette: EchoRunnerResolvedPalette): CanvasGradient {
  if (lastCtx !== ctx) {
    lastCtx = ctx;
    gradientCache.clear();
  }
  const key = `core_${size}_${palette.restorationWhite}_${palette.restorationGold}_${palette.corruptionAmber}`;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 0.5);
    grad.addColorStop(0, palette.restorationWhite);
    grad.addColorStop(0.35, palette.restorationGold);
    grad.addColorStop(1, palette.corruptionAmber);
    gradientCache.set(key, grad);
  }
  return grad;
}

function getPulseAttackGradient(ctx: CanvasRenderingContext2D, size: number, palette: EchoRunnerResolvedPalette): CanvasGradient {
  if (lastCtx !== ctx) {
    lastCtx = ctx;
    gradientCache.clear();
  }
  const key = `pulse_${size}_${palette.restorationCyanGlow}_${palette.restorationWhite}`;
  let grad = gradientCache.get(key);
  if (!grad) {
    grad = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size);
    grad.addColorStop(0, hexToRgba(colors.white, 0.95));
    grad.addColorStop(0.4, palette.restorationCyanGlow);
    grad.addColorStop(1, hexToRgba(colors.cyan, 0));
    gradientCache.set(key, grad);
  }
  return grad;
}

export function drawCanvasHitFlashCircle(ctx: CanvasRenderingContext2D, radius: number, color: string): true {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return true;
}

export function drawCanvasHitFlashRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): true {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.restore();
  return true;
}

export function drawSkiaHitFlashCircle(canvas: SkCanvas, paint: SkPaint, radius: number, color: string): true {
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(color));
  canvas.drawCircle(0, 0, radius, paint);
  canvas.restore();
  return true;
}

export function drawSkiaHitFlashRect(canvas: SkCanvas, paint: SkPaint, x: number, y: number, w: number, h: number, color: string): true {
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(color));
  canvas.drawRect(Skia.XYWHRect(x, y, w, h), paint);
  canvas.restore();
  return true;
}

// ==========================================
// CANVAS SHAPE DRAWERS
// ==========================================

export const drawMemoryFragment: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const fragCtx = resolveEchoMemoryFragmentDrawContext(world, entity);
    if (!fragCtx) return;

    const { size, elapsed, hoverOffset, strokeColor, fillColor, palette } = fragCtx;

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

    ctx.fillStyle = palette.restorationWhite;
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

    const { size, elapsed, hoverOffset, palette } = coreCtx;

    ctx.save();
    ctx.translate(0, hoverOffset);

    ctx.shadowColor = palette.restorationGold;
    ctx.shadowBlur = 15;

    ctx.strokeStyle = palette.restorationGoldGlow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.3, elapsed * 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.3, -elapsed * 1.5, 0, Math.PI * 2);
    ctx.stroke();

    const gradient = getMemoryCoreGradient(ctx, size, palette);

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

    const { size, isActive, palette } = cpCtx;

    ctx.save();

    const statusColor = isActive ? palette.archiveNodeActive : palette.archiveNodeInactive;
    ctx.shadowColor = statusColor;
    ctx.shadowBlur = 10;

    ctx.fillStyle = palette.archiveSlate;
    ctx.strokeStyle = palette.archiveBorderLight;
    ctx.lineWidth = 2;
    ctx.fillRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);
    ctx.strokeRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2);

    ctx.fillStyle = palette.archiveBorderDark;
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
    const palette = resolveEchoRunnerPalette(world);

    ctx.save();

    ctx.shadowColor = palette.restorationCyan;
    ctx.shadowBlur = 12;

    const grad = getPulseAttackGradient(ctx, size, palette);

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
    const { size, isHitFlash, state, palette } = drawCtx;

    ctx.save();

    if (isHitFlash) {
      return drawCanvasHitFlashCircle(ctx, size * 0.5, palette.restorationWhite);
    }

    const { isAlert, isAttack, glowColor } = resolveSentinelVisualState(state, palette);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    if (isAlert) {
      const pulse = Math.sin(world.tick * 0.5) * 3;
      ctx.fillStyle = palette.corruptionAmber;
      ctx.strokeStyle = palette.restorationGold;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -size * 0.8 - pulse);
      ctx.lineTo(size * 0.18, -size * 1.1 - pulse);
      ctx.lineTo(-size * 0.18, -size * 1.1 - pulse);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = palette.corruptionAmber;
      ctx.lineWidth = 1.5;
      const ringRadius = size * (0.8 + 0.3 * Math.sin(world.tick * 0.3));
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (isAttack) {
      ctx.strokeStyle = palette.corruptionCrimson;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = palette.archiveBorderDark;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isAlert && Math.floor(world.tick / 4) % 2 === 0 ? palette.restorationWhite : glowColor;
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.archiveBorderLight;
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
    const { size, isHitFlash, state, palette } = drawCtx;

    ctx.save();

    if (isHitFlash) {
      return drawCanvasHitFlashRect(ctx, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8, palette.restorationWhite);
    }

    const { isAlert, isAttack, glowColor, scaleX, scaleY } = resolveHopperVisualState(state, palette);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;

    if (isAlert) {
      ctx.fillStyle = palette.corruptionAmber;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.7);
      ctx.lineTo(-size * 0.2, -size * 0.95);
      ctx.lineTo(size * 0.2, -size * 0.95);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = palette.archiveSlate;
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
    if (typeof ctx.roundRect === "function") {
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
    const { size, isHitFlash, state, palette } = drawCtx;

    ctx.save();

    if (isHitFlash) {
      return drawCanvasHitFlashCircle(ctx, size * 0.4, palette.restorationWhite);
    }

    const { isAlert, isAttack, glowColor } = resolveWatcherVisualState(state, palette);

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;

    if (isAlert || isAttack) {
      ctx.fillStyle = isAttack ? palette.corruptionCrimsonGlow : hexToRgba(colors.orange, 0.15);
      ctx.strokeStyle = isAttack ? palette.corruptionCrimson : palette.corruptionAmber;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.05);
      ctx.arc(0, -size * 0.05, size * 2.2, -Math.PI * 0.2, Math.PI * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = palette.archiveBorderDark;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, size * 0.3, size * 0.3, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.archiveSlate;
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isAlert || isAttack ? glowColor : hexToRgba(colors.blue, 0.4);
    ctx.beginPath();
    ctx.arc(0, -size * 0.05, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isAlert && Math.floor(world.tick / 3) % 2 === 0 ? palette.restorationWhite : colors.blueLight;
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
    const { size, isHitFlash, state, palette } = drawCtx;

    ctx.save();

    if (isHitFlash) {
      return drawCanvasHitFlashRect(ctx, -size * 0.5, -size * 0.3, size, size * 0.7, palette.restorationWhite);
    }

    const { isStunned, isAlert, isAttack, glowColor } = resolveChargerVisualState(state, palette);

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;

    if (isAlert) {
      ctx.fillStyle = palette.corruptionAmber;
      ctx.strokeStyle = palette.restorationGold;
      ctx.lineWidth = 1.5;

      const pulse = (world.tick % 8) * 2;
      ctx.beginPath();
      ctx.moveTo(size * 0.5 + pulse, -size * 0.1);
      ctx.lineTo(size * 0.7 + pulse, 0);
      ctx.lineTo(size * 0.5 + pulse, size * 0.1);
      ctx.stroke();
    } else if (isAttack) {
      ctx.strokeStyle = palette.corruptionCrimsonGlow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, -size * 0.2);
      ctx.lineTo(-size * 0.9, -size * 0.2);
      ctx.moveTo(-size * 0.5, size * 0.1);
      ctx.lineTo(-size * 0.85, size * 0.1);
      ctx.stroke();
    }

    ctx.fillStyle = palette.archiveSlate;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    const bodyPts = computeChargerBodyPoints(size);
    ctx.beginPath();
    ctx.moveTo(bodyPts[0][0], bodyPts[0][1]);
    for (let i = 1; i < bodyPts.length; i++) {
      ctx.lineTo(bodyPts[i][0], bodyPts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = glowColor;
    ctx.fillRect(-size * 0.25, -size * 0.1, size * 0.1, size * 0.3);
    ctx.fillRect(size * 0.15, -size * 0.1, size * 0.1, size * 0.3);

    if (isStunned) {
      const elapsed = world.tick * 0.1;
      ctx.strokeStyle = palette.restorationGold;
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

// ==========================================
// SKIA SHAPE DRAWERS
// ==========================================

export const drawSkiaMemoryFragment: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    const fragCtx = resolveEchoMemoryFragmentDrawContext(world, entity);
    if (!fragCtx) return;

    const { size, elapsed, hoverOffset, strokeColor, fillColor, palette } = fragCtx;

    const paint = getPaint();
    canvas.save();

    canvas.translate(0, hoverOffset);
    canvas.rotate((elapsed * 1.5 * 180) / Math.PI, 0, 0);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(fillColor));

    const path = Skia.Path.Make();
    path.moveTo(0, -size * 0.6);
    path.lineTo(size * 0.45, 0);
    path.lineTo(0, size * 0.6);
    path.lineTo(-size * 0.45, 0);
    path.close();

    canvas.drawPath(path, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(strokeColor));
    paint.setStrokeWidth(2.0);
    canvas.drawPath(path, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.restorationWhite));

    const corePath = Skia.Path.Make();
    corePath.moveTo(0, -size * 0.25);
    corePath.lineTo(size * 0.18, 0);
    corePath.lineTo(0, size * 0.25);
    corePath.lineTo(-size * 0.18, 0);
    corePath.close();

    canvas.drawPath(corePath, paint);

    canvas.restore();
  }
};

export const drawSkiaMemoryCore: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    const coreCtx = resolveEchoCollectibleDrawContext(world, entity, 24);
    if (!coreCtx) return;

    const { size, elapsed, hoverOffset, palette } = coreCtx;

    const paint = getPaint();
    canvas.save();

    canvas.translate(0, hoverOffset);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.restorationGoldGlow));
    paint.setStrokeWidth(1.5);

    canvas.save();
    canvas.rotate((elapsed * 2 * 180) / Math.PI, 0, 0);
    canvas.drawOval(Skia.XYWHRect(-size * 0.8, -size * 0.3, size * 1.6, size * 0.6), paint);
    canvas.restore();

    canvas.save();
    canvas.rotate((-elapsed * 1.5 * 180) / Math.PI, 0, 0);
    canvas.drawOval(Skia.XYWHRect(-size * 0.8, -size * 0.3, size * 1.6, size * 0.6), paint);
    canvas.restore();

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.corruptionAmber));
    canvas.drawCircle(0, 0, size * 0.45, paint);

    paint.setColor(Skia.Color(palette.restorationGold));
    canvas.drawCircle(0, 0, size * 0.25, paint);

    paint.setColor(Skia.Color(palette.restorationWhite));
    canvas.drawCircle(0, 0, size * 0.1, paint);

    canvas.restore();
  }
};

export const drawSkiaCheckpointNode: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    const cpCtx = resolveEchoCheckpointDrawContext(world, entity);
    if (!cpCtx) return;

    const { size, isActive, palette } = cpCtx;

    const paint = getPaint();
    canvas.save();

    const statusColor = isActive ? palette.archiveNodeActive : palette.archiveNodeInactive;

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveSlate));
    canvas.drawRect(Skia.XYWHRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.archiveBorderLight));
    paint.setStrokeWidth(2.0);
    canvas.drawRect(Skia.XYWHRect(-size * 0.4, size * 0.3, size * 0.8, size * 0.2), paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveBorderDark));
    canvas.drawRect(Skia.XYWHRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.archiveBorderLight));
    canvas.drawRect(Skia.XYWHRect(-size * 0.25, -size * 0.5, size * 0.5, size * 0.8), paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(statusColor));
    canvas.drawRect(Skia.XYWHRect(-size * 0.18, -size * 0.4, size * 0.36, size * 0.35), paint);

    paint.setColor(Skia.Color(statusColor));
    if (isActive) {
      canvas.drawCircle(0, -size * 0.22, size * 0.08, paint);
    } else {
      canvas.drawRect(Skia.XYWHRect(-size * 0.04, -size * 0.3, size * 0.08, size * 0.16), paint);
    }

    canvas.restore();
  }
};

export const drawSkiaPulseAttack: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;
    const size = render.size || 35;
    const palette = resolveEchoRunnerPalette(world);

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.restorationCyanGlow));

    const path = Skia.Path.Make();
    path.moveTo(0, 0);
    path.addArc(Skia.XYWHRect(-size, -size, size * 2, size * 2), -63, 126);
    path.close();

    canvas.drawPath(path, paint);

    paint.setColor(Skia.Color(hexToRgba(colors.white, 0.8)));
    const innerPath = Skia.Path.Make();
    innerPath.moveTo(0, 0);
    innerPath.addArc(Skia.XYWHRect(-size * 0.5, -size * 0.5, size, size), -50, 100);
    innerPath.close();

    canvas.drawPath(innerPath, paint);

    canvas.restore();
  }
};

export const drawSkiaSentinel: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const drawCtx = resolveEchoDrawContext(world, entity, 22);
    if (!drawCtx) return;
    const { size, isHitFlash, state, palette } = drawCtx;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash) {
      return drawSkiaHitFlashCircle(canvas, paint, size * 0.5, palette.restorationWhite);
    }

    const { isAlert, isAttack, glowColor } = resolveSentinelVisualState(state, palette);

    if (isAlert) {
      const pulse = Math.sin(world.tick * 0.5) * 3;
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(palette.corruptionAmber));

      const chevron = Skia.Path.Make();
      chevron.moveTo(0, -size * 0.8 - pulse);
      chevron.lineTo(size * 0.18, -size * 1.1 - pulse);
      chevron.lineTo(-size * 0.18, -size * 1.1 - pulse);
      chevron.close();
      canvas.drawPath(chevron, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(hexToRgba(colors.orange, 0.6)));
      paint.setStrokeWidth(1.5);
      const ringRadius = size * (0.8 + 0.3 * Math.sin(world.tick * 0.3));
      canvas.drawCircle(0, 0, ringRadius, paint);
    } else if (isAttack) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(palette.corruptionCrimson));
      paint.setStrokeWidth(2.0);
      canvas.drawCircle(0, 0, size * 0.85, paint);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveBorderDark));
    canvas.drawCircle(0, 0, size * 0.45, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    paint.setStrokeWidth(2.0);
    canvas.drawCircle(0, 0, size * 0.45, paint);

    const eyeColor = isAlert && Math.floor(world.tick / 4) % 2 === 0 ? palette.restorationWhite : glowColor;
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(eyeColor));
    canvas.drawCircle(0, -size * 0.05, size * 0.15, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(palette.archiveBorderLight));
    canvas.drawLine(-size * 0.45, size * 0.1, -size * 0.6, size * 0.3, paint);
    canvas.drawLine(size * 0.45, size * 0.1, size * 0.6, size * 0.3, paint);

    canvas.restore();
  }
};

export const drawSkiaHopper: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const drawCtx = resolveEchoDrawContext(world, entity, 24);
    if (!drawCtx) return;
    const { size, isHitFlash, state, palette } = drawCtx;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash) {
      return drawSkiaHitFlashRect(canvas, paint, -size * 0.4, -size * 0.4, size * 0.8, size * 0.8, palette.restorationWhite);
    }

    const { isAlert, isAttack, glowColor, scaleX, scaleY } = resolveHopperVisualState(state, palette);

    if (isAlert) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(palette.corruptionAmber));

      const path = Skia.Path.Make();
      path.moveTo(0, -size * 0.7);
      path.lineTo(-size * 0.2, -size * 0.95);
      path.lineTo(size * 0.2, -size * 0.95);
      path.close();
      canvas.drawPath(path, paint);
    }

    canvas.scale(scaleX, scaleY);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    paint.setStrokeWidth(2.0);

    const legPath = Skia.Path.Make();
    legPath.moveTo(0, 0);
    legPath.lineTo(-size * 0.15, size * 0.3);
    legPath.lineTo(size * 0.15, size * 0.3);
    legPath.close();

    canvas.drawPath(legPath, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveSlate));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-size * 0.35, -size * 0.4, size * 0.7, size * 0.45), 3, 3), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-size * 0.35, -size * 0.4, size * 0.7, size * 0.45), 3, 3), paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(glowColor));
    canvas.drawRect(Skia.XYWHRect(-size * 0.2, -size * 0.28, size * 0.4, size * 0.1), paint);

    canvas.restore();
  }
};

export const drawSkiaWatcher: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const drawCtx = resolveEchoDrawContext(world, entity, 26);
    if (!drawCtx) return;
    const { size, isHitFlash, state, palette } = drawCtx;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash) {
      return drawSkiaHitFlashCircle(canvas, paint, size * 0.4, palette.restorationWhite);
    }

    const { isAlert, isAttack, glowColor } = resolveWatcherVisualState(state, palette);

    if (isAlert || isAttack) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(isAttack ? palette.corruptionCrimsonGlow : hexToRgba(colors.orange, 0.15)));

      const conePath = Skia.Path.Make();
      conePath.moveTo(0, -size * 0.05);
      conePath.addArc(Skia.XYWHRect(-size * 2.2, -size * 2.25, size * 4.4, size * 4.4), -36, 72);
      conePath.close();

      canvas.drawPath(conePath, paint);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveBorderDark));

    const bracketPath = Skia.Path.Make();
    bracketPath.addArc(Skia.XYWHRect(-size * 0.3, 0, size * 0.6, size * 0.6), 180, 180);
    bracketPath.close();

    canvas.drawPath(bracketPath, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    paint.setStrokeWidth(2.0);
    canvas.drawPath(bracketPath, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveSlate));
    canvas.drawCircle(0, -size * 0.05, size * 0.32, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    canvas.drawCircle(0, -size * 0.05, size * 0.32, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(isAlert || isAttack ? glowColor : hexToRgba(colors.blue, 0.4)));
    canvas.drawCircle(0, -size * 0.05, size * 0.18, paint);

    paint.setColor(Skia.Color(isAlert && Math.floor(world.tick / 3) % 2 === 0 ? palette.restorationWhite : colors.blueLight));
    canvas.drawCircle(0, -size * 0.05, size * 0.08, paint);

    canvas.restore();
  }
};

export const drawSkiaCharger: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const drawCtx = resolveEchoDrawContext(world, entity, 28);
    if (!drawCtx) return;
    const { size, isHitFlash, state, palette } = drawCtx;

    const paint = getPaint();
    canvas.save();

    if (isHitFlash) {
      return drawSkiaHitFlashRect(canvas, paint, -size * 0.5, -size * 0.3, size, size * 0.7, palette.restorationWhite);
    }

    const { isStunned, isAlert, isAttack, glowColor } = resolveChargerVisualState(state, palette);

    if (isAlert) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(palette.corruptionAmber));
      paint.setStrokeWidth(1.5);

      const pulse = (world.tick % 8) * 2;
      canvas.drawLine(size * 0.5 + pulse, -size * 0.1, size * 0.7 + pulse, 0, paint);
      canvas.drawLine(size * 0.7 + pulse, 0, size * 0.5 + pulse, size * 0.1, paint);
    } else if (isAttack) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(palette.corruptionCrimsonGlow));
      paint.setStrokeWidth(2.0);

      canvas.drawLine(-size * 0.6, -size * 0.2, -size * 0.9, -size * 0.2, paint);
      canvas.drawLine(-size * 0.5, size * 0.1, -size * 0.85, size * 0.1, paint);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.archiveSlate));

    const bodyPath = Skia.Path.Make();
    const bodyPts = computeChargerBodyPoints(size);
    bodyPath.moveTo(bodyPts[0][0], bodyPts[0][1]);
    for (let i = 1; i < bodyPts.length; i++) {
      bodyPath.lineTo(bodyPts[i][0], bodyPts[i][1]);
    }
    bodyPath.close();

    canvas.drawPath(bodyPath, paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(glowColor));
    paint.setStrokeWidth(2.0);
    canvas.drawPath(bodyPath, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(glowColor));
    canvas.drawRect(Skia.XYWHRect(-size * 0.25, -size * 0.1, size * 0.1, size * 0.3), paint);
    canvas.drawRect(Skia.XYWHRect(size * 0.15, -size * 0.1, size * 0.1, size * 0.3), paint);

    if (isStunned) {
      const elapsed = world.tick * 0.1;
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(palette.restorationGold));
      paint.setStrokeWidth(1.5);
      for (let i = 0; i < 3; i++) {
        const angle = elapsed + (i * Math.PI * 2) / 3;
        const sx = Math.cos(angle) * (size * 0.6);
        const sy = Math.sin(angle) * (size * 0.2) - size * 0.5;
        canvas.drawCircle(sx, sy, 2, paint);
      }
    }

    canvas.restore();
  }
};
