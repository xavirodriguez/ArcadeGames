import type { ShapeDrawer } from "@tiny-aster/core";
import type { OutrunComponentRegistry, RoadSegmentSprite } from "../types/OutrunTypes";
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

function drawRoadSpriteCanvas(
  ctx: CanvasRenderingContext2D,
  sp: RoadSegmentSprite,
  sx: number,
  sy: number,
  sw: number,
  clipY: number,
  palette: import("./OutrunPalettes").ModulatedPalette
): void {
  if (sy >= clipY || sw < 2) return;

  ctx.save();

  const size = sw * 0.8;
  const h = size * 1.5;

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
    const bh = size * 1.0;
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
    ctx.fillStyle = colors.amber;
    ctx.beginPath();
    ctx.moveTo(sx - cw / 2, sy);
    ctx.lineTo(sx + cw / 2, sy - ch / 2);
    ctx.lineTo(sx - cw / 2, sy - ch);
    ctx.closePath();
    ctx.fill();
  } else if (sp.kind === "palm") {
    ctx.fillStyle = colors.orangeDark;
    ctx.fillRect(sx - size * 0.08, sy - h, size * 0.16, h);

    ctx.fillStyle = colors.green;
    ctx.beginPath();
    ctx.arc(sx, sy - h, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (sp.kind === "lamp") {
    ctx.fillStyle = colors.slate;
    ctx.fillRect(sx - 2, sy - h, 4, h);
    ctx.fillStyle = palette.lightsOn ? colors.yellow : colors.borderLight;
    ctx.beginPath();
    ctx.arc(sx, sy - h, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (sp.kind === "cypress") {
    ctx.fillStyle = colors.green;
    ctx.beginPath();
    ctx.moveTo(sx - size * 0.3, sy);
    ctx.lineTo(sx, sy - h * 1.2);
    ctx.lineTo(sx + size * 0.3, sy);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = colors.green;
    ctx.beginPath();
    ctx.arc(sx, sy - size * 0.3, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
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

export const drawOutrunRoad: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world) {
    const roadCtx = resolveOutrunRoadContext(world);
    if (!roadCtx) return;

    const { state, roadData, config, screenW, screenH, palette, visualPalette } = roadCtx;
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

      // Depth haze and the subtle alternating ground stripe.
      ctx.fillStyle = artwork.groundColor;
      ctx.fillRect(0, p.y2, screenW, p.y1 - p.y2);

      // The coast keeps the sea on the left and land on the right.
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

      // Pianos alternate cream and the hour-specific dark token.
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

      // Road surface uses near/far palette tokens, never a second projection.
      ctx.fillStyle = artwork.roadColor;
      ctx.beginPath();
      ctx.moveTo(p.x2 - p.w2, p.y2);
      ctx.lineTo(p.x2 + p.w2, p.y2);
      ctx.lineTo(p.x1 + p.w1, p.y1);
      ctx.lineTo(p.x1 - p.w1, p.y1);
      ctx.closePath();
      ctx.fill();

      // Lane dashes share the even-segment rhythm of the dark kerb.
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
    iterateOutrunSprites(ctx, count, roadData, config, palette.lightsOn, (c, sp, sx, sy, _sw, _roadW, _lightsOn, clipY) => {
      drawRoadSpriteCanvas(c, sp, sx, sy, _sw, clipY, palette);
    });

    ctx.restore();
  }
};

export const drawOutrunCar: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    if (entity === undefined) return;
    const carCtx = resolveOutrunCarContext(world, entity);
    if (!carCtx) return;

    const { state, config, carColor, geom } = carCtx;
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

    ctx.translate(baseX, baseY);
    ctx.rotate(tiltAngle);
    ctx.scale(carScale, carScale);

    const pixelSize = computeOutrunPlayerPixelSize(config);
    const spriteWidth = OUTRUN_PLAYER_PIXEL_SPRITE.width * pixelSize;
    const spriteHeight = OUTRUN_PLAYER_PIXEL_SPRITE.height * pixelSize;

    // Scale the crisp shadow with the same road-relative sprite dimensions.
    ctx.fillStyle = hexToRgba(colors.surface, 0.4);
    ctx.fillRect(-spriteWidth * 0.375, spriteHeight / 2, spriteWidth * 0.75, pixelSize);
    ctx.fillRect(-spriteWidth * 0.25, spriteHeight / 2 + pixelSize, spriteWidth * 0.5, pixelSize);

    const playerFrame = getOutrunAnimationFrame(state.playerZ);
    const playerSprite = OUTRUN_PLAYER_PIXEL_SPRITE.frames[playerFrame]!;
    visitOutrunPixelRuns(
      playerSprite,
      -spriteWidth / 2,
      -spriteHeight / 2,
      pixelSize,
      (pixel, x, y, width, height) => {
      ctx.fillStyle = resolveOutrunPixelColor(pixel, carColor);
      ctx.fillRect(x, y, width, height);
    });

    ctx.restore();
  }
};

export const drawOutrunRacer: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    if (entity === undefined) return;
    const racerCtx = resolveOutrunRacerDrawContext(world, entity);
    if (!racerCtx) return;

    const { proj, bodyColor } = racerCtx;
    const { sx, sy, lateral, carW, bestClip } = proj;

    const cx = sx + lateral;
    const cy = sy;

    if (cy >= bestClip || carW < 2) return;

    ctx.save();

    const pixelSize = carW / OUTRUN_TRAFFIC_PIXEL_SPRITE.width;
    const spriteWidth = pixelSize * OUTRUN_TRAFFIC_PIXEL_SPRITE.width;
    const spriteHeight = pixelSize * OUTRUN_TRAFFIC_PIXEL_SPRITE.height;

    ctx.fillStyle = hexToRgba(colors.surface, 0.35);
    ctx.fillRect(cx - spriteWidth * 0.35, cy + spriteHeight * 0.4, spriteWidth * 0.7, Math.max(1, pixelSize));

    const trafficSprite = OUTRUN_TRAFFIC_PIXEL_SPRITE.frames[racerCtx.frame]!;
    visitOutrunPixelRuns(
      trafficSprite,
      cx - spriteWidth / 2,
      cy - spriteHeight / 2,
      pixelSize,
      (pixel, x, y, width, height) => {
        ctx.fillStyle = resolveOutrunPixelColor(pixel, bodyColor);
        ctx.fillRect(x, y, width, height);
      }
    );

    ctx.restore();
  }
};

export const drawOutrunHud = {
  draw(ctx: CanvasRenderingContext2D, world: import("@tiny-aster/core").World<OutrunComponentRegistry>): void {
    const hudCtx = resolveOutrunHudContext(world);
    if (!hudCtx) return;

    const { state, config, speedKmh, timeStr, phase, hudBg, hudAccent } = hudCtx;
    ctx.save();

    // Top Panel
    ctx.fillStyle = hudBg;
    ctx.fillRect(16, 16, 180, 60);

    ctx.strokeStyle = hudAccent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 16, 180, 60);

    // Metrics Text
    ctx.fillStyle = colors.white;
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`${speedKmh} KM/H`, 28, 40);

    ctx.fillStyle = hudAccent;
    ctx.font = "14px sans-serif";
    ctx.fillText(`TIME: ${timeStr}s`, 28, 62);

    // Countdown Overlay
    if (phase === "countdown") {
      const cd = Math.ceil(state.countdownTime ?? 3);
      const text = cd > 0 ? `${cd}` : "GO!";
      ctx.fillStyle = hudAccent;
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, config.WIDTH / 2, config.HEIGHT / 2);
    }

    // Game Over Overlay
    if (state.isGameOver) {
      ctx.fillStyle = hexToRgba(colors.surface, 0.6);
      ctx.fillRect(0, 0, config.WIDTH, config.HEIGHT);

      ctx.fillStyle = colors.red;
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", config.WIDTH / 2, config.HEIGHT / 2);
    }

    ctx.restore();
  }
};
