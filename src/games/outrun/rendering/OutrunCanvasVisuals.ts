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

  const aspect = spec.aspectRatio ?? 1.0;
  const size = sw * 0.8;
  const w = size;
  const h = size * aspect;
  if (sy >= clipY || w < 2) return false;

  const anchorX = spec.anchor?.x ?? 0.5;
  const anchorY = spec.anchor?.y ?? 1.0;

  const dx = sx - w * anchorX;
  const dy = sy - h * anchorY;

  ctx.save();
  if (typeof HTMLImageElement !== "undefined" && rawImg instanceof HTMLImageElement) {
    if (spec.srcRect) {
      ctx.drawImage(rawImg, spec.srcRect.x, spec.srcRect.y, spec.srcRect.w, spec.srcRect.h, dx, dy, w, h);
    } else {
      ctx.drawImage(rawImg, dx, dy, w, h);
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
  if (sy >= clipY || sw < 2) return;

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
    const cw = size * 0.6;
    const ch = size * 0.8;
    fillRoadsidePolygonCanvas(ctx, [
      { x: sx - cw / 2, y: sy },
      { x: sx + cw / 2, y: sy - ch / 2 },
      { x: sx - cw / 2, y: sy - ch }
    ], colors.amber);
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
        const tiers = [
          { top: h * 0.48, bottom: h * 0.16, halfWidth: h * 0.34 },
          { top: h * 0.73, bottom: h * 0.39, halfWidth: h * 0.26 },
          { top: h * 0.98, bottom: h * 0.65, halfWidth: h * 0.18 }
        ];
        for (const tier of tiers) {
          const topY = sy - tier.top;
          const bottomY = sy - tier.bottom;
          fillRoadsidePolygonCanvas(ctx, [
            { x: sx, y: topY },
            { x: sx, y: bottomY },
            { x: sx - tier.halfWidth, y: bottomY }
          ], style.foliageLightColor);
          fillRoadsidePolygonCanvas(ctx, [
            { x: sx, y: topY },
            { x: sx + tier.halfWidth, y: bottomY },
            { x: sx, y: bottomY }
          ], style.foliageColor);
        }
        ctx.fillStyle = style.trunkColor;
        ctx.fillRect(sx - trunkW * 0.4, sy - trunkH, trunkW * 0.8, trunkH);
        break;
      }
      case "rock": {
        const w = style.width;
        fillRoadsidePolygonCanvas(ctx, [
          { x: sx - w * 0.5, y: sy },
          { x: sx - w * 0.43, y: sy - h * 0.18 },
          { x: sx - w * 0.12, y: sy - h * 0.34 },
          { x: sx + w * 0.2, y: sy - h * 0.29 },
          { x: sx + w * 0.48, y: sy - h * 0.08 },
          { x: sx + w * 0.45, y: sy }
        ], style.rockBaseColor);
        fillRoadsidePolygonCanvas(ctx, [
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
        ctx.strokeStyle = style.trunkColor;
        ctx.lineWidth = Math.max(1, h * 0.055);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx - h * 0.04, sy - h * 0.45, crownTopX, crownTopY);
        ctx.stroke();
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
          fillRoadsidePolygonCanvas(ctx, [
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
        fillRoadsidePolygonCanvas(ctx, [
          { x: sx - topW / 2, y: topY },
          { x: sx + topW / 2, y: topY },
          { x: sx + bottomW / 2, y: sy },
          { x: sx - bottomW / 2, y: sy }
        ], style.creamColor);
        for (const band of [0.28, 0.55, 0.79]) {
          const bandY = sy - h * band;
          const t = (sy - bandY) / Math.max(1, sy - topY);
          const bandW = topW + (bottomW - topW) * t;
          fillRoadsidePolygonCanvas(ctx, [
            { x: sx - bandW / 2, y: bandY - h * 0.055 },
            { x: sx + bandW / 2, y: bandY - h * 0.055 },
            { x: sx + bandW / 2, y: bandY + h * 0.015 },
            { x: sx - bandW / 2, y: bandY + h * 0.015 }
          ], style.darkAccentColor);
        }
        ctx.fillStyle = style.darkAccentColor;
        ctx.fillRect(sx - w * 0.25, topY - h * 0.06, w * 0.5, h * 0.07);
        ctx.fillStyle = style.lightColor;
        ctx.fillRect(sx - w * 0.13, topY - h * 0.18, w * 0.26, h * 0.12);
        break;
      }
      case "cactus": {
        ctx.strokeStyle = style.foliageColor;
        ctx.lineWidth = Math.max(1, h * 0.14);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy - h * 0.82);
        ctx.moveTo(sx, sy - h * 0.4);
        ctx.lineTo(sx - h * 0.21, sy - h * 0.4);
        ctx.lineTo(sx - h * 0.21, sy - h * 0.59);
        ctx.moveTo(sx, sy - h * 0.58);
        ctx.lineTo(sx + h * 0.2, sy - h * 0.58);
        ctx.lineTo(sx + h * 0.2, sy - h * 0.74);
        ctx.stroke();
        ctx.strokeStyle = style.foliageLightColor;
        ctx.lineWidth = Math.max(1, h * 0.045);
        ctx.beginPath();
        ctx.moveTo(sx + h * 0.04, sy - h * 0.08);
        ctx.lineTo(sx + h * 0.04, sy - h * 0.72);
        ctx.stroke();
        break;
      }
      case "dry_shrub": {
        ctx.strokeStyle = style.foliageColor;
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(1, h * 0.1);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - h * 0.24, sy - h * 0.35);
        ctx.lineTo(sx - h * 0.32, sy - h * 0.55);
        ctx.moveTo(sx - h * 0.15, sy - h * 0.22);
        ctx.lineTo(sx + h * 0.07, sy - h * 0.42);
        ctx.lineTo(sx + h * 0.2, sy - h * 0.52);
        ctx.moveTo(sx + h * 0.01, sy - h * 0.18);
        ctx.lineTo(sx + h * 0.26, sy - h * 0.32);
        ctx.stroke();
        ctx.strokeStyle = style.foliageLightColor;
        ctx.lineWidth = Math.max(1, h * 0.055);
        ctx.beginPath();
        ctx.moveTo(sx - h * 0.2, sy - h * 0.31);
        ctx.lineTo(sx - h * 0.3, sy - h * 0.46);
        ctx.moveTo(sx + h * 0.1, sy - h * 0.32);
        ctx.lineTo(sx + h * 0.22, sy - h * 0.42);
        ctx.stroke();
        break;
      }
      case "wind_tower": {
        const topY = sy - h * 0.82;
        ctx.strokeStyle = style.rockShadeColor;
        ctx.lineWidth = Math.max(1, h * 0.045);
        ctx.beginPath();
        ctx.moveTo(sx - h * 0.15, sy);
        ctx.lineTo(sx, topY);
        ctx.lineTo(sx + h * 0.15, sy);
        ctx.moveTo(sx, topY);
        ctx.lineTo(sx, topY - h * 0.13);
        ctx.stroke();
        ctx.fillStyle = style.creamColor;
        ctx.beginPath();
        ctx.arc(sx, topY - h * 0.13, Math.max(1, h * 0.045), 0, Math.PI * 2);
        ctx.fill();
        for (const angle of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
          ctx.beginPath();
          ctx.moveTo(sx, topY - h * 0.13);
          ctx.lineTo(sx + Math.cos(angle) * h * 0.2, topY - h * 0.13 + Math.sin(angle) * h * 0.2);
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
  const bodyTop = -style.bodyHeight;
  const cabinBaseY = bodyTop;
  const cabinTopY = cabinBaseY - style.cabinHeight;

  ctx.save();
  ctx.translate(centerX, baselineY);
  ctx.globalAlpha = style.shadowAlpha;
  ctx.fillStyle = style.shadowColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, style.shadowRadiusX, style.shadowRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  fillVehicleRoundedRectCanvas(ctx, {
    x: -style.bodyWidth / 2, y: bodyTop, width: style.bodyWidth, height: style.bodyHeight,
    cornerRadius: style.bodyCornerRadius
  }, style.bodyColor);

  const baseHalf = style.cabinBaseWidth / 2;
  const roofHalf = style.cabinRoofWidth / 2;
  fillVehiclePolygonCanvas(ctx, [
    { x: -baseHalf, y: cabinBaseY },
    { x: baseHalf, y: cabinBaseY },
    { x: roofHalf, y: cabinTopY },
    { x: -roofHalf, y: cabinTopY }
  ], style.cabinColor);

  const windowBaseHalf = baseHalf * 0.72;
  const windowRoofHalf = roofHalf * 0.72;
  fillVehiclePolygonCanvas(ctx, [
    { x: -windowBaseHalf, y: cabinBaseY - style.cabinHeight * 0.08 },
    { x: windowBaseHalf, y: cabinBaseY - style.cabinHeight * 0.08 },
    { x: windowRoofHalf, y: cabinTopY + style.cabinHeight * 0.18 },
    { x: -windowRoofHalf, y: cabinTopY + style.cabinHeight * 0.18 }
  ], style.glassColor);

  fillVehicleRoundedRectCanvas(ctx, {
    x: -style.lightBarWidth / 2,
    y: bodyTop + style.lightBarTopOffset,
    width: style.lightBarWidth,
    height: style.lightBarHeight,
    cornerRadius: style.lightBarHeight / 2
  }, style.lightBarColor);

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
      ctx.strokeStyle = colors.white;
      ctx.lineWidth = 2;
      for (const line of speedLines) {
        ctx.globalAlpha = line.alpha;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
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

    const { state, config, speedKmh, timeStr, phase, progressFraction, visualPalette } = hudCtx;
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
      ctx.fillText("Fin del recorrido", layout.centerX, layout.centerY);
    }

    ctx.restore();
  }
};
