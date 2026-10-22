import type { ShapeDrawer } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import type { OutrunComponentRegistry, RoadSegmentSprite } from "../types/OutrunTypes";
import { Skia } from "../../shared/rendering/SkiaContext";
import {
  resolveOutrunRoadContext,
  projectOutrunRoad,
  projectionBuffer,
  iterateOutrunSprites,
  resolveOutrunCarContext,
  resolveOutrunRacerDrawContext,
  resolveOutrunHudContext,
  resolveOffroadDustParams
} from "./OutrunRenderShared";
import { computeSpeedLines, computeOutrunPlayerPixelSize } from "./OutrunVisualHelpers";
import { computeOutrunRoadSpeedLineSegments, resolveOutrunRoadSegmentArtwork } from "./OutrunRoadArtwork";
import { resolveOutrunSceneryLayout, type OutrunSceneryLayout, type MountainLayerLayout } from "./OutrunScenery";
import { colors } from "../../../theme/colors";
import { hexToRgba } from "../../shared/rendering/CosmicPalette";
import {
  OUTRUN_PLAYER_PIXEL_SPRITE,
  OUTRUN_TRAFFIC_PIXEL_SPRITE,
  getOutrunAnimationFrame,
  resolveOutrunPixelColor,
  visitOutrunPixelRuns
} from "./OutrunPixelSprites";

function drawRoadSpriteSkia(
  canvas: SkCanvas,
  sp: RoadSegmentSprite,
  sx: number,
  sy: number,
  sw: number,
  clipY: number,
  palette: import("./OutrunPalettes").ModulatedPalette
): void {
  if (!Skia || sy >= clipY || sw < 2) return;

  const size = sw * 0.8;
  const h = size * 1.5;

  if (sp.kind === "arch" || sp.kind === "banner") {
    const archW = sw * 2.2;
    const archH = sw * 1.2;

    const pillarPaint = Skia.Paint();
    pillarPaint.setColor(Skia.Color(colors.slate));
    pillarPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(sx - archW / 2, sy - archH, archW * 0.1, archH), pillarPaint);
    canvas.drawRect(Skia.XYWHRect(sx + archW / 2 - archW * 0.1, sy - archH, archW * 0.1, archH), pillarPaint);

    const bannerPaint = Skia.Paint();
    bannerPaint.setColor(Skia.Color(sp.kind === "arch" ? colors.pink : colors.blue));
    bannerPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(sx - archW / 2, sy - archH, archW, archH * 0.35), bannerPaint);
  } else if (sp.kind === "billboard") {
    const bw = size * 1.8;
    const bh = size * 1.0;

    const postPaint = Skia.Paint();
    postPaint.setColor(Skia.Color(colors.borderDark));
    postPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(sx - 4, sy - bh, 8, bh), postPaint);

    const boardPaint = Skia.Paint();
    boardPaint.setColor(Skia.Color(colors.blueLight));
    boardPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(sx - bw / 2, sy - bh - bh * 0.8, bw, bh), boardPaint);
  } else if (sp.kind === "chevron") {
    const cw = size * 0.6;
    const ch = size * 0.8;

    const path = Skia.Path.Make();
    path.moveTo(sx - cw / 2, sy);
    path.lineTo(sx + cw / 2, sy - ch / 2);
    path.lineTo(sx - cw / 2, sy - ch);
    path.close();

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(colors.amber));
    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawPath(path, paint);
  } else if (sp.kind === "palm") {
    const trunkPaint = Skia.Paint();
    trunkPaint.setColor(Skia.Color(colors.orangeDark));
    trunkPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(sx - size * 0.08, sy - h, size * 0.16, h), trunkPaint);

    const topPaint = Skia.Paint();
    topPaint.setColor(Skia.Color(colors.green));
    topPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(sx, sy - h, size * 0.6, topPaint);
  } else if (sp.kind === "lamp") {
    const postPaint = Skia.Paint();
    postPaint.setColor(Skia.Color(colors.slate));
    postPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(sx - 2, sy - h, 4, h), postPaint);

    const lightPaint = Skia.Paint();
    lightPaint.setColor(Skia.Color(palette.lightsOn ? colors.yellow : colors.borderLight));
    lightPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(sx, sy - h, size * 0.25, lightPaint);
  } else if (sp.kind === "cypress") {
    const path = Skia.Path.Make();
    path.moveTo(sx - size * 0.3, sy);
    path.lineTo(sx, sy - h * 1.2);
    path.lineTo(sx + size * 0.3, sy);
    path.close();

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(colors.green));
    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawPath(path, paint);
  } else {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(colors.green));
    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(sx, sy - size * 0.3, size * 0.4, paint);
  }
}


function drawSkyBandsSkia(canvas: SkCanvas, layout: OutrunSceneryLayout, screenW: number): void {
  for (const band of layout.skyBands) {
    const paint = Skia.Paint(); paint.setColor(Skia.Color(band.color)); paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(0, band.y, screenW, band.height + 0.5), paint);
  }
}
function drawStarsSkia(canvas: SkCanvas, layout: OutrunSceneryLayout): void {
  for (const star of layout.stars) {
    const paint = Skia.Paint(); paint.setColor(Skia.Color(layout.creamColor));
    paint.setAlphaf(star.alpha); paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(star.x, star.y, star.diameter, star.diameter), paint);
  }
}
function drawCloudsSkia(canvas: SkCanvas, layout: OutrunSceneryLayout): void {
  for (const cloud of layout.clouds) {
    const paint = Skia.Paint(); paint.setColor(Skia.Color(layout.creamColor));
    paint.setAlphaf(layout.cloudAlpha); paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawOval(Skia.XYWHRect(cloud.x - cloud.width / 2, cloud.y - cloud.height / 2, cloud.width, cloud.height), paint);
  }
}
function drawAstroSkia(canvas: SkCanvas, layout: OutrunSceneryLayout): void {
  const astro = layout.astro;
  const haloPaint = Skia.Paint(); haloPaint.setColor(Skia.Color(astro.color));
  haloPaint.setAlphaf(astro.haloAlpha); haloPaint.setStyle(Skia.PaintStyle.Fill);
  canvas.drawCircle(astro.x, astro.y, astro.haloRadius, haloPaint);
  const diskPaint = Skia.Paint(); diskPaint.setColor(Skia.Color(astro.color)); diskPaint.setStyle(Skia.PaintStyle.Fill);
  canvas.drawCircle(astro.x, astro.y, astro.radius, diskPaint);
}
function createSkiaPath() {
  if (!Skia) throw new Error("Skia is not initialized.");
  return Skia.Path.Make();
}
type CachedSkiaPath = ReturnType<typeof createSkiaPath>;
const skiaMountainPathCache = new Map<string, CachedSkiaPath>();
const skiaSnowPathCache = new Map<string, CachedSkiaPath>();
function buildSkiaMountainPath(layer: MountainLayerLayout, screenW: number, horizonY: number): CachedSkiaPath {
  const path = createSkiaPath(); path.moveTo(0, horizonY);
  for (const point of layer.profile) path.lineTo(point.x, horizonY - point.height);
  path.lineTo(screenW, horizonY); path.close(); return path;
}
function buildSkiaSnowPath(layer: MountainLayerLayout, horizonY: number): CachedSkiaPath {
  const path = createSkiaPath();
  for (const cap of layer.snowCaps) {
    path.moveTo(cap.x - cap.halfWidth, horizonY - cap.peakHeight + cap.halfWidth * 0.95);
    path.lineTo(cap.x, horizonY - cap.peakHeight);
    path.lineTo(cap.x + cap.halfWidth, horizonY - cap.peakHeight + cap.halfWidth * 0.95);
    path.close();
  }
  return path;
}
function drawMountainFallbackSkia(
  canvas: SkCanvas, layer: MountainLayerLayout, layout: OutrunSceneryLayout, screenW: number, color: string
): void {
  for (const tileX of [0, screenW, screenW * 2]) {
    const path = createSkiaPath(); path.moveTo(tileX - layer.offsetX, layout.horizonY);
    for (const point of layer.profile) path.lineTo(tileX - layer.offsetX + point.x, layout.horizonY - point.height);
    path.lineTo(tileX - layer.offsetX + screenW, layout.horizonY); path.close();
    const paint = Skia.Paint(); paint.setColor(Skia.Color(color)); paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawPath(path, paint);
  }
}
function drawMountainLayersSkia(canvas: SkCanvas, layout: OutrunSceneryLayout, screenW: number): void {
  for (const layer of layout.mountainLayers) {
    if (typeof canvas.translate !== "function" || typeof canvas.save !== "function" || typeof canvas.restore !== "function") {
      drawMountainFallbackSkia(canvas, layer, layout, screenW, layer.color);
    } else {
      let path = skiaMountainPathCache.get(layer.cacheKey);
      if (!path) { path = buildSkiaMountainPath(layer, screenW, layout.horizonY); skiaMountainPathCache.set(layer.cacheKey, path); }
      const paint = Skia.Paint(); paint.setColor(Skia.Color(layer.color)); paint.setStyle(Skia.PaintStyle.Fill);
      for (const tileX of [0, screenW, screenW * 2]) {
        canvas.save(); canvas.translate(tileX - layer.offsetX, 0); canvas.drawPath(path, paint); canvas.restore();
      }
    }
    if (layer.snowCaps.length > 0) {
      let snowPath = skiaSnowPathCache.get(layer.cacheKey);
      if (!snowPath) { snowPath = buildSkiaSnowPath(layer, layout.horizonY); skiaSnowPathCache.set(layer.cacheKey, snowPath); }
      const paint = Skia.Paint(); paint.setColor(Skia.Color(layout.creamColor));
      paint.setAlphaf(layout.snowPeakAlpha); paint.setStyle(Skia.PaintStyle.Fill);
      for (const tileX of [0, screenW, screenW * 2]) {
        if (typeof canvas.save === "function") canvas.save();
        if (typeof canvas.translate === "function") canvas.translate(tileX - layer.offsetX, 0);
        canvas.drawPath(snowPath, paint);
        if (typeof canvas.restore === "function") canvas.restore();
      }
    }
  }
}
function drawOutrunScenerySkia(canvas: SkCanvas, layout: OutrunSceneryLayout, screenW: number, screenH: number): void {
  drawSkyBandsSkia(canvas, layout, screenW);
  drawStarsSkia(canvas, layout);
  drawCloudsSkia(canvas, layout);
  drawAstroSkia(canvas, layout);
  drawMountainLayersSkia(canvas, layout, screenW);
  const groundPaint = Skia.Paint(); groundPaint.setColor(Skia.Color(layout.groundColor));
  groundPaint.setStyle(Skia.PaintStyle.Fill);
  canvas.drawRect(Skia.XYWHRect(0, layout.horizonY, screenW, screenH - layout.horizonY), groundPaint);
}

export const drawSkiaOutrunRoad: ShapeDrawer<SkCanvas, OutrunComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const roadCtx = resolveOutrunRoadContext(world);
    if (!roadCtx) return;

    const { state, roadData, config, screenW, screenH, palette, visualPalette } = roadCtx;
    const sceneryLayout = resolveOutrunSceneryLayout(world, state, roadData, config);
    const horizonY = sceneryLayout.horizonY;
    drawOutrunScenerySkia(canvas, sceneryLayout, screenW, screenH);

    // 2. Road Segments Pass
    const count = projectOutrunRoad(roadData.segments, state.playerZ, state.playerX, config, screenW, screenH);
    if (count === 0) {
      console.warn("[drawSkiaOutrunRoad] projectOutrunRoad returned 0 projected segments.");
    }

    let renderedCount = 0;
    for (let i = count - 1; i >= 0; i--) {
      const p = projectionBuffer[i]!;
      if (p.y1 <= p.y2 || p.y2 >= p.clip) continue;
      renderedCount++;

      const artwork = resolveOutrunRoadSegmentArtwork(p.index, p.fog, visualPalette);

      // Depth haze and alternating ground stripe.
      const groundPaint = Skia.Paint();
      groundPaint.setColor(Skia.Color(artwork.groundColor));
      groundPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(0, p.y2, screenW, p.y1 - p.y2), groundPaint);

      // Coast: water is restricted to the left side, beyond the outer kerb.
      if (artwork.waterColor !== null) {
        const outerW2 = p.w2 * (1 + artwork.kerbWidthRatio);
        const outerW1 = p.w1 * (1 + artwork.kerbWidthRatio);
        const waterPath = Skia.Path.Make();
        waterPath.moveTo(0, p.y2);
        waterPath.lineTo(p.x2 - outerW2, p.y2);
        waterPath.lineTo(p.x1 - outerW1, p.y1);
        waterPath.lineTo(0, p.y1);
        waterPath.close();
        const waterPaint = Skia.Paint();
        waterPaint.setColor(Skia.Color(artwork.waterColor));
        waterPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawPath(waterPath, waterPaint);
      }

      // Pianos alternate cream and the hour-specific dark token.
      const outerW2 = p.w2 * (1 + artwork.kerbWidthRatio);
      const outerW1 = p.w1 * (1 + artwork.kerbWidthRatio);
      const kerbPath = Skia.Path.Make();
      kerbPath.moveTo(p.x2 - outerW2, p.y2);
      kerbPath.lineTo(p.x2 + outerW2, p.y2);
      kerbPath.lineTo(p.x1 + outerW1, p.y1);
      kerbPath.lineTo(p.x1 - outerW1, p.y1);
      kerbPath.close();
      const kerbPaint = Skia.Paint();
      kerbPaint.setColor(Skia.Color(artwork.kerbColor));
      kerbPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawPath(kerbPath, kerbPaint);

      // Road surface uses the configured near/far tokens.
      const roadPath = Skia.Path.Make();
      roadPath.moveTo(p.x2 - p.w2, p.y2);
      roadPath.lineTo(p.x2 + p.w2, p.y2);
      roadPath.lineTo(p.x1 + p.w1, p.y1);
      roadPath.lineTo(p.x1 - p.w1, p.y1);
      roadPath.close();
      const roadPaint = Skia.Paint();
      roadPaint.setColor(Skia.Color(artwork.roadColor));
      roadPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawPath(roadPath, roadPaint);

      // Lane dashes share the even-segment rhythm of the dark kerb.
      if (artwork.drawLane) {
        const halfMarkW1 = p.w1 * artwork.laneMarkWidthRatio * 0.5;
        const halfMarkW2 = p.w2 * artwork.laneMarkWidthRatio * 0.5;
        const lanePath = Skia.Path.Make();
        lanePath.moveTo(p.x2 - halfMarkW2, p.y2);
        lanePath.lineTo(p.x2 + halfMarkW2, p.y2);
        lanePath.lineTo(p.x1 + halfMarkW1, p.y1);
        lanePath.lineTo(p.x1 - halfMarkW1, p.y1);
        lanePath.close();
        const lanePaint = Skia.Paint();
        lanePaint.setColor(Skia.Color(artwork.laneColor));
        lanePaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawPath(lanePath, lanePaint);
      }

    }


    if (count > 0 && renderedCount === 0) {
      console.warn("[drawSkiaOutrunRoad] 100% of projected road segments were clipped or discarded.");
    }

    // Short radial streaks stay on the ground outside the pianos.
    const speedLines = computeOutrunRoadSpeedLineSegments({
      projectedSegments: projectionBuffer,
      count,
      state,
      config,
      visualPalette,
      screenW,
      screenH,
      horizonY
    });
    if (speedLines.length > 0) {
      const speedPaint = Skia.Paint();
      speedPaint.setColor(Skia.Color(visualPalette.shared.cream));
      speedPaint.setAlphaf(visualPalette.tuning.road.speedLineAlpha);
      speedPaint.setStyle(Skia.PaintStyle.Stroke);
      speedPaint.setStrokeWidth(visualPalette.tuning.road.speedLineWidthPx);
      speedPaint.setStrokeCap(Skia.StrokeCap.Round);
      const speedPath = Skia.Path.Make();
      for (const line of speedLines) {
        speedPath.moveTo(line.x1, line.y1);
        speedPath.lineTo(line.x2, line.y2);
      }
      canvas.drawPath(speedPath, speedPaint);
    }

    // 3. Roadside Sprites Pass
    iterateOutrunSprites(canvas, count, roadData, config, palette.lightsOn, (c, sp, sx, sy, _sw, _roadW, _lightsOn, clipY) => {
      drawRoadSpriteSkia(c, sp, sx, sy, _sw, clipY, palette);
    });
  }
};

export const drawSkiaOutrunCar: ShapeDrawer<SkCanvas, OutrunComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia || entity === undefined) return;
    const carCtx = resolveOutrunCarContext(world, entity);
    if (!carCtx) return;

    const { state, config, carColor, geom } = carCtx;
    const { baseX, baseY, carScale, tiltAngle, isOffroad, speedRatio } = geom;

    canvas.save();

    // Offroad Dust
    if (isOffroad && speedRatio > 0) {
      const { dustColor, particles } = resolveOffroadDustParams(world, state.playerZ, speedRatio);
      for (const p of particles) {
        const dustPaint = Skia.Paint();
        dustPaint.setColor(Skia.Color(dustColor));
        dustPaint.setAlphaf(p.alpha);
        dustPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawCircle(baseX + p.dx, baseY + p.dy, p.radius, dustPaint);
      }
    }

    // Speed Lines
    const speedLines = computeSpeedLines(config.WIDTH, config.HEIGHT, config.HEIGHT * 0.45, state.playerZ, speedRatio);
    if (speedLines) {
      for (const line of speedLines) {
        const linePaint = Skia.Paint();
        linePaint.setColor(Skia.Color(colors.white));
        linePaint.setAlphaf(line.alpha);
        linePaint.setStyle(Skia.PaintStyle.Stroke);
        linePaint.setStrokeWidth(2);
        canvas.drawLine(line.x1, line.y1, line.x2, line.y2, linePaint);
      }
    }

    canvas.translate(baseX, baseY);
    canvas.rotate((tiltAngle * 180) / Math.PI, 0, 0);
    canvas.scale(carScale, carScale);

    const pixelSize = computeOutrunPlayerPixelSize(config);
    const spriteWidth = OUTRUN_PLAYER_PIXEL_SPRITE.width * pixelSize;
    const spriteHeight = OUTRUN_PLAYER_PIXEL_SPRITE.height * pixelSize;

    // Keep shadow proportions identical to Canvas and the road-relative sprite.
    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(hexToRgba(colors.surface, 0.4)));
    shadowPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(
      Skia.XYWHRect(-spriteWidth * 0.375, spriteHeight / 2, spriteWidth * 0.75, pixelSize),
      shadowPaint
    );
    canvas.drawRect(
      Skia.XYWHRect(-spriteWidth * 0.25, spriteHeight / 2 + pixelSize, spriteWidth * 0.5, pixelSize),
      shadowPaint
    );

    const playerFrame = getOutrunAnimationFrame(state.playerZ);
    const playerSprite = OUTRUN_PLAYER_PIXEL_SPRITE.frames[playerFrame]!;
    const pixelPaint = Skia.Paint();
    pixelPaint.setStyle(Skia.PaintStyle.Fill);
    visitOutrunPixelRuns(
      playerSprite,
      -spriteWidth / 2,
      -spriteHeight / 2,
      pixelSize,
      (pixel, x, y, width, height) => {
      pixelPaint.setColor(Skia.Color(resolveOutrunPixelColor(pixel, carColor)));
      canvas.drawRect(Skia.XYWHRect(x, y, width, height), pixelPaint);
    });

    canvas.restore();
  }
};

export const drawSkiaOutrunRacer: ShapeDrawer<SkCanvas, OutrunComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia || entity === undefined) return;
    const racerCtx = resolveOutrunRacerDrawContext(world, entity);
    if (!racerCtx) return;

    const { proj, bodyColor } = racerCtx;
    const { sx, sy, lateral, carW, bestClip } = proj;

    const cx = sx + lateral;
    const cy = sy;

    if (cy >= bestClip || carW < 2) return;

    canvas.save();

    const pixelSize = carW / OUTRUN_TRAFFIC_PIXEL_SPRITE.width;
    const spriteWidth = pixelSize * OUTRUN_TRAFFIC_PIXEL_SPRITE.width;
    const spriteHeight = pixelSize * OUTRUN_TRAFFIC_PIXEL_SPRITE.height;

    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(hexToRgba(colors.surface, 0.35)));
    shadowPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(
      Skia.XYWHRect(
        cx - spriteWidth * 0.35,
        cy + spriteHeight * 0.4,
        spriteWidth * 0.7,
        Math.max(1, pixelSize)
      ),
      shadowPaint
    );

    const trafficSprite = OUTRUN_TRAFFIC_PIXEL_SPRITE.frames[racerCtx.frame]!;
    const pixelPaint = Skia.Paint();
    pixelPaint.setStyle(Skia.PaintStyle.Fill);
    visitOutrunPixelRuns(
      trafficSprite,
      cx - spriteWidth / 2,
      cy - spriteHeight / 2,
      pixelSize,
      (pixel, x, y, width, height) => {
        pixelPaint.setColor(Skia.Color(resolveOutrunPixelColor(pixel, bodyColor)));
        canvas.drawRect(Skia.XYWHRect(x, y, width, height), pixelPaint);
      }
    );

    canvas.restore();
  }
};

export const drawSkiaOutrunHud = {
  draw(canvas: SkCanvas, world: import("@tiny-aster/core").World<OutrunComponentRegistry>): void {
    if (!Skia) return;
    const hudCtx = resolveOutrunHudContext(world);
    if (!hudCtx) return;

    const { state, config, hudBg, hudAccent } = hudCtx;

    canvas.save();

    const bgPaint = Skia.Paint();
    bgPaint.setColor(Skia.Color(hudBg));
    bgPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(16, 16, 180, 60), bgPaint);

    const borderPaint = Skia.Paint();
    borderPaint.setColor(Skia.Color(hudAccent));
    borderPaint.setStyle(Skia.PaintStyle.Stroke);
    borderPaint.setStrokeWidth(1.5);
    canvas.drawRect(Skia.XYWHRect(16, 16, 180, 60), borderPaint);

    if (state.isGameOver) {
      const overPaint = Skia.Paint();
      overPaint.setColor(Skia.Color(hexToRgba(colors.surface, 0.6)));
      overPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(0, 0, config.WIDTH, config.HEIGHT), overPaint);
    }

    canvas.restore();
  }
};
