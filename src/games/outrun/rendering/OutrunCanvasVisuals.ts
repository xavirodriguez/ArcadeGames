import type { ShapeDrawer } from "@tiny-aster/core";
import type { OutrunComponentRegistry, RoadSegmentSprite } from "../types/OutrunTypes";
import type { OutrunVisualMod, OutrunBitmapSpriteSpec } from "../mods/types";
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

function fillRoadsidePolygonCanvas(
  ctx: CanvasRenderingContext2D,
  points: readonly RoadsidePoint[],
  color: string
): void {
  if (points.length < 3) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let index = 1; index < points.length; index++) {
    const point = points[index]!;
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawOutrunBitmapSpriteCanvas(
  ctx: CanvasRenderingContext2D,
  spec: OutrunBitmapSpriteSpec,
  sx: number,
  sy: number,
  sw: number,
  clipY: number,
  world: import("@tiny-aster/core").World<OutrunComponentRegistry>
): boolean {
  const assetLoader = world.getResource<import("@tiny-aster/core").AssetLoader>("AssetLoader");
  if (!assetLoader) return false;

  const rawImg = assetLoader.get<unknown>(spec.assetKey);
  if (!rawImg) return false;

  const bounds = resolveOutrunBitmapSpriteBounds(spec, sx, sy, sw, clipY);
  if (!bounds) return false;

  ctx.save();
  if (typeof HTMLImageElement !== "undefined" && rawImg instanceof HTMLImageElement) {
    if (spec.srcRect) {
      ctx.drawImage(rawImg, spec.srcRect.x, spec.srcRect.y, spec.srcRect.w, spec.srcRect.h, bounds.dx, bounds.dy, bounds.w, bounds.h);
    } else {
      ctx.drawImage(rawImg, bounds.dx, bounds.dy, bounds.w, bounds.h);
    }
    ctx.restore();
    return true;
  }
  ctx.restore();
  return false;
}

function drawRoadSpriteCanvas(
  ctx: CanvasRenderingContext2D,
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
  if (sy > clipY || sw < 2) return;

  if (activeMod?.drawRoadsideSprite) {
    const handled = activeMod.drawRoadsideSprite({
      backend: "canvas",
      ctx,
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
    const drawn = drawOutrunBitmapSpriteCanvas(ctx, spec, sx, sy, sw, clipY, world);
    if (drawn) return;
  }

  ctx.save();
  ctx.lineJoin = "round";

  const size = sw * 0.8;

  if (sp.kind === "arch" || sp.kind === "banner") {
    const archW = sw * 2.2;
    const archH = sw * 1.2;
    ctx.fillStyle = colors.slate;
    ctx.fillRect(sx - archW / 2, sy - archH, archW * 0.1, archH);
    ctx.fillRect(sx + archW / 2 - archW * 0.1, sy - archH, archW * 0.1, archH);
    ctx.fillStyle = sp.kind === "arch" ? colors.pink : colors.blue;
    ctx.fillRect(sx - archW / 2, sy - archH, archW, archH * 0.35);
    if (sp.text) {
      ctx.fillStyle = colors.white;
      ctx.font = `bold ${Math.max(10, Math.floor(archH * 0.25))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(sp.text, sx, sy - archH * 0.75);
    }
  } else if (sp.kind === "billboard") {
    const bw = size * 1.8;
    const bh = size;
    ctx.fillStyle = colors.borderDark;
    ctx.fillRect(sx - 4, sy - bh, 8, bh);
    ctx.fillStyle = colors.blueLight;
    ctx.fillRect(sx - bw / 2, sy - bh - bh * 0.8, bw, bh);
    if (sp.text) {
      ctx.fillStyle = colors.white;
      ctx.font = `bold ${Math.max(8, Math.floor(bh * 0.4))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(sp.text, sx, sy - bh - bh * 0.3);
    }
  } else if (sp.kind === "chevron") {
    fillRoadsidePolygonCanvas(ctx, resolveChevronGeometry(sx, sy, size), colors.amber);
  } else {
    const style = resolveOutrunRoadsideArtworkStyle(sp, visualPalette, depth, sw, lightsOn, activeMod);
    const h = style.height;
    const trunkH = h * visualPalette.tuning.tree.trunkHeightToHeight;
    const trunkW = h * visualPalette.tuning.tree.trunkWidthToHeight;
    const crownX = sx;
    const crownY = sy - h * 0.645;

    switch (style.kind) {
      case "tree": {
        ctx.fillStyle = style.trunkColor;
        ctx.fillRect(sx - trunkW / 2, sy - trunkH, trunkW, trunkH);
        const radiusX = h * visualPalette.tuning.tree.canopyRadiusXToHeight;
        const radiusY = h * visualPalette.tuning.tree.canopyRadiusYToHeight;
        ctx.fillStyle = style.foliageColor;
        ctx.beginPath();
        ctx.ellipse(crownX, crownY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.globalAlpha = style.highlightAlpha;
        ctx.fillStyle = style.foliageLightColor;
        ctx.beginPath();
        ctx.ellipse(
          crownX - radiusX * visualPalette.tuning.tree.highlightOffsetX,
          crownY - radiusY * visualPalette.tuning.tree.highlightOffsetY,
          radiusX * visualPalette.tuning.tree.highlightScale,
          radiusY * visualPalette.tuning.tree.highlightScale,
          0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
        break;
      }
      case "pine": {
        const tiers = resolvePineTierGeometry(sx, sy, h);
        for (const tier of tiers) {
          fillRoadsidePolygonCanvas(ctx, tier.lightPolygon, style.foliageLightColor);
          fillRoadsidePolygonCanvas(ctx, tier.darkPolygon, style.foliageColor);
        }
        ctx.fillStyle = style.trunkColor;
        ctx.fillRect(sx - trunkW * 0.4, sy - trunkH, trunkW * 0.8, trunkH);
        break;
      }
      case "rock": {
        const rock = resolveRockGeometry(sx, sy, style.width, h);
        fillRoadsidePolygonCanvas(ctx, rock.basePolygon, style.rockBaseColor);
        fillRoadsidePolygonCanvas(ctx, rock.shadePolygon, style.rockShadeColor);
        break;
      }
      case "palm": {
        const palm = resolvePalmFrondGeometry(sx, sy, h);
        ctx.strokeStyle = style.trunkColor;
        ctx.lineWidth = Math.max(1, h * 0.055);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(palm.trunkCtrlX, palm.trunkCtrlY, palm.crownTopX, palm.crownTopY);
        ctx.stroke();
        for (const frond of palm.fronds) {
          fillRoadsidePolygonCanvas(
            ctx,
            frond.polygon,
            frond.isLight ? style.foliageLightColor : style.foliageColor
          );
        }
        break;
      }
      case "lighthouse": {
        const w = style.width;
        const lighthouse = resolveLighthouseGeometry(sx, sy, w, h);
        fillRoadsidePolygonCanvas(ctx, lighthouse.towerPolygon, style.creamColor);
        for (const band of lighthouse.bands) {
          fillRoadsidePolygonCanvas(ctx, band, style.darkAccentColor);
        }
        ctx.fillStyle = style.darkAccentColor;
        ctx.fillRect(sx - w * 0.25, lighthouse.topY - h * 0.06, w * 0.5, h * 0.07);
        ctx.fillStyle = style.lightColor;
        ctx.fillRect(sx - w * 0.13, lighthouse.topY - h * 0.18, w * 0.26, h * 0.12);
        break;
      }
      case "cactus": {
        const cactus = resolveCactusLineSegments(sx, sy, h);
        ctx.strokeStyle = style.foliageColor;
        ctx.lineWidth = Math.max(1, h * 0.14);
        ctx.lineCap = "round";
        ctx.beginPath();
        for (const seg of cactus.trunkSegments) {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();
        ctx.strokeStyle = style.foliageLightColor;
        ctx.lineWidth = Math.max(1, h * 0.045);
        ctx.beginPath();
        ctx.moveTo(cactus.stripeSegment.x1, cactus.stripeSegment.y1);
        ctx.lineTo(cactus.stripeSegment.x2, cactus.stripeSegment.y2);
        ctx.stroke();
        break;
      }
      case "dry_shrub": {
        const shrub = resolveDryShrubLineSegments(sx, sy, h);
        ctx.strokeStyle = style.foliageColor;
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(1, h * 0.1);
        ctx.beginPath();
        for (const branch of shrub.mainBranches) {
          ctx.moveTo(branch[0]!.x, branch[0]!.y);
          for (let b = 1; b < branch.length; b++) {
            ctx.lineTo(branch[b]!.x, branch[b]!.y);
          }
        }
        ctx.stroke();
        ctx.strokeStyle = style.foliageLightColor;
        ctx.lineWidth = Math.max(1, h * 0.055);
        ctx.beginPath();
        for (const branch of shrub.highlightBranches) {
          ctx.moveTo(branch[0]!.x, branch[0]!.y);
          for (let b = 1; b < branch.length; b++) {
            ctx.lineTo(branch[b]!.x, branch[b]!.y);
          }
        }
        ctx.stroke();
        break;
      }
      case "wind_tower": {
        const tower = resolveWindTowerGeometry(sx, sy, h);
        ctx.strokeStyle = style.rockShadeColor;
        ctx.lineWidth = Math.max(1, h * 0.045);
        ctx.beginPath();
        for (const line of tower.towerLines) {
          ctx.moveTo(line[0]!.x, line[0]!.y);
          for (let l = 1; l < line.length; l++) {
            ctx.lineTo(line[l]!.x, line[l]!.y);
          }
        }
        ctx.stroke();
        ctx.fillStyle = style.creamColor;
        ctx.beginPath();
        ctx.arc(sx, tower.rotorY, tower.hubRadius, 0, Math.PI * 2);
        ctx.fill();
        for (const angle of tower.bladeAngles) {
          ctx.beginPath();
          ctx.moveTo(sx, tower.rotorY);
          ctx.lineTo(sx + Math.cos(angle) * tower.bladeRadius, tower.rotorY + Math.sin(angle) * tower.bladeRadius);
          ctx.stroke();
        }
        break;
      }
    }
  }

  ctx.restore();
}

function drawSkyBandsCanvas(ctx: CanvasRenderingContext2D, layout: OutrunSceneryLayout, screenW: number): void {
  for (const band of layout.skyBands) {
    ctx.fillStyle = band.color;
    ctx.fillRect(0, band.y, screenW, band.height + 0.5);
  }
}
function drawStarsCanvas(ctx: CanvasRenderingContext2D, layout: OutrunSceneryLayout): void {
  ctx.save();
  for (const star of layout.stars) {
    ctx.globalAlpha = star.alpha; ctx.fillStyle = layout.creamColor;
    ctx.fillRect(star.x, star.y, star.diameter, star.diameter);
  }
  ctx.restore();
}
function drawCloudsCanvas(ctx: CanvasRenderingContext2D, layout: OutrunSceneryLayout): void {
  ctx.save(); ctx.globalAlpha = layout.cloudAlpha; ctx.fillStyle = layout.creamColor;
  for (const cloud of layout.clouds) {
    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawAstroCanvas(ctx: CanvasRenderingContext2D, layout: OutrunSceneryLayout): void {
  const astro = layout.astro;
  ctx.save(); ctx.globalAlpha = astro.haloAlpha; ctx.fillStyle = astro.color;
  ctx.beginPath(); ctx.arc(astro.x, astro.y, astro.haloRadius, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(astro.x, astro.y, astro.radius, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
const canvasMountainPathCache = new Map<string, Path2D>();
const canvasSnowPathCache = new Map<string, Path2D>();
function buildCanvasMountainPath(layer: MountainLayerLayout, screenW: number, horizonY: number): Path2D {
  const path = new Path2D();
  path.moveTo(0, horizonY);
  for (const point of layer.profile) path.lineTo(point.x, horizonY - point.height);
  path.lineTo(screenW, horizonY); path.closePath();
  return path;
}
function buildCanvasSnowPath(layer: MountainLayerLayout, horizonY: number): Path2D {
  const path = new Path2D();
  for (const cap of layer.snowCaps) {
    path.moveTo(cap.x - cap.halfWidth, horizonY - cap.peakHeight + cap.halfWidth * 0.95);
    path.lineTo(cap.x, horizonY - cap.peakHeight);
    path.lineTo(cap.x + cap.halfWidth, horizonY - cap.peakHeight + cap.halfWidth * 0.95);
    path.closePath();
  }
  return path;
}
function drawMountainFallbackCanvas(
  ctx: CanvasRenderingContext2D, layer: MountainLayerLayout,
  layout: OutrunSceneryLayout, screenW: number, color: string
): void {
  for (const tileX of [0, screenW, screenW * 2]) {
    ctx.beginPath(); ctx.moveTo(tileX - layer.offsetX, layout.horizonY);
    for (const point of layer.profile) ctx.lineTo(tileX - layer.offsetX + point.x, layout.horizonY - point.height);
    ctx.lineTo(tileX - layer.offsetX + screenW, layout.horizonY); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
  }
}
function drawMountainLayersCanvas(
  ctx: CanvasRenderingContext2D, layout: OutrunSceneryLayout, screenW: number
): void {
  for (const layer of layout.mountainLayers) {
    if (typeof Path2D === "undefined" || typeof ctx.translate !== "function") {
      drawMountainFallbackCanvas(ctx, layer, layout, screenW, layer.color);
    } else {
      let path = canvasMountainPathCache.get(layer.cacheKey);
      if (!path) { path = buildCanvasMountainPath(layer, screenW, layout.horizonY); canvasMountainPathCache.set(layer.cacheKey, path); }
      for (const tileX of [0, screenW, screenW * 2]) {
        ctx.save(); ctx.translate(tileX - layer.offsetX, 0);
        ctx.fillStyle = layer.color; ctx.fill(path); ctx.restore();
      }
    }
    if (layer.snowCaps.length > 0 && typeof Path2D !== "undefined" && typeof ctx.translate === "function") {
      let path = canvasSnowPathCache.get(layer.cacheKey);
      if (!path) { path = buildCanvasSnowPath(layer, layout.horizonY); canvasSnowPathCache.set(layer.cacheKey, path); }
      for (const tileX of [0, screenW, screenW * 2]) {
        ctx.save(); ctx.translate(tileX - layer.offsetX, 0);
        ctx.globalAlpha = layout.snowPeakAlpha; ctx.fillStyle = layout.creamColor; ctx.fill(path); ctx.restore();
      }
    }
  }
}
function drawOutrunSceneryCanvas(
  ctx: CanvasRenderingContext2D, layout: OutrunSceneryLayout, screenW: number, screenH: number
): void {
  drawSkyBandsCanvas(ctx, layout, screenW);
  drawStarsCanvas(ctx, layout);
  drawCloudsCanvas(ctx, layout);
  drawAstroCanvas(ctx, layout);
  drawMountainLayersCanvas(ctx, layout, screenW);
  ctx.fillStyle = layout.groundColor;
  ctx.fillRect(0, layout.horizonY, screenW, screenH - layout.horizonY);
}

function fillVehicleRoundedRectCanvas(
  ctx: CanvasRenderingContext2D,
  rect: import("../types/OutrunVisualTypes").OutrunVisualRect,
  color: string
): void {
  const radius = Math.min(rect.cornerRadius, rect.width / 2, rect.height / 2);
  const left = rect.x;
  const top = rect.y;
  const right = left + rect.width;
  const bottom = top + rect.height;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(left + radius, top);
  ctx.lineTo(right - radius, top);
  ctx.quadraticCurveTo(right, top, right, top + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(left + radius, bottom);
  ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
  ctx.lineTo(left, top + radius);
  ctx.quadraticCurveTo(left, top, left + radius, top);
  ctx.closePath();
  ctx.fill();
}

function fillVehiclePolygonCanvas(
  ctx: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
  color: string
): void {
  fillRoadsidePolygonCanvas(ctx, points, color);
}

function drawOutrunPlayerVehicleCanvas(
  ctx: CanvasRenderingContext2D,
  config: import("../types/OutrunConfigSchema").OutrunConfig
): void {
  const tuning = config.visual.tuning.playerCar;
  const shared = resolveOutrunPlayerPalette(config);

  ctx.save();
  ctx.globalAlpha = tuning.shadow.alpha;
  ctx.fillStyle = shared.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 0, tuning.shadow.rx, tuning.shadow.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  fillVehicleRoundedRectCanvas(ctx, tuning.wheelLeft, shared.shadow);
  fillVehicleRoundedRectCanvas(ctx, tuning.wheelRight, shared.shadow);
  fillVehicleRoundedRectCanvas(ctx, tuning.body, shared.car);
  fillVehicleRoundedRectCanvas(ctx, tuning.lowerShade, shared.carShade);
  fillVehiclePolygonCanvas(ctx, tuning.cabin, shared.car);
  fillVehiclePolygonCanvas(ctx, tuning.roof, shared.carRoof);
  fillVehiclePolygonCanvas(ctx, tuning.rearWindow, shared.carGlass);

  ctx.save();
  ctx.globalAlpha = 0.18;
  fillVehiclePolygonCanvas(ctx, tuning.reflection, shared.cream);
  ctx.restore();

  fillVehicleRoundedRectCanvas(ctx, tuning.lightBar, shared.carLightBar);
  fillVehicleRoundedRectCanvas(ctx, tuning.lightEndLeft, shared.carLightEnd);
  fillVehicleRoundedRectCanvas(ctx, tuning.lightEndRight, shared.carLightEnd);
  fillVehicleRoundedRectCanvas(ctx, tuning.licensePlate, shared.cream);
}

function drawOutrunTrafficVehicleCanvas(
  ctx: CanvasRenderingContext2D,
  config: import("../types/OutrunConfigSchema").OutrunConfig,
  centerX: number,
  baselineY: number,
  width: number,
  styleIndex: number,
  activeMod?: OutrunVisualMod,
  world?: import("@tiny-aster/core").World<OutrunComponentRegistry>
): void {
  if (activeMod?.drawTrafficVehicle) {
    const handled = activeMod.drawTrafficVehicle({
      backend: "canvas",
      ctx,
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
  ctx.save();
  ctx.translate(centerX, baselineY);

  for (const command of geometry) {
    const previousAlpha = ctx.globalAlpha;
    if (command.alpha !== undefined) ctx.globalAlpha = previousAlpha * command.alpha;
    ctx.fillStyle = command.color;

    switch (command.kind) {
      case "rect":
        ctx.fillRect(command.x, command.y, command.width, command.height);
        break;
      case "ellipse":
        ctx.beginPath();
        ctx.ellipse(command.centerX, command.centerY, command.radiusX, command.radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "polygon":
        if (command.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(command.points[0]!.x, command.points[0]!.y);
          for (let index = 1; index < command.points.length; index++) {
            const point = command.points[index]!;
            ctx.lineTo(point.x, point.y);
          }
          ctx.closePath();
          ctx.fill();
        }
        break;
    }

    ctx.globalAlpha = previousAlpha;
  }

  ctx.restore();
}

export const drawOutrunRoad: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world) {
    const roadCtx = resolveOutrunRoadContext(world);
    if (!roadCtx) return;

    const { state, roadData, config, screenW, screenH, palette, visualPalette } = roadCtx;
    const activeMod = world.getResource<OutrunVisualMod>("VisualMod");
    ctx.save();

    const sceneryLayout = resolveOutrunSceneryLayout(world, state, roadData, config);
    const horizonY = sceneryLayout.horizonY;
    drawOutrunSceneryCanvas(ctx, sceneryLayout, screenW, screenH);

    // 2. Road Segments Pass
    const count = projectOutrunRoad(roadData.segments, state.playerZ, state.playerX, config, screenW, screenH);
    if (count === 0) {
      console.warn("[drawOutrunRoad] projectOutrunRoad returned 0 projected segments.");
    }

    let renderedCount = 0;
    for (let i = count - 1; i >= 0; i--) {
      const p = projectionBuffer[i]!;
      if (p.y1 <= p.y2 || p.y2 >= p.clip) continue;
      renderedCount++;

      const artwork = resolveOutrunRoadSegmentArtwork(p.index, p.fog, visualPalette);

      // Depth haze and alternating ground stripe.
      ctx.fillStyle = artwork.groundColor;
      ctx.fillRect(0, p.y2, screenW, p.y1 - p.y2);

      // Coast water pass.
      if (artwork.waterColor !== null) {
        const outerW2 = p.w2 * (1 + artwork.kerbWidthRatio);
        const outerW1 = p.w1 * (1 + artwork.kerbWidthRatio);
        ctx.fillStyle = artwork.waterColor;
        ctx.beginPath();
        ctx.moveTo(0, p.y2);
        ctx.lineTo(p.x2 - outerW2, p.y2);
        ctx.lineTo(p.x1 - outerW1, p.y1);
        ctx.lineTo(0, p.y1);
        ctx.closePath();
        ctx.fill();
      }

      // Pianos pass.
      const outerW2 = p.w2 * (1 + artwork.kerbWidthRatio);
      const outerW1 = p.w1 * (1 + artwork.kerbWidthRatio);
      ctx.fillStyle = artwork.kerbColor;
      ctx.beginPath();
      ctx.moveTo(p.x2 - outerW2, p.y2);
      ctx.lineTo(p.x2 + outerW2, p.y2);
      ctx.lineTo(p.x1 + outerW1, p.y1);
      ctx.lineTo(p.x1 - outerW1, p.y1);
      ctx.closePath();
      ctx.fill();

      // Road surface pass.
      ctx.fillStyle = artwork.roadColor;
      ctx.beginPath();
      ctx.moveTo(p.x2 - p.w2, p.y2);
      ctx.lineTo(p.x2 + p.w2, p.y2);
      ctx.lineTo(p.x1 + p.w1, p.y1);
      ctx.lineTo(p.x1 - p.w1, p.y1);
      ctx.closePath();
      ctx.fill();

      // Lane dashes pass.
      if (artwork.drawLane) {
        const halfMarkW1 = p.w1 * artwork.laneMarkWidthRatio * 0.5;
        const halfMarkW2 = p.w2 * artwork.laneMarkWidthRatio * 0.5;
        ctx.fillStyle = artwork.laneColor;
        ctx.beginPath();
        ctx.moveTo(p.x2 - halfMarkW2, p.y2);
        ctx.lineTo(p.x2 + halfMarkW2, p.y2);
        ctx.lineTo(p.x1 + halfMarkW1, p.y1);
        ctx.lineTo(p.x1 - halfMarkW1, p.y1);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (count > 0 && renderedCount === 0) {
      console.warn("[drawOutrunRoad] 100% of projected road segments were clipped or discarded.");
    }

    // Shared atmospheric fog overlay: dense at the horizon, fading towards the camera.
    const fogGradient = ctx.createLinearGradient(0, horizonY, 0, screenH);
    fogGradient.addColorStop(0, resolveRoadFogColor(visualPalette, fogIntensity(1)));
    fogGradient.addColorStop(1, resolveRoadFogColor(visualPalette, fogIntensity(0)));
    ctx.fillStyle = fogGradient;
    ctx.fillRect(0, horizonY, screenW, screenH - horizonY);

    // Flat headlight cones.
    const headlightBeams = computeOutrunHeadlightBeams(state, config, visualPalette);
    if (headlightBeams.length > 0) {
      ctx.save();
      for (const beam of headlightBeams) {
        ctx.globalAlpha = beam.alpha;
        fillRoadsidePolygonCanvas(ctx, beam.points, beam.color);
      }
      ctx.restore();
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
      ctx.save();
      ctx.globalAlpha = visualPalette.tuning.road.speedLineAlpha;
      ctx.strokeStyle = visualPalette.shared.cream;
      ctx.lineWidth = visualPalette.tuning.road.speedLineWidthPx;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const line of speedLines) {
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 3. Roadside Sprites Pass
    iterateOutrunSprites(ctx, count, roadData, config, palette.lightsOn, (c, sp, sx, sy, _sw, _roadW, lightsOn, clipY, depth) => {
      drawRoadSpriteCanvas(c, sp, sx, sy, _sw, clipY, visualPalette, depth, lightsOn, activeMod, world);
    });

    ctx.restore();
  }
};

export const drawOutrunCar: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    if (entity === undefined) return;
    const carCtx = resolveOutrunCarContext(world, entity);
    if (!carCtx) return;

    const { state, config, geom } = carCtx;
    const { baseX, baseY, carScale, tiltAngle, isOffroad, speedRatio } = geom;

    ctx.save();

    // Offroad Dust
    if (isOffroad && speedRatio > 0) {
      const { dustColor, particles } = resolveOffroadDustParams(world, state.playerZ, speedRatio);
      for (const p of particles) {
        ctx.fillStyle = dustColor;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(baseX + p.dx, baseY + p.dy, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // Speed Lines
    const speedLines = computeSpeedLines(config.WIDTH, config.HEIGHT, config.HEIGHT * 0.45, state.playerZ, speedRatio);
    if (speedLines) {
      ctx.save();
      ctx.strokeStyle = colors.white;
      ctx.lineWidth = 2;
      speedLines.forEach((streak) => {
        ctx.globalAlpha = streak.alpha;
        ctx.beginPath();
        ctx.moveTo(streak.x1, streak.y1);
        ctx.lineTo(streak.x2, streak.y2);
        ctx.stroke();
      });
      ctx.restore();
    }

    const vehicleScale = computeOutrunPlayerArtworkScale(config);
    ctx.translate(baseX, baseY);
    ctx.rotate(tiltAngle);
    ctx.scale(carScale * vehicleScale, carScale * vehicleScale);
    drawOutrunPlayerVehicleCanvas(ctx, config);
    ctx.restore();
  }
};

export const drawOutrunRacer: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    if (entity === undefined) return;
    const racerCtx = resolveOutrunRacerDrawContext(world, entity);
    if (!racerCtx) return;

    const { proj, vehicleStyleIndex, config } = racerCtx;
    const { sx, sy, lateral, carW, bestClip } = proj;
    if (sy >= bestClip || carW < 2) return;

    const activeMod = world.getResource<OutrunVisualMod>("VisualMod");
    drawOutrunTrafficVehicleCanvas(ctx, config, sx + lateral, sy, carW, vehicleStyleIndex, activeMod, world);
  }
};

export const drawOutrunHud = {
  draw(ctx: CanvasRenderingContext2D, world: import("@tiny-aster/core").World<OutrunComponentRegistry>): void {
    const hudCtx = resolveOutrunHudContext(world);
    if (!hudCtx) return;

    const {
      state, config, speedKmh, timeStr, phase, progressFraction,
      resultTitle, resultDetail, visualPalette
    } = hudCtx;
    const layout = resolveOutrunHudLayout({ config, progressFraction, speedKmh, timeStr, visualPalette });
    const shared = visualPalette.shared;
    ctx.save();

    // Top information blocks.
    ctx.textAlign = "left";
    ctx.fillStyle = shared.hudMutedText;
    ctx.font = `${layout.time.labelFont}px sans-serif`;
    ctx.fillText("Tiempo", layout.time.x, layout.time.labelY);
    ctx.fillStyle = shared.cream;
    ctx.font = `${layout.time.valueFont}px sans-serif`;
    ctx.fillText(layout.time.value, layout.time.x, layout.time.valueY);

    ctx.textAlign = "right";
    ctx.fillStyle = shared.hudMutedText;
    ctx.font = `${layout.stage.labelFont}px sans-serif`;
    ctx.fillText(layout.stage.label, layout.stage.x, layout.stage.labelY);
    ctx.fillStyle = shared.cream;
    ctx.font = `${layout.stage.hourFont}px sans-serif`;
    ctx.fillText(layout.stage.hour, layout.stage.x, layout.stage.hourY);
    ctx.textAlign = "left";

    // Progress rail, upcoming stage marker and player marker.
    const progress = layout.progress;
    ctx.fillStyle = shared.cream;
    ctx.globalAlpha = progress.trackAlpha;
    ctx.fillRect(progress.x, progress.y, progress.width, progress.height);
    ctx.globalAlpha = 1;
    ctx.fillRect(progress.x, progress.y, progress.filledWidth, progress.height);

    ctx.fillStyle = visualPalette.tokens.kerbB;
    ctx.beginPath();
    ctx.arc(progress.branchMarkerX, progress.y + progress.height / 2, progress.branchMarkerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shared.car;
    ctx.beginPath();
    ctx.arc(progress.carMarkerX, progress.y + progress.height / 2, progress.carMarkerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Speed pill.
    const speed = layout.speedPill;
    ctx.save();
    ctx.globalAlpha = speed.shadowAlpha;
    fillVehicleRoundedRectCanvas(ctx, {
      x: speed.x, y: speed.y, width: speed.width, height: speed.height, cornerRadius: speed.radius
    }, shared.shadow);
    ctx.restore();
    ctx.fillStyle = shared.cream;
    ctx.font = `${speed.digitsFont}px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(speed.value, speed.digitsX, speed.digitsY);
    ctx.fillStyle = shared.hudMutedText;
    ctx.font = `${speed.unitFont}px sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText("km/h", speed.unitX, speed.unitY);

    // Decorative radio dial.
    const radio = layout.radioPill;
    ctx.save();
    ctx.globalAlpha = radio.shadowAlpha;
    fillVehicleRoundedRectCanvas(ctx, {
      x: radio.x, y: radio.y, width: radio.width, height: radio.height, cornerRadius: radio.radius
    }, shared.shadow);
    ctx.restore();
    ctx.textAlign = "left";
    ctx.fillStyle = shared.hudMutedText;
    ctx.font = `${radio.labelFont}px sans-serif`;
    ctx.fillText(radio.label, radio.labelX, radio.labelY);
    for (const bar of radio.bars) {
      fillVehicleRoundedRectCanvas(ctx, {
        x: bar.x, y: bar.y, width: bar.width, height: bar.height, cornerRadius: Math.min(bar.width, bar.height) / 2
      }, bar.active ? shared.car : shared.hudMutedText);
    }

    // Countdown and end-of-run overlays.
    if (phase === "countdown") {
      const countdown = Math.ceil(state.countdownTime ?? 3);
      ctx.fillStyle = hexToRgba(shared.shadow, 0.64);
      ctx.fillRect(0, 0, config.WIDTH, config.HEIGHT);
      ctx.fillStyle = shared.cream;
      ctx.font = `${layout.countdownFont}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(countdown > 0 ? `${countdown}` : "GO!", layout.centerX, layout.centerY);
    }
    if (state.isGameOver) {
      ctx.fillStyle = hexToRgba(shared.shadow, 0.72);
      ctx.fillRect(0, 0, config.WIDTH, config.HEIGHT);
      ctx.fillStyle = shared.cream;
      ctx.font = `${layout.resultsFont}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(resultTitle, layout.centerX, layout.centerY - layout.resultsFont * 0.18);
      ctx.font = `${Math.max(12, layout.resultsFont * 0.48)}px sans-serif`;
      ctx.fillText(resultDetail, layout.centerX, layout.centerY + layout.resultsFont * 0.9);
    }

    ctx.restore();
  }
};
