import { EffectDrawer, CoreComponentRegistry } from "@tiny-aster/core";
import { Skia } from "../SkiaContext";
import { COSMIC_ARCADE_PALETTE, hexToRgba, getSkiaColor } from "../CosmicPalette";
import { getPlanetTheme } from "../CelestialBodiesSystem";
import {
  createParallaxLayer,
  RingingPlanetState,
  initializeRingingPlanet,
  getActiveVisualContext,
  getOrCreateCached
} from "../SharedVFXInternal";

const ringingPlanetLayer = createParallaxLayer<RingingPlanetState | undefined>({
  layerName: "layer4_distant_asteroids",
  isInitialized: (state) => state.planetInitialized,
  initialize: initializeRingingPlanet,
  getState: (state) => state.planet
});

export const RingingPlanetBackgroundEffect: EffectDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world) {
    const layerCtx = ringingPlanetLayer(world);
    if (!layerCtx) return;
    const { width, height, state, layerState: planet, offsetX, wrapCoordinate } = layerCtx;
    if (!planet) return;

    const posX = wrapCoordinate(planet.x - offsetX * 0.1, planet.radius * 3);

    ctx.save();

    const theme = getActiveVisualContext(world);
    const planetTheme = getPlanetTheme(theme.planetProfile || "purple");

    ctx.save();
    ctx.translate(posX, planet.y);
    ctx.rotate(planet.ringTilt);
    ctx.scale(1.0, 0.32);

    ctx.strokeStyle = planetTheme.ringColorBase;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = planet.ringOuterRadius - planet.ringInnerRadius;
    const midRingRadius = (planet.ringInnerRadius + planet.ringOuterRadius) / 2;

    ctx.beginPath();
    ctx.arc(0, 0, midRingRadius, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const planetGrad = getOrCreateCached(state, "cachedPlanetGradient", width, height, () => {
      const grad = ctx.createRadialGradient(
        -planet.radius * 0.3, -planet.radius * 0.3, planet.radius * 0.1,
        0, 0, planet.radius
      );
      grad.addColorStop(0, planetTheme.bodyGradient[0]);
      grad.addColorStop(0.5, planetTheme.bodyGradient[1]);
      grad.addColorStop(1, planetTheme.bodyGradient[2]);
      return grad;
    });

    ctx.save();
    ctx.translate(posX, planet.y);

    ctx.strokeStyle = planetTheme.atmosphereColor;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, planet.radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = planetGrad;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hexToRgba(COSMIC_ARCADE_PALETTE.voidBlack, 0.25);
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < planet.craters.length; i++) {
      const crater = planet.craters[i];
      ctx.beginPath();
      ctx.arc(crater.x, crater.y, crater.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(posX, planet.y);
    ctx.rotate(planet.ringTilt);
    ctx.scale(1.0, 0.32);

    ctx.strokeStyle = planetTheme.ringColorHighlight;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = planet.ringOuterRadius - planet.ringInnerRadius;

    ctx.beginPath();
    ctx.arc(0, 0, midRingRadius, 0, Math.PI);
    ctx.stroke();

    ctx.strokeStyle = hexToRgba(COSMIC_ARCADE_PALETTE.voidBlack, 0.8);
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = (planet.ringOuterRadius - planet.ringInnerRadius) * 0.15;
    ctx.beginPath();
    ctx.arc(0, 0, midRingRadius * 0.96, 0, Math.PI);
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.translate(planet.moonX, planet.moonY);

    ctx.fillStyle = COSMIC_ARCADE_PALETTE.stationSteel;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, planet.moonRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COSMIC_ARCADE_PALETTE.cosmicNavy;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < planet.moonCraters.length; i++) {
      const mc = planet.moonCraters[i];
      ctx.beginPath();
      ctx.arc(mc.x, mc.y, mc.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }
};

export const SkiaRingingPlanetBackgroundEffect: EffectDrawer<any, CoreComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const layerCtx = ringingPlanetLayer(world);
    if (!layerCtx) return;
    const { width, height, state, layerState: planet, offsetX, wrapCoordinate } = layerCtx;
    if (!planet) return;

    const posX = wrapCoordinate(planet.x - offsetX * 0.1, planet.radius * 3);
    const theme = getActiveVisualContext(world);
    const planetTheme = getPlanetTheme(theme.planetProfile || "purple");

    canvas.save();

    const midRingRadius = (planet.ringInnerRadius + planet.ringOuterRadius) / 2;
    const ringThickness = planet.ringOuterRadius - planet.ringInnerRadius;

    canvas.save();
    canvas.translate(posX, planet.y);
    canvas.rotate((planet.ringTilt * 180) / Math.PI, 0, 0);
    canvas.scale(1.0, 0.32);

    const backRingPaint = Skia.Paint();
    backRingPaint.setStyle(Skia.PaintStyle.Stroke);
    backRingPaint.setStrokeWidth(ringThickness);
    backRingPaint.setColor(Skia.Color(planetTheme.ringColorBase));
    backRingPaint.setAlphaf(0.35);

    const backRingPath = Skia.Path.Make();
    backRingPath.addArc(
      Skia.XYWHRect(-midRingRadius, -midRingRadius, midRingRadius * 2, midRingRadius * 2),
      180, 180
    );
    canvas.drawPath(backRingPath, backRingPaint);
    canvas.restore();

    canvas.save();
    canvas.translate(posX, planet.y);

    const atmosPaint = Skia.Paint();
    atmosPaint.setStyle(Skia.PaintStyle.Stroke);
    atmosPaint.setStrokeWidth(3);
    atmosPaint.setColor(Skia.Color(planetTheme.atmosphereColor));
    atmosPaint.setAlphaf(0.25);
    canvas.drawCircle(0, 0, planet.radius + 2, atmosPaint);

    const planetShader = getOrCreateCached(state, "cachedPlanetSkiaShader", width, height, () => {
      return Skia.Shader.MakeRadialGradient(
        Skia.Point(-planet.radius * 0.3, -planet.radius * 0.3),
        planet.radius,
        [
          Skia.Color(planetTheme.bodyGradient[0]),
          Skia.Color(planetTheme.bodyGradient[1]),
          Skia.Color(planetTheme.bodyGradient[2])
        ],
        [0.0, 0.5, 1.0],
        Skia.TileMode.Clamp
      );
    });

    const planetPaint = Skia.Paint();
    planetPaint.setShader(planetShader);
    canvas.drawCircle(0, 0, planet.radius, planetPaint);

    const craterPaint = Skia.Paint();
    craterPaint.setColor(getSkiaColor(COSMIC_ARCADE_PALETTE.voidBlack, 0.25));
    craterPaint.setAlphaf(0.25);
    for (let i = 0; i < planet.craters.length; i++) {
      const crater = planet.craters[i];
      canvas.drawCircle(crater.x, crater.y, crater.radius, craterPaint);
    }
    canvas.restore();

    canvas.save();
    canvas.translate(posX, planet.y);
    canvas.rotate((planet.ringTilt * 180) / Math.PI, 0, 0);
    canvas.scale(1.0, 0.32);

    const frontRingPaint = Skia.Paint();
    frontRingPaint.setStyle(Skia.PaintStyle.Stroke);
    frontRingPaint.setStrokeWidth(ringThickness);
    frontRingPaint.setColor(Skia.Color(planetTheme.ringColorHighlight));
    frontRingPaint.setAlphaf(0.6);

    const frontRingPath = Skia.Path.Make();
    frontRingPath.addArc(
      Skia.XYWHRect(-midRingRadius, -midRingRadius, midRingRadius * 2, midRingRadius * 2),
      0, 180
    );
    canvas.drawPath(frontRingPath, frontRingPaint);

    const gapPaint = Skia.Paint();
    gapPaint.setStyle(Skia.PaintStyle.Stroke);
    gapPaint.setStrokeWidth(ringThickness * 0.15);
    gapPaint.setColor(getSkiaColor(COSMIC_ARCADE_PALETTE.voidBlack, 0.8));
    gapPaint.setAlphaf(0.4);

    const gapPath = Skia.Path.Make();
    gapPath.addArc(
      Skia.XYWHRect(-midRingRadius * 0.96, -midRingRadius * 0.96, midRingRadius * 1.92, midRingRadius * 1.92),
      0, 180
    );
    canvas.drawPath(gapPath, gapPaint);
    canvas.restore();

    canvas.save();
    canvas.translate(planet.moonX, planet.moonY);

    const moonPaint = Skia.Paint();
    moonPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.stationSteel));
    moonPaint.setAlphaf(0.85);
    canvas.drawCircle(0, 0, planet.moonRadius, moonPaint);

    const moonCraterPaint = Skia.Paint();
    moonCraterPaint.setColor(Skia.Color(COSMIC_ARCADE_PALETTE.cosmicNavy));
    moonCraterPaint.setAlphaf(0.5);
    for (let i = 0; i < planet.moonCraters.length; i++) {
      const mc = planet.moonCraters[i];
      canvas.drawCircle(mc.x, mc.y, mc.radius, moonCraterPaint);
    }
    canvas.restore();

    canvas.restore();
  }
};
