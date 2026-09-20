import { EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { Skia } from "../SkiaContext";
import { COSMIC_ARCADE_PALETTE } from "../CosmicPalette";
import {
  createParallaxLayer,
  SpaceStationState,
  initializeSpaceStation,
  getOrCreateCached
} from "../SharedVFXInternal";

const spaceStationLayer = createParallaxLayer<SpaceStationState | undefined>({
  layerName: "layer5_near_objects",
  isInitialized: (state) => state.stationInitialized,
  initialize: initializeSpaceStation,
  getState: (state) => state.station
});

export const DistantSpaceStationBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const layerCtx = spaceStationLayer(world);
    if (!layerCtx) return;
    const { width, height, state, layerState: st, offsetX, wrapCoordinate } = layerCtx;
    if (!st) return;

    st.rotation += st.rotationSpeed;
    const posX = wrapCoordinate(st.x - offsetX * 0.1);

    ctx.save();
    ctx.translate(posX, st.y);
    ctx.rotate(st.rotation);

    ctx.fillStyle = COSMIC_ARCADE_PALETTE.stationPanels;
    ctx.strokeStyle = COSMIC_ARCADE_PALETTE.cosmicNavy;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;

    ctx.fillRect(-st.panelLength, -st.panelWidth / 2, st.panelLength * 2, st.panelWidth);
    ctx.strokeRect(-st.panelLength, -st.panelWidth / 2, st.panelLength * 2, st.panelWidth);

    ctx.strokeStyle = COSMIC_ARCADE_PALETTE.stationSteel;
    ctx.globalAlpha = 0.35;
    for (let x = -st.panelLength + 6; x < st.panelLength; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, -st.panelWidth / 2);
      ctx.lineTo(x, st.panelWidth / 2);
      ctx.stroke();
    }

    ctx.strokeStyle = COSMIC_ARCADE_PALETTE.stationSteel;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, st.ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(-st.ringRadius, 0);
    ctx.lineTo(st.ringRadius, 0);
    ctx.moveTo(0, -st.ringRadius);
    ctx.lineTo(0, st.ringRadius);
    ctx.stroke();

    const hubGrad = getOrCreateCached(state, "cachedStationGradient", width, height, () => {
      const grad = ctx.createRadialGradient(
        -st.coreRadius * 0.2, -st.coreRadius * 0.2, 1,
        0, 0, st.coreRadius
      );
      grad.addColorStop(0, COSMIC_ARCADE_PALETTE.white);
      grad.addColorStop(0.5, COSMIC_ARCADE_PALETTE.stationSteel);
      grad.addColorStop(1, COSMIC_ARCADE_PALETTE.voidBlack);
      return grad;
    });

    ctx.fillStyle = hubGrad;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, st.coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COSMIC_ARCADE_PALETTE.neonCyan;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, st.coreRadius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < st.beacons.length; i++) {
      const b = st.beacons[i];
      b.twinklePhase += b.twinkleSpeed;
      const pulse = 0.3 + 0.7 * Math.sin(b.twinklePhase);

      ctx.fillStyle = b.color;
      ctx.globalAlpha = pulse;

      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COSMIC_ARCADE_PALETTE.white;
      ctx.globalAlpha = Math.min(1.0, pulse * 1.2);
      ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
    }

    ctx.restore();
  }
};

export const SkiaDistantSpaceStationBackgroundEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const layerCtx = spaceStationLayer(world);
    if (!layerCtx) return;
    const { width, height, state, layerState: st, offsetX, wrapCoordinate } = layerCtx;
    if (!st) return;

    st.rotation += st.rotationSpeed;
    const posX = wrapCoordinate(st.x - offsetX * 0.1);

    canvas.save();
    canvas.translate(posX, st.y);
    canvas.rotate((st.rotation * 180) / Math.PI, 0, 0);

    const panelPaint = Skia.Paint();
    panelPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.stationPanels));
    panelPaint.setAlphaf(0.6);
    canvas.drawRect(
      Skia.XYWHRect(-st.panelLength, -st.panelWidth / 2, st.panelLength * 2, st.panelWidth),
      panelPaint
    );

    const panelStrokePaint = Skia.Paint();
    panelStrokePaint.setStyle(Skia.PaintStyle.Stroke);
    panelStrokePaint.setStrokeWidth(1);
    panelStrokePaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.cosmicNavy));
    panelStrokePaint.setAlphaf(0.6);
    canvas.drawRect(
      Skia.XYWHRect(-st.panelLength, -st.panelWidth / 2, st.panelLength * 2, st.panelWidth),
      panelStrokePaint
    );

    const gridPaint = Skia.Paint();
    gridPaint.setStyle(Skia.PaintStyle.Stroke);
    gridPaint.setStrokeWidth(1);
    gridPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.stationSteel));
    gridPaint.setAlphaf(0.35);
    for (let x = -st.panelLength + 6; x < st.panelLength; x += 8) {
      canvas.drawLine(x, -st.panelWidth / 2, x, st.panelWidth / 2, gridPaint);
    }

    const ringPaint = Skia.Paint();
    ringPaint.setStyle(Skia.PaintStyle.Stroke);
    ringPaint.setStrokeWidth(2.5);
    ringPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.stationSteel));
    ringPaint.setAlphaf(0.55);
    canvas.drawCircle(0, 0, st.ringRadius, ringPaint);

    const spokePaint = Skia.Paint();
    spokePaint.setStyle(Skia.PaintStyle.Stroke);
    spokePaint.setStrokeWidth(1);
    spokePaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.stationSteel));
    spokePaint.setAlphaf(0.4);
    canvas.drawLine(-st.ringRadius, 0, st.ringRadius, 0, spokePaint);
    canvas.drawLine(0, -st.ringRadius, 0, st.ringRadius, spokePaint);

    const hubShader = getOrCreateCached(state, "cachedStationSkiaShader", width, height, () => {
      return Skia.Shader.MakeRadialGradient(
        Skia.Point(-st.coreRadius * 0.2, -st.coreRadius * 0.2),
        st.coreRadius,
        [
          Skia.Color(COSMIC_ARCADE_PALETTE.white),
          Skia.Color(COSMIC_ARCADE_PALETTE.stationSteel),
          Skia.Color(COSMIC_ARCADE_PALETTE.voidBlack)
        ],
        [0.0, 0.5, 1.0],
        Skia.TileMode.Clamp
      );
    });

    const hubPaint = Skia.Paint();
    hubPaint.setShader(hubShader);
    hubPaint.setAlphaf(0.85);
    canvas.drawCircle(0, 0, st.coreRadius, hubPaint);

    const viewportPaint = Skia.Paint();
    viewportPaint.setStyle(Skia.PaintStyle.Stroke);
    viewportPaint.setStrokeWidth(1);
    viewportPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.neonCyan));
    viewportPaint.setAlphaf(0.7);
    canvas.drawCircle(0, 0, st.coreRadius * 0.5, viewportPaint);

    const beaconPaint = Skia.Paint();
    const beaconCorePaint = Skia.Paint();
    beaconCorePaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.white));

    for (let i = 0; i < st.beacons.length; i++) {
      const b = st.beacons[i];
      b.twinklePhase += b.twinkleSpeed;
      const pulse = 0.3 + 0.7 * Math.sin(b.twinklePhase);

      beaconPaint.setColor(b.skColor || Skia.Color(COSMIC_ARCADE_PALETTE.dangerRed));
      beaconPaint.setAlphaf(pulse);
      canvas.drawCircle(b.x, b.y, 3.5, beaconPaint);

      beaconCorePaint.setAlphaf(Math.min(1.0, pulse * 1.2));
      canvas.drawRect(Skia.XYWHRect(b.x - 1, b.y - 1, 2, 2), beaconCorePaint);
    }

    canvas.restore();
  }
};
