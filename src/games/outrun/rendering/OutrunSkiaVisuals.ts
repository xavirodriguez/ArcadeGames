import type { ShapeDrawer } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import type { OutrunComponentRegistry, RoadSegmentSprite } from "../types/OutrunTypes";
import { Skia } from "../../shared/rendering/SkiaContext";
import {
  resolveOutrunRoadContext,
  resolveOutrunHorizonContext,
  projectOutrunRoad,
  projectionBuffer,
  computeRoadSegmentColors,
  getFacetedPeakPolygons,
  iterateOutrunSprites,
  resolveOutrunCarContext,
  resolveOutrunRacerDrawContext,
  resolveOutrunHudContext,
  resolveOffroadDustParams
} from "./OutrunRenderShared";
import { computeSpeedLines, computeOutrunPlayerPixelSize } from "./OutrunVisualHelpers";
import { resolveRoadFogColor } from "./OutrunFog";
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

export const drawSkiaOutrunRoad: ShapeDrawer<SkCanvas, OutrunComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const roadCtx = resolveOutrunRoadContext(world);
    if (!roadCtx) return;

    const { state, roadData, config, screenW, screenH, rumbleLength, palette } = roadCtx;
    const horizonCtx = resolveOutrunHorizonContext(roadCtx);
    const { horizonY, bands, bandHeight } = horizonCtx;

    // 1. Sky Bands
    for (let i = 0; i < bands.length; i++) {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(bands[i]!));
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(0, i * bandHeight, screenW, bandHeight + 1), paint);
    }

    // Sun/Moon
    if (palette.sun) {
      const sunPaint = Skia.Paint();
      sunPaint.setColor(Skia.Color(palette.sun));
      sunPaint.setStyle(Skia.PaintStyle.Fill);
      const sunX = ((screenW * 0.7 - state.playerX * 15) % screenW + screenW) % screenW;
      canvas.drawCircle(sunX, horizonY - 35, 20, sunPaint);
    }

    // Clouds
    if (palette.cloudColor && horizonCtx.clouds) {
      const cloudPaint = Skia.Paint();
      cloudPaint.setColor(Skia.Color(palette.cloudColor));
      cloudPaint.setStyle(Skia.PaintStyle.Fill);

      for (const c of horizonCtx.clouds) {
        canvas.drawOval(
          Skia.XYWHRect(c.cloudX - c.cloudW / 2, c.cloudY - c.cloudH / 2, c.cloudW, c.cloudH),
          cloudPaint
        );
      }
    }

    // Horizon Scenery
    if (horizonCtx.peaks) {
      for (const p of horizonCtx.peaks) {
        const poly = getFacetedPeakPolygons(p);

        const basePath = Skia.Path.Make();
        basePath.moveTo(poly.base[0][0], poly.base[0][1]);
        basePath.lineTo(poly.base[1][0], poly.base[1][1]);
        basePath.lineTo(poly.base[2][0], poly.base[2][1]);
        basePath.close();

        const basePaint = Skia.Paint();
        basePaint.setColor(Skia.Color(palette.mountainBase));
        basePaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawPath(basePath, basePaint);

        const facetPath = Skia.Path.Make();
        facetPath.moveTo(poly.facet[0][0], poly.facet[0][1]);
        facetPath.lineTo(poly.facet[1][0], poly.facet[1][1]);
        facetPath.lineTo(poly.facet[2][0], poly.facet[2][1]);
        facetPath.close();

        const facetPaint = Skia.Paint();
        facetPaint.setColor(Skia.Color(palette.mountainFacet));
        facetPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawPath(facetPath, facetPaint);
      }
    } else if (horizonCtx.buildings) {
      const bPaint = Skia.Paint();
      bPaint.setColor(Skia.Color(palette.mountainBase));
      bPaint.setStyle(Skia.PaintStyle.Fill);
      for (const b of horizonCtx.buildings) {
        canvas.drawRect(Skia.XYWHRect(b.bx, horizonY - b.bh, b.bw, b.bh), bPaint);
      }
    } else if (horizonCtx.hazeLines) {
      const hazePaint = Skia.Paint();
      hazePaint.setColor(Skia.Color(palette.sun || colors.yellow));
      hazePaint.setAlphaf(0.2);
      hazePaint.setStyle(Skia.PaintStyle.Fill);
      for (const h of horizonCtx.hazeLines) {
        canvas.drawRect(Skia.XYWHRect(h.x, h.hazeY, 20, 2), hazePaint);
      }
    }

    // Ground Fill
    const grassPaint = Skia.Paint();
    grassPaint.setColor(Skia.Color(palette.groundDark));
    grassPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(0, horizonY, screenW, screenH - horizonY), grassPaint);

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

      const { grassCol, rumbleCol, roadCol } = computeRoadSegmentColors(p.index, rumbleLength, palette);

      // Grass Strip
      const gPaint = Skia.Paint();
      gPaint.setColor(Skia.Color(grassCol));
      gPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(0, p.y2, screenW, p.y1 - p.y2), gPaint);

      // Rumble Strips
      const rPath = Skia.Path.Make();
      rPath.moveTo(p.x2 - p.w2 * 1.18, p.y2);
      rPath.lineTo(p.x2 + p.w2 * 1.18, p.y2);
      rPath.lineTo(p.x1 + p.w1 * 1.18, p.y1);
      rPath.lineTo(p.x1 - p.w1 * 1.18, p.y1);
      rPath.close();

      const rPaint = Skia.Paint();
      rPaint.setColor(Skia.Color(rumbleCol));
      rPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawPath(rPath, rPaint);

      // Road Surface
      const roadPath = Skia.Path.Make();
      roadPath.moveTo(p.x2 - p.w2, p.y2);
      roadPath.lineTo(p.x2 + p.w2, p.y2);
      roadPath.lineTo(p.x1 + p.w1, p.y1);
      roadPath.lineTo(p.x1 - p.w1, p.y1);
      roadPath.close();

      const roadPaint = Skia.Paint();
      roadPaint.setColor(Skia.Color(roadCol));
      roadPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawPath(roadPath, roadPaint);

      // Lane Divider
      if (Math.floor(p.index / rumbleLength) % 2 === 0) {
        const lw1 = p.w1 * 0.03;
        const lw2 = p.w2 * 0.03;
        const lPath = Skia.Path.Make();
        lPath.moveTo(p.x2 - lw2, p.y2);
        lPath.lineTo(p.x2 + lw2, p.y2);
        lPath.lineTo(p.x1 + lw1, p.y1);
        lPath.lineTo(p.x1 - lw1, p.y1);
        lPath.close();

        const lPaint = Skia.Paint();
        lPaint.setColor(Skia.Color(palette.lane));
        lPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawPath(lPath, lPaint);
      }

    }

    // Match Canvas with one continuous gradient rather than per-segment fog strips.
    const fogPaint = Skia.Paint();
    fogPaint.setStyle(Skia.PaintStyle.Fill);
    fogPaint.setShader(
      Skia.Shader.MakeLinearGradient(
        Skia.Point(0, horizonY),
        Skia.Point(0, screenH),
        [
          Skia.Color(resolveRoadFogColor(palette, 0.55)),
          Skia.Color(resolveRoadFogColor(palette, 0))
        ],
        [0, 1],
        Skia.TileMode.Clamp
      )
    );
    canvas.drawRect(
      Skia.XYWHRect(0, horizonY, screenW, Math.max(0, screenH - horizonY)),
      fogPaint
    );

    if (count > 0 && renderedCount === 0) {
      console.warn("[drawSkiaOutrunRoad] 100% of projected road segments were clipped or discarded.");
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
