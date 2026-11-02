import type { ShapeDrawer } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import { Skia } from "../../../shared/rendering/SkiaContext";
import type { OutrunComponentRegistry } from "../../types/OutrunTypes";
import type { OutrunConfig } from "../../types/OutrunConfigSchema";
import {
  resolveOffroadDustParams,
  resolveOutrunCarContext
} from "../../rendering/OutrunRenderShared";
import {
  computeOutrunPlayerArtworkScale,
  computeSpeedLines
} from "../../rendering/OutrunVisualHelpers";
import { resolveOutrunPlayerPalette } from "../../rendering/OutrunVehicleArtwork";
import { colors } from "../../../../theme/colors";
import {
  MOTORCYCLE_MAX_FRAME_INDEX,
  resolveMotorcycleFrameIndex
} from "./resolveMotorcycleFrameIndex";

interface MotorcycleFramePose {
  readonly leanSign: -1 | 0 | 1;
  /** Local rear-wheel offset, compensated before drawing to keep the contact patch fixed. */
  readonly anchorOffsetX: number;
  readonly frontWheelOffsetX: number;
  readonly riderOffsetX: number;
  readonly shoulderOffsetX: number;
  readonly helmetOffsetX: number;
  readonly kneeSpread: number;
  readonly kneeY: number;
  readonly handlebarHalfWidth: number;
  readonly wheelHalfWidth: number;
  readonly fairingHalfWidth: number;
}

/**
 * Seven precomputed poses, ordered from full left lean through neutral to full
 * right lean. The narrowing wheel/fairing profiles suggest a transition from a
 * rear-facing view to a more oblique side view without rotating a flat silhouette.
 */
const MOTORCYCLE_FRAME_POSES: readonly MotorcycleFramePose[] = [
  {
    leanSign: -1, anchorOffsetX: -1.4, frontWheelOffsetX: -10.5,
    riderOffsetX: -5.5, shoulderOffsetX: -8.5, helmetOffsetX: -11,
    kneeSpread: 26, kneeY: -2.2, handlebarHalfWidth: 6.8,
    wheelHalfWidth: 3.3, fairingHalfWidth: 5.6
  },
  {
    leanSign: -1, anchorOffsetX: -1, frontWheelOffsetX: -7,
    riderOffsetX: -3.8, shoulderOffsetX: -5.8, helmetOffsetX: -7.5,
    kneeSpread: 22, kneeY: -4.7, handlebarHalfWidth: 7.8,
    wheelHalfWidth: 3.6, fairingHalfWidth: 6
  },
  {
    leanSign: -1, anchorOffsetX: -0.5, frontWheelOffsetX: -3.8,
    riderOffsetX: -2, shoulderOffsetX: -3, helmetOffsetX: -4,
    kneeSpread: 16, kneeY: -8, handlebarHalfWidth: 9,
    wheelHalfWidth: 3.9, fairingHalfWidth: 6.5
  },
  {
    leanSign: 0, anchorOffsetX: 0, frontWheelOffsetX: 0,
    riderOffsetX: 0, shoulderOffsetX: 0, helmetOffsetX: 0,
    kneeSpread: 9, kneeY: -11, handlebarHalfWidth: 10,
    wheelHalfWidth: 4.2, fairingHalfWidth: 7
  },
  {
    leanSign: 1, anchorOffsetX: 0.5, frontWheelOffsetX: 3.8,
    riderOffsetX: 2, shoulderOffsetX: 3, helmetOffsetX: 4,
    kneeSpread: 16, kneeY: -8, handlebarHalfWidth: 9,
    wheelHalfWidth: 3.9, fairingHalfWidth: 6.5
  },
  {
    leanSign: 1, anchorOffsetX: 1, frontWheelOffsetX: 7,
    riderOffsetX: 3.8, shoulderOffsetX: 5.8, helmetOffsetX: 7.5,
    kneeSpread: 22, kneeY: -4.7, handlebarHalfWidth: 7.8,
    wheelHalfWidth: 3.6, fairingHalfWidth: 6
  },
  {
    leanSign: 1, anchorOffsetX: 1.4, frontWheelOffsetX: 10.5,
    riderOffsetX: 5.5, shoulderOffsetX: 8.5, helmetOffsetX: 11,
    kneeSpread: 26, kneeY: -2.2, handlebarHalfWidth: 6.8,
    wheelHalfWidth: 3.3, fairingHalfWidth: 5.6
  }
];

function resolveMotorcycleFrame(tiltAngle: number): MotorcycleFramePose {
  const frameIndex = resolveMotorcycleFrameIndex(tiltAngle);
  return MOTORCYCLE_FRAME_POSES[frameIndex + MOTORCYCLE_MAX_FRAME_INDEX]!;
}

function drawCanvasLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawCanvasOval(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMotorcycleFrameCanvas(
  ctx: CanvasRenderingContext2D,
  config: OutrunConfig,
  frame: MotorcycleFramePose
): void {
  const palette = resolveOutrunPlayerPalette(config);
  const rearX = frame.anchorOffsetX;
  const frontX = frame.frontWheelOffsetX;
  const bodyX = (rearX + frontX) * 0.5;
  const outerSide = frame.leanSign === 0 ? 1 : frame.leanSign;
  const outerKneeX = rearX + outerSide * frame.kneeSpread;
  const innerKneeX = rearX - outerSide * frame.kneeSpread * 0.52;
  const helmetRadiusX = 5.4 - Math.abs(frame.leanSign) * 0.35;

  ctx.save();

  // The rear tyre's lower edge is y=0 in every pose: the visual contact patch.
  ctx.globalAlpha = 0.58;
  drawCanvasOval(ctx, rearX, -0.5, 17, 3.4, palette.shadow);
  ctx.globalAlpha = 1;

  drawCanvasOval(ctx, rearX, -5.2, 4.8, 5.2, palette.shadow);
  drawCanvasOval(ctx, frontX, -37, frame.wheelHalfWidth, 6.4, palette.shadow);
  ctx.strokeStyle = palette.cream;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(rearX, -5.2, 2.4, 3.8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(frontX, -37, frame.wheelHalfWidth * 0.48, 4.8, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Fork, swingarm and narrow fairing.
  drawCanvasLine(ctx, rearX, -8, frontX, -33, palette.carRoof, 1.8);
  drawCanvasLine(ctx, rearX, -9, bodyX, -17, palette.carShade, 2);
  drawCanvasLine(ctx, bodyX, -17, frontX, -32, palette.carRoof, 1.5);
  drawCanvasOval(ctx, bodyX, -23, frame.fairingHalfWidth, 11, palette.car);
  drawCanvasOval(ctx, bodyX + (frontX - rearX) * 0.12, -29, frame.fairingHalfWidth * 0.72, 5.5, palette.carRoof);
  ctx.fillStyle = palette.carShade;
  ctx.fillRect(bodyX - frame.fairingHalfWidth, -19, frame.fairingHalfWidth * 2, 4.5);
  ctx.fillStyle = palette.cream;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(bodyX - 1, -30.5, 2, 7);
  ctx.globalAlpha = 1;

  // Rear seat, tail lamp and exhaust remain narrow compared with the original car.
  ctx.fillStyle = palette.shadow;
  ctx.fillRect(rearX - 5, -23, 10, 4);
  ctx.fillStyle = palette.carLightBar;
  ctx.fillRect(rearX - 3.3, -14.5, 6.6, 2.2);
  ctx.fillStyle = palette.carLightEnd;
  ctx.fillRect(rearX - 2.1, -15.2, 4.2, 1.7);
  ctx.fillStyle = palette.cream;
  ctx.fillRect(rearX + outerSide * 6.5, -14, 2.2, 8);

  // The outside knee drops progressively towards the road on the three lean frames.
  drawCanvasLine(ctx, frame.riderOffsetX + outerSide * 2, -22, outerKneeX, frame.kneeY, palette.shadow, 4.6);
  drawCanvasLine(ctx, outerKneeX, frame.kneeY, outerKneeX - outerSide * 5, -9, palette.shadow, 3.8);
  drawCanvasOval(ctx, outerKneeX, frame.kneeY, 3.1, 3, palette.carRoof);
  drawCanvasOval(ctx, outerKneeX - outerSide * 5, -9, 3.1, 1.9, palette.shadow);

  drawCanvasLine(ctx, frame.riderOffsetX - outerSide * 2, -22, innerKneeX, -13, palette.shadow, 4.2);
  drawCanvasLine(ctx, innerKneeX, -13, innerKneeX + outerSide * 3.5, -10, palette.shadow, 3.2);
  drawCanvasOval(ctx, innerKneeX + outerSide * 3.5, -10, 2.8, 1.8, palette.shadow);

  // Rider torso, shoulders and arms. All dimensions share the same frame descriptor.
  drawCanvasOval(ctx, frame.riderOffsetX, -31, 6.2, 10.5, palette.carShade);
  drawCanvasOval(ctx, frame.shoulderOffsetX, -36, 7.4, 4.2, palette.shadow);
  drawCanvasLine(
    ctx, frame.shoulderOffsetX - outerSide * 3, -35,
    frontX - frame.handlebarHalfWidth * 0.55, -33.5,
    palette.shadow, 3.4
  );
  drawCanvasLine(
    ctx, frontX - frame.handlebarHalfWidth * 0.55, -33.5,
    frontX - frame.handlebarHalfWidth, -34.5,
    palette.shadow, 2.8
  );
  drawCanvasLine(
    ctx, frame.shoulderOffsetX + outerSide * 3, -35,
    frontX + frame.handlebarHalfWidth * 0.55, -33.5,
    palette.shadow, 3.4
  );
  drawCanvasLine(
    ctx, frontX + frame.handlebarHalfWidth * 0.55, -33.5,
    frontX + frame.handlebarHalfWidth, -34.5,
    palette.shadow, 2.8
  );
  drawCanvasLine(ctx, frontX - frame.handlebarHalfWidth, -34.5, frontX + frame.handlebarHalfWidth, -34.5, palette.carRoof, 1.8);

  // Helmet and visor finish the rear/oblique silhouette.
  drawCanvasOval(ctx, frame.helmetOffsetX, -47.5, helmetRadiusX, 5.8, palette.carRoof);
  drawCanvasOval(ctx, frame.helmetOffsetX, -47, helmetRadiusX * 0.78, 2, palette.carGlass);
  drawCanvasLine(ctx, frame.helmetOffsetX - 2, -51.5, frame.helmetOffsetX + 1.5, -51.5, palette.cream, 0.9);

  ctx.restore();
}

export const drawArcadeMotorcycleCanvas: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    if (entity === undefined) return;
    const carCtx = resolveOutrunCarContext(world, entity);
    if (!carCtx) return;

    const { state, config, geom } = carCtx;
    const { baseX, baseY, carScale, tiltAngle, isOffroad, speedRatio } = geom;
    const frame = resolveMotorcycleFrame(tiltAngle);

    ctx.save();

    if (isOffroad && speedRatio > 0) {
      const { dustColor, particles } = resolveOffroadDustParams(world, state.playerZ, speedRatio);
      for (const particle of particles) {
        ctx.fillStyle = dustColor;
        ctx.globalAlpha = particle.alpha;
        ctx.beginPath();
        ctx.arc(baseX + particle.dx, baseY + particle.dy, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const speedLines = computeSpeedLines(
      config.WIDTH,
      config.HEIGHT,
      config.HEIGHT * 0.45,
      state.playerZ,
      speedRatio
    );
    if (speedLines) {
      ctx.strokeStyle = colors.white;
      ctx.lineWidth = 2;
      for (const line of speedLines) {
        ctx.globalAlpha = line.alpha;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    const scale = carScale * computeOutrunPlayerArtworkScale(config);
    ctx.translate(baseX, baseY);
    ctx.scale(scale, scale);
    // Compensate each pose's local anchor offset: rear-wheel contact stays at (baseX, baseY).
    ctx.translate(-frame.anchorOffsetX, 0);
    drawMotorcycleFrameCanvas(ctx, config, frame);
    ctx.restore();
  }
};

type CachedSkiaPaint = ReturnType<typeof Skia.Paint>;

interface MotorcycleSkiaPaints {
  readonly fill: CachedSkiaPaint;
  readonly stroke: CachedSkiaPaint;
}

let cachedSkiaPaints: MotorcycleSkiaPaints | null = null;

function getMotorcycleSkiaPaints(): MotorcycleSkiaPaints | null {
  if (!Skia) return null;
  if (!cachedSkiaPaints) {
    const fill = Skia.Paint();
    fill.setStyle(Skia.PaintStyle.Fill);
    const stroke = Skia.Paint();
    stroke.setStyle(Skia.PaintStyle.Stroke);
    stroke.setStrokeCap(Skia.StrokeCap.Round);
    cachedSkiaPaints = { fill, stroke };
  }
  return cachedSkiaPaints;
}

function setSkiaFill(paint: CachedSkiaPaint, color: string, alpha = 1): void {
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(alpha);
  paint.setStyle(Skia.PaintStyle.Fill);
}

function setSkiaStroke(paint: CachedSkiaPaint, color: string, width: number): void {
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(1);
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(width);
  paint.setStrokeCap(Skia.StrokeCap.Round);
}

function drawSkiaLine(
  canvas: SkCanvas,
  paint: CachedSkiaPaint,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number
): void {
  setSkiaStroke(paint, color, width);
  canvas.drawLine(x1, y1, x2, y2, paint);
}

function drawSkiaOval(
  canvas: SkCanvas,
  paint: CachedSkiaPaint,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  color: string,
  alpha = 1
): void {
  setSkiaFill(paint, color, alpha);
  canvas.drawOval(
    Skia.XYWHRect(centerX - radiusX, centerY - radiusY, radiusX * 2, radiusY * 2),
    paint
  );
}

function drawMotorcycleFrameSkia(
  canvas: SkCanvas,
  config: OutrunConfig,
  frame: MotorcycleFramePose,
  paints: MotorcycleSkiaPaints
): void {
  const palette = resolveOutrunPlayerPalette(config);
  const rearX = frame.anchorOffsetX;
  const frontX = frame.frontWheelOffsetX;
  const bodyX = (rearX + frontX) * 0.5;
  const outerSide = frame.leanSign === 0 ? 1 : frame.leanSign;
  const outerKneeX = rearX + outerSide * frame.kneeSpread;
  const innerKneeX = rearX - outerSide * frame.kneeSpread * 0.52;
  const helmetRadiusX = 5.4 - Math.abs(frame.leanSign) * 0.35;
  const { fill, stroke } = paints;

  drawSkiaOval(canvas, fill, rearX, -0.5, 17, 3.4, palette.shadow, 0.58);
  drawSkiaOval(canvas, fill, rearX, -5.2, 4.8, 5.2, palette.shadow);
  drawSkiaOval(canvas, fill, frontX, -37, frame.wheelHalfWidth, 6.4, palette.shadow);
  setSkiaStroke(stroke, palette.cream, 0.9);
  canvas.drawOval(Skia.XYWHRect(rearX - 2.4, -9, 4.8, 7.6), stroke);
  canvas.drawOval(Skia.XYWHRect(
    frontX - frame.wheelHalfWidth * 0.48, -41.8,
    frame.wheelHalfWidth * 0.96, 9.6
  ), stroke);

  drawSkiaLine(canvas, stroke, rearX, -8, frontX, -33, palette.carRoof, 1.8);
  drawSkiaLine(canvas, stroke, rearX, -9, bodyX, -17, palette.carShade, 2);
  drawSkiaLine(canvas, stroke, bodyX, -17, frontX, -32, palette.carRoof, 1.5);
  drawSkiaOval(canvas, fill, bodyX, -23, frame.fairingHalfWidth, 11, palette.car);
  drawSkiaOval(
    canvas, fill, bodyX + (frontX - rearX) * 0.12, -29,
    frame.fairingHalfWidth * 0.72, 5.5, palette.carRoof
  );
  setSkiaFill(fill, palette.carShade);
  canvas.drawRect(Skia.XYWHRect(
    bodyX - frame.fairingHalfWidth, -19,
    frame.fairingHalfWidth * 2, 4.5
  ), fill);
  setSkiaFill(fill, palette.cream, 0.7);
  canvas.drawRect(Skia.XYWHRect(bodyX - 1, -30.5, 2, 7), fill);

  setSkiaFill(fill, palette.shadow);
  canvas.drawRect(Skia.XYWHRect(rearX - 5, -23, 10, 4), fill);
  setSkiaFill(fill, palette.carLightBar);
  canvas.drawRect(Skia.XYWHRect(rearX - 3.3, -14.5, 6.6, 2.2), fill);
  setSkiaFill(fill, palette.carLightEnd);
  canvas.drawRect(Skia.XYWHRect(rearX - 2.1, -15.2, 4.2, 1.7), fill);
  setSkiaFill(fill, palette.cream);
  canvas.drawRect(Skia.XYWHRect(rearX + outerSide * 6.5, -14, 2.2, 8), fill);

  drawSkiaLine(
    canvas, stroke, frame.riderOffsetX + outerSide * 2, -22,
    outerKneeX, frame.kneeY, palette.shadow, 4.6
  );
  drawSkiaLine(
    canvas, stroke, outerKneeX, frame.kneeY,
    outerKneeX - outerSide * 5, -9, palette.shadow, 3.8
  );
  drawSkiaOval(canvas, fill, outerKneeX, frame.kneeY, 3.1, 3, palette.carRoof);
  drawSkiaOval(canvas, fill, outerKneeX - outerSide * 5, -9, 3.1, 1.9, palette.shadow);

  drawSkiaLine(
    canvas, stroke, frame.riderOffsetX - outerSide * 2, -22,
    innerKneeX, -13, palette.shadow, 4.2
  );
  drawSkiaLine(
    canvas, stroke, innerKneeX, -13,
    innerKneeX + outerSide * 3.5, -10, palette.shadow, 3.2
  );
  drawSkiaOval(canvas, fill, innerKneeX + outerSide * 3.5, -10, 2.8, 1.8, palette.shadow);

  drawSkiaOval(canvas, fill, frame.riderOffsetX, -31, 6.2, 10.5, palette.carShade);
  drawSkiaOval(canvas, fill, frame.shoulderOffsetX, -36, 7.4, 4.2, palette.shadow);
  drawSkiaLine(
    canvas, stroke, frame.shoulderOffsetX - outerSide * 3, -35,
    frontX - frame.handlebarHalfWidth * 0.55, -33.5, palette.shadow, 3.4
  );
  drawSkiaLine(
    canvas, stroke, frontX - frame.handlebarHalfWidth * 0.55, -33.5,
    frontX - frame.handlebarHalfWidth, -34.5, palette.shadow, 2.8
  );
  drawSkiaLine(
    canvas, stroke, frame.shoulderOffsetX + outerSide * 3, -35,
    frontX + frame.handlebarHalfWidth * 0.55, -33.5, palette.shadow, 3.4
  );
  drawSkiaLine(
    canvas, stroke, frontX + frame.handlebarHalfWidth * 0.55, -33.5,
    frontX + frame.handlebarHalfWidth, -34.5, palette.shadow, 2.8
  );
  drawSkiaLine(
    canvas, stroke, frontX - frame.handlebarHalfWidth, -34.5,
    frontX + frame.handlebarHalfWidth, -34.5, palette.carRoof, 1.8
  );

  drawSkiaOval(canvas, fill, frame.helmetOffsetX, -47.5, helmetRadiusX, 5.8, palette.carRoof);
  drawSkiaOval(canvas, fill, frame.helmetOffsetX, -47, helmetRadiusX * 0.78, 2, palette.carGlass);
  drawSkiaLine(
    canvas, stroke, frame.helmetOffsetX - 2, -51.5,
    frame.helmetOffsetX + 1.5, -51.5, palette.cream, 0.9
  );
}

export const drawArcadeMotorcycleSkia: ShapeDrawer<SkCanvas, OutrunComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia || entity === undefined) return;
    const paints = getMotorcycleSkiaPaints();
    if (!paints) return;
    const carCtx = resolveOutrunCarContext(world, entity);
    if (!carCtx) return;

    const { state, config, geom } = carCtx;
    const { baseX, baseY, carScale, tiltAngle, isOffroad, speedRatio } = geom;
    const frame = resolveMotorcycleFrame(tiltAngle);
    const { fill, stroke } = paints;

    canvas.save();

    if (isOffroad && speedRatio > 0) {
      const { dustColor, particles } = resolveOffroadDustParams(world, state.playerZ, speedRatio);
      for (const particle of particles) {
        setSkiaFill(fill, dustColor, particle.alpha);
        canvas.drawCircle(baseX + particle.dx, baseY + particle.dy, particle.radius, fill);
      }
    }

    const speedLines = computeSpeedLines(
      config.WIDTH,
      config.HEIGHT,
      config.HEIGHT * 0.45,
      state.playerZ,
      speedRatio
    );
    if (speedLines) {
      for (const line of speedLines) {
        setSkiaStroke(stroke, colors.white, 2);
        stroke.setAlphaf(line.alpha);
        canvas.drawLine(line.x1, line.y1, line.x2, line.y2, stroke);
      }
    }

    const scale = carScale * computeOutrunPlayerArtworkScale(config);
    canvas.translate(baseX, baseY);
    canvas.scale(scale, scale);
    // Same per-frame compensation as Canvas: the rear tyre remains on the motor's contact point.
    canvas.translate(-frame.anchorOffsetX, 0);
    drawMotorcycleFrameSkia(canvas, config, frame, paints);
    canvas.restore();
  }
};
