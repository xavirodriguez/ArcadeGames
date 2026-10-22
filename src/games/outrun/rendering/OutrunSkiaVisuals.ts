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
import { computeSpeedLines, computeOutrunPlayerArtworkScale } from "./OutrunVisualHelpers";
import { computeOutrunRoadSpeedLineSegments, resolveOutrunRoadSegmentArtwork } from "./OutrunRoadArtwork";
import { resolveOutrunRoadsideArtworkStyle } from "./OutrunRoadsideArtwork";
import { resolveOutrunPlayerPalette, resolveOutrunTrafficArtworkStyle } from "./OutrunVehicleArtwork";
import { computeOutrunHeadlightBeams } from "./OutrunLighting";
import { resolveOutrunHudLayout } from "./OutrunHudArtwork";
import { resolveOutrunSceneryLayout, type OutrunSceneryLayout, type MountainLayerLayout } from "./OutrunScenery";
import { colors } from "../../../theme/colors";
import { hexToRgba } from "../../shared/rendering/CosmicPalette";

type RoadsidePoint = { x: number; y: number };

function fillRoadsidePolygonSkia(
  canvas: SkCanvas,
  points: readonly RoadsidePoint[],
  color: string
): void {
  if (!Skia || points.length < 3) return;
  const path = Skia.Path.Make();
  path.moveTo(points[0]!.x, points[0]!.y);
  for (let index = 1; index < points.length; index++) {
    const point = points[index]!;
    path.lineTo(point.x, point.y);
  }
  path.close();
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setStyle(Skia.PaintStyle.Fill);
  canvas.drawPath(path, paint);
}

function drawRoadSpriteSkia(
  canvas: SkCanvas,
  sp: RoadSegmentSprite,
  sx: number,
  sy: number,
  sw: number,
  clipY: number,
  visualPalette: import("../types/OutrunVisualTypes").OutrunVisualPaletteResource,
  depth: number,
  lightsOn: boolean
): void {
  if (!Skia || sy >= clipY || sw < 2) return;

  const size = sw * 0.8;

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
    const bh = size;
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
    fillRoadsidePolygonSkia(canvas, [
      { x: sx - cw / 2, y: sy },
      { x: sx + cw / 2, y: sy - ch / 2 },
      { x: sx - cw / 2, y: sy - ch }
    ], colors.amber);
  } else {
    const style = resolveOutrunRoadsideArtworkStyle(sp, visualPalette, depth, sw, lightsOn);
    const h = style.height;
    const trunkH = h * visualPalette.tuning.tree.trunkHeightToHeight;
    const trunkW = h * visualPalette.tuning.tree.trunkWidthToHeight;
    const crownX = sx;
    const crownY = sy - h * 0.645;

    switch (style.kind) {
      case "tree": {
        const trunkPaint = Skia.Paint();
        trunkPaint.setColor(Skia.Color(style.trunkColor));
        trunkPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawRect(Skia.XYWHRect(sx - trunkW / 2, sy - trunkH, trunkW, trunkH), trunkPaint);
        const radiusX = h * visualPalette.tuning.tree.canopyRadiusXToHeight;
        const radiusY = h * visualPalette.tuning.tree.canopyRadiusYToHeight;
        const canopyPaint = Skia.Paint();
        canopyPaint.setColor(Skia.Color(style.foliageColor));
        canopyPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawOval(Skia.XYWHRect(crownX - radiusX, crownY - radiusY, radiusX * 2, radiusY * 2), canopyPaint);
        const highlightPaint = Skia.Paint();
        highlightPaint.setColor(Skia.Color(style.foliageLightColor));
        highlightPaint.setAlphaf(style.highlightAlpha);
        highlightPaint.setStyle(Skia.PaintStyle.Fill);
        const highlightX = crownX - radiusX * visualPalette.tuning.tree.highlightOffsetX;
        const highlightY = crownY - radiusY * visualPalette.tuning.tree.highlightOffsetY;
        const highlightRadiusX = radiusX * visualPalette.tuning.tree.highlightScale;
        const highlightRadiusY = radiusY * visualPalette.tuning.tree.highlightScale;
        canvas.drawOval(Skia.XYWHRect(
          highlightX - highlightRadiusX, highlightY - highlightRadiusY,
          highlightRadiusX * 2, highlightRadiusY * 2
        ), highlightPaint);
        break;
      }
      case "pine": {
        const tiers = [
          { top: h * 0.48, bottom: h * 0.16, halfWidth: h * 0.34 },
          { top: h * 0.73, bottom: h * 0.39, halfWidth: h * 0.26 },
          { top: h * 0.98, bottom: h * 0.65, halfWidth: h * 0.18 }
        ];
        for (const tier of tiers) {
          const topY = sy - tier.top;
          const bottomY = sy - tier.bottom;
          fillRoadsidePolygonSkia(canvas, [
            { x: sx, y: topY }, { x: sx, y: bottomY },
            { x: sx - tier.halfWidth, y: bottomY }
          ], style.foliageLightColor);
          fillRoadsidePolygonSkia(canvas, [
            { x: sx, y: topY }, { x: sx + tier.halfWidth, y: bottomY },
            { x: sx, y: bottomY }
          ], style.foliageColor);
        }
        const trunkPaint = Skia.Paint();
        trunkPaint.setColor(Skia.Color(style.trunkColor));
        trunkPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawRect(Skia.XYWHRect(sx - trunkW * 0.4, sy - trunkH, trunkW * 0.8, trunkH), trunkPaint);
        break;
      }
      case "rock": {
        const w = style.width;
        fillRoadsidePolygonSkia(canvas, [
          { x: sx - w * 0.5, y: sy },
          { x: sx - w * 0.43, y: sy - h * 0.18 },
          { x: sx - w * 0.12, y: sy - h * 0.34 },
          { x: sx + w * 0.2, y: sy - h * 0.29 },
          { x: sx + w * 0.48, y: sy - h * 0.08 },
          { x: sx + w * 0.45, y: sy }
        ], style.rockBaseColor);
        fillRoadsidePolygonSkia(canvas, [
          { x: sx - w * 0.43, y: sy - h * 0.18 },
          { x: sx - w * 0.12, y: sy - h * 0.34 },
          { x: sx + w * 0.2, y: sy - h * 0.29 },
          { x: sx + w * 0.02, y: sy - h * 0.12 },
          { x: sx - w * 0.27, y: sy - h * 0.1 }
        ], style.rockShadeColor);
        break;
      }
      case "palm": {
        const crownTopY = sy - h * 0.86;
        const crownTopX = sx + h * 0.06;
        const trunkPath = Skia.Path.Make();
        trunkPath.moveTo(sx, sy);
        trunkPath.quadTo(sx - h * 0.04, sy - h * 0.45, crownTopX, crownTopY);
        const trunkPaint = Skia.Paint();
        trunkPaint.setColor(Skia.Color(style.trunkColor));
        trunkPaint.setStyle(Skia.PaintStyle.Stroke);
        trunkPaint.setStrokeWidth(Math.max(1, h * 0.055));
        trunkPaint.setStrokeCap(Skia.StrokeCap.Round);
        canvas.drawPath(trunkPath, trunkPaint);
        const leafAngles = [-2.85, -2.35, -1.8, -1.25, -0.65];
        leafAngles.forEach((angle, index) => {
          const length = h * (index === 2 ? 0.42 : 0.36);
          const tip = {
            x: crownTopX + Math.cos(angle) * length,
            y: crownTopY + Math.sin(angle) * length * 0.72
          };
          const side = {
            x: crownTopX + Math.cos(angle + Math.PI / 2) * h * 0.07,
            y: crownTopY + Math.sin(angle + Math.PI / 2) * h * 0.07
          };
          fillRoadsidePolygonSkia(canvas, [
            { x: crownTopX, y: crownTopY }, tip, side
          ], index % 2 === 0 ? style.foliageLightColor : style.foliageColor);
        });
        break;
      }
      case "lighthouse": {
        const w = style.width;
        const topY = sy - h * 0.84;
        const topW = w * 0.34;
        const bottomW = w * 0.7;
        fillRoadsidePolygonSkia(canvas, [
          { x: sx - topW / 2, y: topY }, { x: sx + topW / 2, y: topY },
          { x: sx + bottomW / 2, y: sy }, { x: sx - bottomW / 2, y: sy }
        ], style.creamColor);
        for (const band of [0.28, 0.55, 0.79]) {
          const bandY = sy - h * band;
          const t = (sy - bandY) / Math.max(1, sy - topY);
          const bandW = topW + (bottomW - topW) * t;
          fillRoadsidePolygonSkia(canvas, [
            { x: sx - bandW / 2, y: bandY - h * 0.055 },
            { x: sx + bandW / 2, y: bandY - h * 0.055 },
            { x: sx + bandW / 2, y: bandY + h * 0.015 },
            { x: sx - bandW / 2, y: bandY + h * 0.015 }
          ], style.darkAccentColor);
        }
        const capPaint = Skia.Paint();
        capPaint.setColor(Skia.Color(style.darkAccentColor));
        capPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawRect(Skia.XYWHRect(sx - w * 0.25, topY - h * 0.06, w * 0.5, h * 0.07), capPaint);
        const lightPaint = Skia.Paint();
        lightPaint.setColor(Skia.Color(style.lightColor));
        lightPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawRect(Skia.XYWHRect(sx - w * 0.13, topY - h * 0.18, w * 0.26, h * 0.12), lightPaint);
        break;
      }
      case "cactus": {
        const cactusPath = Skia.Path.Make();
        cactusPath.moveTo(sx, sy);
        cactusPath.lineTo(sx, sy - h * 0.82);
        cactusPath.moveTo(sx, sy - h * 0.4);
        cactusPath.lineTo(sx - h * 0.21, sy - h * 0.4);
        cactusPath.lineTo(sx - h * 0.21, sy - h * 0.59);
        cactusPath.moveTo(sx, sy - h * 0.58);
        cactusPath.lineTo(sx + h * 0.2, sy - h * 0.58);
        cactusPath.lineTo(sx + h * 0.2, sy - h * 0.74);
        const cactusPaint = Skia.Paint();
        cactusPaint.setColor(Skia.Color(style.foliageColor));
        cactusPaint.setStyle(Skia.PaintStyle.Stroke);
        cactusPaint.setStrokeWidth(Math.max(1, h * 0.14));
        cactusPaint.setStrokeCap(Skia.StrokeCap.Round);
        canvas.drawPath(cactusPath, cactusPaint);
        const stripePath = Skia.Path.Make();
        stripePath.moveTo(sx + h * 0.04, sy - h * 0.08);
        stripePath.lineTo(sx + h * 0.04, sy - h * 0.72);
        const stripePaint = Skia.Paint();
        stripePaint.setColor(Skia.Color(style.foliageLightColor));
        stripePaint.setStyle(Skia.PaintStyle.Stroke);
        stripePaint.setStrokeWidth(Math.max(1, h * 0.045));
        stripePaint.setStrokeCap(Skia.StrokeCap.Round);
        canvas.drawPath(stripePath, stripePaint);
        break;
      }
      case "dry_shrub": {
        const shrubPath = Skia.Path.Make();
        shrubPath.moveTo(sx, sy);
        shrubPath.lineTo(sx - h * 0.24, sy - h * 0.35);
        shrubPath.lineTo(sx - h * 0.32, sy - h * 0.55);
        shrubPath.moveTo(sx - h * 0.15, sy - h * 0.22);
        shrubPath.lineTo(sx + h * 0.07, sy - h * 0.42);
        shrubPath.lineTo(sx + h * 0.2, sy - h * 0.52);
        shrubPath.moveTo(sx + h * 0.01, sy - h * 0.18);
        shrubPath.lineTo(sx + h * 0.26, sy - h * 0.32);
        const shrubPaint = Skia.Paint();
        shrubPaint.setColor(Skia.Color(style.foliageColor));
        shrubPaint.setStyle(Skia.PaintStyle.Stroke);
        shrubPaint.setStrokeWidth(Math.max(1, h * 0.1));
        shrubPaint.setStrokeCap(Skia.StrokeCap.Round);
        canvas.drawPath(shrubPath, shrubPaint);
        const highlightPath = Skia.Path.Make();
        highlightPath.moveTo(sx - h * 0.2, sy - h * 0.31);
        highlightPath.lineTo(sx - h * 0.3, sy - h * 0.46);
        highlightPath.moveTo(sx + h * 0.1, sy - h * 0.32);
        highlightPath.lineTo(sx + h * 0.22, sy - h * 0.42);
        const highlightPaint = Skia.Paint();
        highlightPaint.setColor(Skia.Color(style.foliageLightColor));
        highlightPaint.setStyle(Skia.PaintStyle.Stroke);
        highlightPaint.setStrokeWidth(Math.max(1, h * 0.055));
        highlightPaint.setStrokeCap(Skia.StrokeCap.Round);
        canvas.drawPath(highlightPath, highlightPaint);
        break;
      }
      case "wind_tower": {
        const topY = sy - h * 0.82;
        const towerPath = Skia.Path.Make();
        towerPath.moveTo(sx - h * 0.15, sy);
        towerPath.lineTo(sx, topY);
        towerPath.lineTo(sx + h * 0.15, sy);
        towerPath.moveTo(sx, topY);
        towerPath.lineTo(sx, topY - h * 0.13);
        const towerPaint = Skia.Paint();
        towerPaint.setColor(Skia.Color(style.rockShadeColor));
        towerPaint.setStyle(Skia.PaintStyle.Stroke);
        towerPaint.setStrokeWidth(Math.max(1, h * 0.045));
        canvas.drawPath(towerPath, towerPaint);
        const rotorY = topY - h * 0.13;
        const rotorPaint = Skia.Paint();
        rotorPaint.setColor(Skia.Color(style.creamColor));
        rotorPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawCircle(sx, rotorY, Math.max(1, h * 0.045), rotorPaint);
        const bladesPath = Skia.Path.Make();
        for (const angle of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
          bladesPath.moveTo(sx, rotorY);
          bladesPath.lineTo(sx + Math.cos(angle) * h * 0.2, rotorY + Math.sin(angle) * h * 0.2);
        }
        const bladesPaint = Skia.Paint();
        bladesPaint.setColor(Skia.Color(style.creamColor));
        bladesPaint.setStyle(Skia.PaintStyle.Stroke);
        bladesPaint.setStrokeWidth(Math.max(1, h * 0.03));
        canvas.drawPath(bladesPath, bladesPaint);
        break;
      }
    }
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

function fillVehicleRoundedRectSkia(
  canvas: SkCanvas,
  rect: import("../types/OutrunVisualTypes").OutrunVisualRect,
  color: string
): void {
  if (!Skia) return;
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setStyle(Skia.PaintStyle.Fill);
  const radius = Math.min(rect.cornerRadius, rect.width / 2, rect.height / 2);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height), radius, radius), paint);
}

function fillVehiclePolygonSkia(
  canvas: SkCanvas,
  points: readonly { x: number; y: number }[],
  color: string
): void {
  fillRoadsidePolygonSkia(canvas, points, color);
}

function drawOutrunPlayerVehicleSkia(
  canvas: SkCanvas,
  config: import("../types/OutrunConfigSchema").OutrunConfig
): void {
  if (!Skia) return;
  const tuning = config.visual.tuning.playerCar;
  const shared = resolveOutrunPlayerPalette(config);

  const shadowPaint = Skia.Paint();
  shadowPaint.setColor(Skia.Color(shared.shadow));
  shadowPaint.setAlphaf(tuning.shadow.alpha);
  shadowPaint.setStyle(Skia.PaintStyle.Fill);
  canvas.drawOval(Skia.XYWHRect(
    -tuning.shadow.rx, -tuning.shadow.ry,
    tuning.shadow.rx * 2, tuning.shadow.ry * 2
  ), shadowPaint);

  fillVehicleRoundedRectSkia(canvas, tuning.wheelLeft, shared.shadow);
  fillVehicleRoundedRectSkia(canvas, tuning.wheelRight, shared.shadow);
  fillVehicleRoundedRectSkia(canvas, tuning.body, shared.car);
  fillVehicleRoundedRectSkia(canvas, tuning.lowerShade, shared.carShade);
  fillVehiclePolygonSkia(canvas, tuning.cabin, shared.car);
  fillVehiclePolygonSkia(canvas, tuning.roof, shared.carRoof);
  fillVehiclePolygonSkia(canvas, tuning.rearWindow, shared.carGlass);

  const reflectionPaint = Skia.Paint();
  reflectionPaint.setColor(Skia.Color(shared.cream));
  reflectionPaint.setAlphaf(0.18);
  reflectionPaint.setStyle(Skia.PaintStyle.Fill);
  const reflectionPath = Skia.Path.Make();
  reflectionPath.moveTo(tuning.reflection[0]!.x, tuning.reflection[0]!.y);
  for (let index = 1; index < tuning.reflection.length; index++) {
    reflectionPath.lineTo(tuning.reflection[index]!.x, tuning.reflection[index]!.y);
  }
  reflectionPath.close();
  canvas.drawPath(reflectionPath, reflectionPaint);

  fillVehicleRoundedRectSkia(canvas, tuning.lightBar, shared.carLightBar);
  fillVehicleRoundedRectSkia(canvas, tuning.lightEndLeft, shared.carLightEnd);
  fillVehicleRoundedRectSkia(canvas, tuning.lightEndRight, shared.carLightEnd);
  fillVehicleRoundedRectSkia(canvas, tuning.licensePlate, shared.cream);
}

function drawOutrunTrafficVehicleSkia(
  canvas: SkCanvas,
  config: import("../types/OutrunConfigSchema").OutrunConfig,
  centerX: number,
  baselineY: number,
  width: number,
  styleIndex: number
): void {
  if (!Skia) return;
  const style = resolveOutrunTrafficArtworkStyle(config, styleIndex, width);
  const bodyTop = -style.bodyHeight;
  const cabinBaseY = bodyTop;
  const cabinTopY = cabinBaseY - style.cabinHeight;

  canvas.save();
  canvas.translate(centerX, baselineY);
  const shadowPaint = Skia.Paint();
  shadowPaint.setColor(Skia.Color(style.shadowColor));
  shadowPaint.setAlphaf(style.shadowAlpha);
  shadowPaint.setStyle(Skia.PaintStyle.Fill);
  canvas.drawOval(Skia.XYWHRect(
    -style.shadowRadiusX, -style.shadowRadiusY,
    style.shadowRadiusX * 2, style.shadowRadiusY * 2
  ), shadowPaint);

  fillVehicleRoundedRectSkia(canvas, {
    x: -style.bodyWidth / 2, y: bodyTop, width: style.bodyWidth, height: style.bodyHeight,
    cornerRadius: style.bodyCornerRadius
  }, style.bodyColor);

  const baseHalf = style.cabinBaseWidth / 2;
  const roofHalf = style.cabinRoofWidth / 2;
  fillVehiclePolygonSkia(canvas, [
    { x: -baseHalf, y: cabinBaseY },
    { x: baseHalf, y: cabinBaseY },
    { x: roofHalf, y: cabinTopY },
    { x: -roofHalf, y: cabinTopY }
  ], style.cabinColor);

  const windowBaseHalf = baseHalf * 0.72;
  const windowRoofHalf = roofHalf * 0.72;
  fillVehiclePolygonSkia(canvas, [
    { x: -windowBaseHalf, y: cabinBaseY - style.cabinHeight * 0.08 },
    { x: windowBaseHalf, y: cabinBaseY - style.cabinHeight * 0.08 },
    { x: windowRoofHalf, y: cabinTopY + style.cabinHeight * 0.18 },
    { x: -windowRoofHalf, y: cabinTopY + style.cabinHeight * 0.18 }
  ], style.glassColor);

  fillVehicleRoundedRectSkia(canvas, {
    x: -style.lightBarWidth / 2,
    y: bodyTop + style.lightBarTopOffset,
    width: style.lightBarWidth,
    height: style.lightBarHeight,
    cornerRadius: style.lightBarHeight / 2
  }, style.lightBarColor);

  canvas.restore();
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

    // Flat headlight cones are night-only and sit beneath roadside sprites.
    const headlightBeams = computeOutrunHeadlightBeams(state, config, visualPalette);
    for (const beam of headlightBeams) {
      fillRoadsidePolygonSkia(canvas, beam.points, beam.color);
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
    iterateOutrunSprites(canvas, count, roadData, config, palette.lightsOn, (c, sp, sx, sy, _sw, _roadW, lightsOn, clipY, depth) => {
      drawRoadSpriteSkia(c, sp, sx, sy, _sw, clipY, visualPalette, depth, lightsOn);
    });
  }
};

export const drawSkiaOutrunCar: ShapeDrawer<SkCanvas, OutrunComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia || entity === undefined) return;
    const carCtx = resolveOutrunCarContext(world, entity);
    if (!carCtx) return;

    const { state, config, geom } = carCtx;
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

    const vehicleScale = computeOutrunPlayerArtworkScale(config);
    canvas.translate(baseX, baseY);
    canvas.rotate((tiltAngle * 180) / Math.PI, 0, 0);
    canvas.scale(carScale * vehicleScale, carScale * vehicleScale);
    drawOutrunPlayerVehicleSkia(canvas, config);
    canvas.restore();
  }
};

export const drawSkiaOutrunRacer: ShapeDrawer<SkCanvas, OutrunComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia || entity === undefined) return;
    const racerCtx = resolveOutrunRacerDrawContext(world, entity);
    if (!racerCtx) return;

    const { proj, vehicleStyleIndex } = racerCtx;
    const { sx, sy, lateral, carW, bestClip } = proj;
    if (sy >= bestClip || carW < 2) return;

    drawOutrunTrafficVehicleSkia(canvas, racerCtx.config, sx + lateral, sy, carW, vehicleStyleIndex);
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
