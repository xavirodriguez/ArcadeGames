import type { ShapeDrawer } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import type { OutrunComponentRegistry, RoadSegmentSprite } from "../types/OutrunTypes";
import type { OutrunVisualMod, OutrunBitmapSpriteSpec } from "../mods/types";
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
import {
  computeSpeedLines,
  computeOutrunPlayerArtworkScale,
  resolveOutrunBitmapSpriteBounds,
  resolvePineTierGeometry,
  resolveRockGeometry,
  resolvePalmFrondGeometry,
  resolveLighthouseGeometry,
  resolveCactusLineSegments,
  resolveDryShrubLineSegments,
  resolveWindTowerGeometry,
  resolveChevronGeometry
} from "./OutrunVisualHelpers";
import { computeOutrunRoadSpeedLineSegments, resolveOutrunRoadSegmentArtwork } from "./OutrunRoadArtwork";
import { fogIntensity, resolveRoadFogColor } from "./OutrunFog";
import { resolveOutrunRoadsideArtworkStyle } from "./OutrunRoadsideArtwork";
import { resolveOutrunPlayerPalette, resolveOutrunTrafficArtworkStyle, resolveOutrunTrafficVehicleGeometry } from "./OutrunVehicleArtwork";
import { computeOutrunHeadlightBeams } from "./OutrunLighting";
import { resolveOutrunHudLayout } from "./OutrunHudArtwork";
import { resolveOutrunSceneryLayout, type OutrunSceneryLayout, type MountainLayerLayout } from "./OutrunScenery";
import { colors } from "../../../theme/colors";
import { hexToRgba } from "../../shared/rendering/CosmicPalette";

type RoadsidePoint = { x: number; y: number };

function fillRoadsidePolygonSkia(
  canvas: SkCanvas,
  points: readonly RoadsidePoint[],
  color: string,
  alpha = 1
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
  paint.setAlphaf(alpha);
  paint.setStyle(Skia.PaintStyle.Fill);
  canvas.drawPath(path, paint);
}

function drawOutrunBitmapSpriteSkia(
  canvas: SkCanvas,
  spec: OutrunBitmapSpriteSpec,
  sx: number,
  sy: number,
  sw: number,
  clipY: number,
  world: import("@tiny-aster/core").World<OutrunComponentRegistry>
): boolean {
  if (!Skia) return false;
  const assetLoader = world.getResource<import("@tiny-aster/core").AssetLoader>("AssetLoader");
  if (!assetLoader) return false;

  const rawImg = assetLoader.get<unknown>(spec.assetKey);
  if (!rawImg) return false;

  const bounds = resolveOutrunBitmapSpriteBounds(spec, sx, sy, sw, clipY);
  if (!bounds) return false;

  const skImg = rawImg as import("@shopify/react-native-skia").SkImage;
  if (skImg) {
    const paint = Skia.Paint();
    const dest = Skia.XYWHRect(bounds.dx, bounds.dy, bounds.w, bounds.h);
    if (spec.srcRect) {
      const src = Skia.XYWHRect(spec.srcRect.x, spec.srcRect.y, spec.srcRect.w, spec.srcRect.h);
      canvas.drawImageRect(skImg, src, dest, paint);
    } else {
      canvas.drawImageRect(skImg, Skia.XYWHRect(0, 0, bounds.w, bounds.h), dest, paint);
    }
    return true;
  }
  return false;
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
  lightsOn: boolean,
  activeMod?: OutrunVisualMod,
  world?: import("@tiny-aster/core").World<OutrunComponentRegistry>
): void {
  if (!Skia || sy > clipY || sw < 2) return;

  if (activeMod?.drawRoadsideSprite) {
    const handled = activeMod.drawRoadsideSprite({
      backend: "skia",
      ctx: canvas,
      sprite: sp,
      sx,
      sy,
      sw,
      clipY,
      visualPalette,
      depth,
      lightsOn,
      world
    });
    if (handled) return;
  }

  if (activeMod?.spriteCatalog?.[sp.kind] && world) {
    const spec = activeMod.spriteCatalog[sp.kind]!;
    const drawn = drawOutrunBitmapSpriteSkia(canvas, spec, sx, sy, sw, clipY, world);
    if (drawn) return;
  }

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
    fillRoadsidePolygonSkia(canvas, resolveChevronGeometry(sx, sy, size), colors.amber);
  } else {
    const style = resolveOutrunRoadsideArtworkStyle(sp, visualPalette, depth, sw, lightsOn, activeMod);
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
        const tiers = resolvePineTierGeometry(sx, sy, h);
        for (const tier of tiers) {
          fillRoadsidePolygonSkia(canvas, tier.lightPolygon, style.foliageLightColor);
          fillRoadsidePolygonSkia(canvas, tier.darkPolygon, style.foliageColor);
        }
        const trunkPaint = Skia.Paint();
        trunkPaint.setColor(Skia.Color(style.trunkColor));
        trunkPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawRect(Skia.XYWHRect(sx - trunkW * 0.4, sy - trunkH, trunkW * 0.8, trunkH), trunkPaint);
        break;
      }
      case "rock": {
        const rock = resolveRockGeometry(sx, sy, style.width, h);
        fillRoadsidePolygonSkia(canvas, rock.basePolygon, style.rockBaseColor);
        fillRoadsidePolygonSkia(canvas, rock.shadePolygon, style.rockShadeColor);
        break;
      }
      case "palm": {
        const palm = resolvePalmFrondGeometry(sx, sy, h);
        const trunkPath = Skia.Path.Make();
        trunkPath.moveTo(sx, sy);
        trunkPath.quadTo(palm.trunkCtrlX, palm.trunkCtrlY, palm.crownTopX, palm.crownTopY);
        const trunkPaint = Skia.Paint();
        trunkPaint.setColor(Skia.Color(style.trunkColor));
        trunkPaint.setStyle(Skia.PaintStyle.Stroke);
        trunkPaint.setStrokeWidth(Math.max(1, h * 0.055));
        trunkPaint.setStrokeCap(Skia.StrokeCap.Round);
        canvas.drawPath(trunkPath, trunkPaint);
        for (const frond of palm.fronds) {
          fillRoadsidePolygonSkia(
            canvas,
            frond.polygon,
            frond.isLight ? style.foliageLightColor : style.foliageColor
          );
        }
        break;
      }
      case "lighthouse": {
        const w = style.width;
        const lighthouse = resolveLighthouseGeometry(sx, sy, w, h);
        fillRoadsidePolygonSkia(canvas, lighthouse.towerPolygon, style.creamColor);
        for (const band of lighthouse.bands) {
          fillRoadsidePolygonSkia(canvas, band, style.darkAccentColor);
        }
        const capPaint = Skia.Paint();
        capPaint.setColor(Skia.Color(style.darkAccentColor));
        capPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawRect(Skia.XYWHRect(sx - w * 0.25, lighthouse.topY - h * 0.06, w * 0.5, h * 0.07), capPaint);
        const lightPaint = Skia.Paint();
        lightPaint.setColor(Skia.Color(style.lightColor));
        lightPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawRect(Skia.XYWHRect(sx - w * 0.13, lighthouse.topY - h * 0.18, w * 0.26, h * 0.12), lightPaint);
        break;
      }
      case "cactus": {
        const cactus = resolveCactusLineSegments(sx, sy, h);
        const cactusPath = Skia.Path.Make();
        for (const seg of cactus.trunkSegments) {
          cactusPath.moveTo(seg.x1, seg.y1);
          cactusPath.lineTo(seg.x2, seg.y2);
        }
        const cactusPaint = Skia.Paint();
        cactusPaint.setColor(Skia.Color(style.foliageColor));
        cactusPaint.setStyle(Skia.PaintStyle.Stroke);
        cactusPaint.setStrokeWidth(Math.max(1, h * 0.14));
        cactusPaint.setStrokeCap(Skia.StrokeCap.Round);
        canvas.drawPath(cactusPath, cactusPaint);
        const stripePath = Skia.Path.Make();
        stripePath.moveTo(cactus.stripeSegment.x1, cactus.stripeSegment.y1);
        stripePath.lineTo(cactus.stripeSegment.x2, cactus.stripeSegment.y2);
        const stripePaint = Skia.Paint();
        stripePaint.setColor(Skia.Color(style.foliageLightColor));
        stripePaint.setStyle(Skia.PaintStyle.Stroke);
        stripePaint.setStrokeWidth(Math.max(1, h * 0.045));
        stripePaint.setStrokeCap(Skia.StrokeCap.Round);
        canvas.drawPath(stripePath, stripePaint);
        break;
      }
      case "dry_shrub": {
        const shrub = resolveDryShrubLineSegments(sx, sy, h);
        const shrubPath = Skia.Path.Make();
        for (const branch of shrub.mainBranches) {
          shrubPath.moveTo(branch[0]!.x, branch[0]!.y);
          for (let b = 1; b < branch.length; b++) {
            shrubPath.lineTo(branch[b]!.x, branch[b]!.y);
          }
        }
        const shrubPaint = Skia.Paint();
        shrubPaint.setColor(Skia.Color(style.foliageColor));
        shrubPaint.setStyle(Skia.PaintStyle.Stroke);
        shrubPaint.setStrokeWidth(Math.max(1, h * 0.1));
        shrubPaint.setStrokeCap(Skia.StrokeCap.Round);
        canvas.drawPath(shrubPath, shrubPaint);
        const highlightPath = Skia.Path.Make();
        for (const branch of shrub.highlightBranches) {
          highlightPath.moveTo(branch[0]!.x, branch[0]!.y);
          for (let b = 1; b < branch.length; b++) {
            highlightPath.lineTo(branch[b]!.x, branch[b]!.y);
          }
        }
        const highlightPaint = Skia.Paint();
        highlightPaint.setColor(Skia.Color(style.foliageLightColor));
        highlightPaint.setStyle(Skia.PaintStyle.Stroke);
        highlightPaint.setStrokeWidth(Math.max(1, h * 0.055));
        highlightPaint.setStrokeCap(Skia.StrokeCap.Round);
        canvas.drawPath(highlightPath, highlightPaint);
        break;
      }
      case "wind_tower": {
        const tower = resolveWindTowerGeometry(sx, sy, h);
        const towerPath = Skia.Path.Make();
        for (const line of tower.towerLines) {
          towerPath.moveTo(line[0]!.x, line[0]!.y);
          for (let l = 1; l < line.length; l++) {
            towerPath.lineTo(line[l]!.x, line[l]!.y);
          }
        }
        const towerPaint = Skia.Paint();
        towerPaint.setColor(Skia.Color(style.rockShadeColor));
        towerPaint.setStyle(Skia.PaintStyle.Stroke);
        towerPaint.setStrokeWidth(Math.max(1, h * 0.045));
        canvas.drawPath(towerPath, towerPaint);
        const rotorPaint = Skia.Paint();
        rotorPaint.setColor(Skia.Color(style.creamColor));
        rotorPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawCircle(sx, tower.rotorY, tower.hubRadius, rotorPaint);
        const bladesPath = Skia.Path.Make();
        for (const angle of tower.bladeAngles) {
          bladesPath.moveTo(sx, tower.rotorY);
          bladesPath.lineTo(sx + Math.cos(angle) * tower.bladeRadius, tower.rotorY + Math.sin(angle) * tower.bladeRadius);
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
  styleIndex: number,
  activeMod?: OutrunVisualMod,
  world?: import("@tiny-aster/core").World<OutrunComponentRegistry>
): void {
  if (!Skia) return;

  if (activeMod?.drawTrafficVehicle) {
    const handled = activeMod.drawTrafficVehicle({
      backend: "skia",
      ctx: canvas,
      config,
      centerX,
      baselineY,
      width,
      styleIndex,
      world
    });
    if (handled) return;
  }

  const style = resolveOutrunTrafficArtworkStyle(config, styleIndex, width, activeMod);
  const geometry = resolveOutrunTrafficVehicleGeometry(style);
  canvas.save();
  canvas.translate(centerX, baselineY);
  const paint = Skia.Paint();
  paint.setStyle(Skia.PaintStyle.Fill);

  for (const command of geometry) {
    paint.setColor(Skia.Color(command.color));
    paint.setAlphaf(command.alpha ?? 1);

    switch (command.kind) {
      case "rect":
        canvas.drawRect(Skia.XYWHRect(command.x, command.y, command.width, command.height), paint);
        break;
      case "ellipse":
        canvas.drawOval(Skia.XYWHRect(
          command.centerX - command.radiusX,
          command.centerY - command.radiusY,
          command.radiusX * 2,
          command.radiusY * 2
        ), paint);
        break;
      case "polygon": {
        if (command.points.length < 3) break;
        const path = Skia.Path.Make();
        path.moveTo(command.points[0]!.x, command.points[0]!.y);
        for (let index = 1; index < command.points.length; index++) {
          const point = command.points[index]!;
          path.lineTo(point.x, point.y);
        }
        path.close();
        canvas.drawPath(path, paint);
        break;
      }
    }
  }

  canvas.restore();
}

export const drawSkiaOutrunRoad: ShapeDrawer<SkCanvas, OutrunComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const roadCtx = resolveOutrunRoadContext(world);
    if (!roadCtx) return;

    const { state, roadData, config, screenW, screenH, palette, visualPalette } = roadCtx;
    const activeMod = world.getResource<OutrunVisualMod>("VisualMod");
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

      // Coast water pass.
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

      // Pianos pass.
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

      // Road surface pass.
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

      // Lane dashes pass.
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

    // Keep the same horizon-to-camera fog curve and palette as the Canvas backend.
    const fogShader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, horizonY),
      Skia.Point(0, screenH),
      [
        Skia.Color(resolveRoadFogColor(visualPalette, fogIntensity(1))),
        Skia.Color(resolveRoadFogColor(visualPalette, fogIntensity(0)))
      ],
      [0, 1],
      Skia.TileMode.Clamp
    );
    const fogPaint = Skia.Paint();
    fogPaint.setShader(fogShader);
    fogPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(0, horizonY, screenW, screenH - horizonY), fogPaint);

    // Flat headlight cones.
    const headlightBeams = computeOutrunHeadlightBeams(state, config, visualPalette);
    for (const beam of headlightBeams) {
      fillRoadsidePolygonSkia(canvas, beam.points, beam.color, beam.alpha);
    }

    // Short radial streaks.
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
      drawRoadSpriteSkia(c, sp, sx, sy, _sw, clipY, visualPalette, depth, lightsOn, activeMod, world);
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

    const { proj, vehicleStyleIndex, config } = racerCtx;
    const { sx, sy, lateral, carW, bestClip } = proj;
    if (sy >= bestClip || carW < 2) return;

    const activeMod = world.getResource<OutrunVisualMod>("VisualMod");
    drawOutrunTrafficVehicleSkia(canvas, config, sx + lateral, sy, carW, vehicleStyleIndex, activeMod, world);
  }
};

function drawOutrunSkiaHudText(
  canvas: SkCanvas,
  text: string,
  x: number,
  baselineY: number,
  fontSize: number,
  color: string,
  align: "left" | "right" | "center" = "left"
): void {
  if (!Skia) return;
  const font = Skia.Font ? Skia.Font(null, fontSize) : null;
  if (!font) return;
  const textWidth = font.measureText ? font.measureText(text).width : text.length * fontSize * 0.56;
  const drawX = align === "right" ? x - textWidth : align === "center" ? x - textWidth / 2 : x;
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setStyle(Skia.PaintStyle.Fill);
  canvas.drawText(text, drawX, baselineY, paint, font);
}

function drawOutrunSkiaHudPill(
  canvas: SkCanvas,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
  alpha: number
): void {
  if (!Skia) return;
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(alpha);
  paint.setStyle(Skia.PaintStyle.Fill);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, width, height), radius, radius), paint);
}

export const drawSkiaOutrunHud = {
  draw(canvas: SkCanvas, world: import("@tiny-aster/core").World<OutrunComponentRegistry>): void {
    if (!Skia) return;
    const hudCtx = resolveOutrunHudContext(world);
    if (!hudCtx) return;

    const {
      state, config, speedKmh, timeStr, phase, progressFraction,
      resultTitle, resultDetail, visualPalette
    } = hudCtx;
    const layout = resolveOutrunHudLayout({ config, progressFraction, speedKmh, timeStr, visualPalette });
    const shared = visualPalette.shared;
    canvas.save();

    // Top information blocks.
    drawOutrunSkiaHudText(canvas, "Tiempo", layout.time.x, layout.time.labelY,
      layout.time.labelFont, shared.hudMutedText);
    drawOutrunSkiaHudText(canvas, layout.time.value, layout.time.x, layout.time.valueY,
      layout.time.valueFont, shared.cream);
    drawOutrunSkiaHudText(canvas, layout.stage.label, layout.stage.x, layout.stage.labelY,
      layout.stage.labelFont, shared.hudMutedText, "right");
    drawOutrunSkiaHudText(canvas, layout.stage.hour, layout.stage.x, layout.stage.hourY,
      layout.stage.hourFont, shared.cream, "right");

    // Progress rail, upcoming stage marker and player marker.
    const progress = layout.progress;
    const trackPaint = Skia.Paint();
    trackPaint.setColor(Skia.Color(shared.cream));
    trackPaint.setAlphaf(progress.trackAlpha);
    trackPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(progress.x, progress.y, progress.width, progress.height), trackPaint);
    const progressPaint = Skia.Paint();
    progressPaint.setColor(Skia.Color(shared.cream));
    progressPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(progress.x, progress.y, progress.filledWidth, progress.height), progressPaint);

    const markerY = progress.y + progress.height / 2;
    const branchPaint = Skia.Paint();
    branchPaint.setColor(Skia.Color(visualPalette.tokens.kerbB));
    branchPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(progress.branchMarkerX, markerY, progress.branchMarkerRadius, branchPaint);
    const playerMarkerPaint = Skia.Paint();
    playerMarkerPaint.setColor(Skia.Color(shared.car));
    playerMarkerPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(progress.carMarkerX, markerY, progress.carMarkerRadius, playerMarkerPaint);

    // Speed pill.
    const speed = layout.speedPill;
    drawOutrunSkiaHudPill(canvas, speed.x, speed.y, speed.width, speed.height,
      speed.radius, shared.shadow, speed.shadowAlpha);
    drawOutrunSkiaHudText(canvas, speed.value, speed.digitsX, speed.digitsY,
      speed.digitsFont, shared.cream);
    drawOutrunSkiaHudText(canvas, "km/h", speed.unitX, speed.unitY,
      speed.unitFont, shared.hudMutedText, "right");

    // Decorative radio dial.
    const radio = layout.radioPill;
    drawOutrunSkiaHudPill(canvas, radio.x, radio.y, radio.width, radio.height,
      radio.radius, shared.shadow, radio.shadowAlpha);
    drawOutrunSkiaHudText(canvas, radio.label, radio.labelX, radio.labelY,
      radio.labelFont, shared.hudMutedText);
    for (const bar of radio.bars) {
      fillVehicleRoundedRectSkia(canvas, {
        x: bar.x, y: bar.y, width: bar.width, height: bar.height,
        cornerRadius: Math.min(bar.width, bar.height) / 2
      }, bar.active ? shared.car : shared.hudMutedText);
    }

    // Countdown and end-of-run overlays.
    if (phase === "countdown") {
      const countdown = Math.ceil(state.countdownTime ?? 3);
      const overPaint = Skia.Paint();
      overPaint.setColor(Skia.Color(shared.shadow));
      overPaint.setAlphaf(0.64);
      overPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(0, 0, config.WIDTH, config.HEIGHT), overPaint);
      drawOutrunSkiaHudText(canvas, countdown > 0 ? `${countdown}` : "GO!",
        layout.centerX, layout.centerY, layout.countdownFont, shared.cream, "center");
    }
    if (state.isGameOver) {
      const overPaint = Skia.Paint();
      overPaint.setColor(Skia.Color(shared.shadow));
      overPaint.setAlphaf(0.72);
      overPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(0, 0, config.WIDTH, config.HEIGHT), overPaint);
      drawOutrunSkiaHudText(canvas, resultTitle, layout.centerX,
        layout.centerY - layout.resultsFont * 0.18, layout.resultsFont, shared.cream, "center");
      drawOutrunSkiaHudText(canvas, resultDetail, layout.centerX,
        layout.centerY + layout.resultsFont * 0.9,
        Math.max(12, layout.resultsFont * 0.48), shared.cream, "center");
    }

    canvas.restore();
  }
};
