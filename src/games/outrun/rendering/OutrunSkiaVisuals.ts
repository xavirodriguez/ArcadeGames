import type { ShapeDrawer } from "@tiny-aster/core";
import type { OutrunComponentRegistry, RoadSegmentSprite } from "../types/OutrunTypes";
import { Skia } from "../../shared/rendering/SkiaContext";
import {
  resolveOutrunRoadContext,
  projectOutrunRoad,
  projectionBuffer,
  rumbleColor,
  roadColor,
  computeFacetedPeaks,
  getFacetedPeakPolygons,
  computeCoastalBuildings,
  iterateOutrunSprites,
  resolveOutrunCarContext,
  resolveOutrunRacerDrawContext,
  resolveOutrunHudContext,
  resolveOffroadDustParams
} from "./OutrunRenderShared";
import {
  computeCloudParams,
  computeHeatHazeLines,
  computeSpeedLines
} from "./OutrunVisualHelpers";
import { resolveSegmentFog } from "./OutrunFog";

function drawRoadSpriteSkia(
  canvas: any,
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
    pillarPaint.setColor(Skia.Color("#334155"));
    pillarPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(sx - archW / 2, sy - archH, archW * 0.1, archH), pillarPaint);
    canvas.drawRect(Skia.XYWHRect(sx + archW / 2 - archW * 0.1, sy - archH, archW * 0.1, archH), pillarPaint);

    const bannerPaint = Skia.Paint();
    bannerPaint.setColor(Skia.Color(sp.kind === "arch" ? "#e11d48" : "#2563eb"));
    bannerPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(sx - archW / 2, sy - archH, archW, archH * 0.35), bannerPaint);
  } else if (sp.kind === "billboard") {
    const bw = size * 1.8;
    const bh = size * 1.0;

    const postPaint = Skia.Paint();
    postPaint.setColor(Skia.Color("#1e293b"));
    postPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(sx - 4, sy - bh, 8, bh), postPaint);

    const boardPaint = Skia.Paint();
    boardPaint.setColor(Skia.Color("#0284c7"));
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
    paint.setColor(Skia.Color("#f59e0b"));
    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawPath(path, paint);
  } else if (sp.kind === "palm") {
    const trunkPaint = Skia.Paint();
    trunkPaint.setColor(Skia.Color("#78350f"));
    trunkPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(sx - size * 0.08, sy - h, size * 0.16, h), trunkPaint);

    const topPaint = Skia.Paint();
    topPaint.setColor(Skia.Color("#15803d"));
    topPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(sx, sy - h, size * 0.6, topPaint);
  } else if (sp.kind === "lamp") {
    const postPaint = Skia.Paint();
    postPaint.setColor(Skia.Color("#64748b"));
    postPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(sx - 2, sy - h, 4, h), postPaint);

    const lightPaint = Skia.Paint();
    lightPaint.setColor(Skia.Color(palette.lightsOn ? "#fef08a" : "#94a3b8"));
    lightPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(sx, sy - h, size * 0.25, lightPaint);
  } else if (sp.kind === "cypress") {
    const path = Skia.Path.Make();
    path.moveTo(sx - size * 0.3, sy);
    path.lineTo(sx, sy - h * 1.2);
    path.lineTo(sx + size * 0.3, sy);
    path.close();

    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#14532d"));
    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawPath(path, paint);
  } else {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#166534"));
    paint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(sx, sy - size * 0.3, size * 0.4, paint);
  }
}

export const drawSkiaOutrunRoad: ShapeDrawer<any, OutrunComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const roadCtx = resolveOutrunRoadContext(world);
    if (!roadCtx) return;

    const { state, roadData, config, screenW, screenH, rumbleLength, palette } = roadCtx;
    const horizonY = screenH * 0.45;

    // 1. Sky Bands
    const bands = palette.skyBands;
    const bandHeight = horizonY / Math.max(1, bands.length);
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
    if (palette.cloudColor) {
      const clouds = computeCloudParams(screenW, screenH, state.playerZ, state.playerX);
      const cloudPaint = Skia.Paint();
      cloudPaint.setColor(Skia.Color(palette.cloudColor));
      cloudPaint.setStyle(Skia.PaintStyle.Fill);

      for (const c of clouds) {
        canvas.drawOval(
          Skia.XYWHRect(c.cloudX - c.cloudW / 2, c.cloudY - c.cloudH / 2, c.cloudW, c.cloudH),
          cloudPaint
        );
      }
    }

    // Horizon Scenery
    const scenarioId = roadData.segments[0]?.scenarioId ?? palette.id;
    if (scenarioId.includes("mountain")) {
      const peaks = computeFacetedPeaks(screenW, horizonY, state.playerZ, state.playerX, palette.id);
      for (const p of peaks) {
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
    } else if (scenarioId.includes("coast")) {
      const { buildings } = computeCoastalBuildings(screenW, horizonY, state.playerZ, state.playerX);
      const bPaint = Skia.Paint();
      bPaint.setColor(Skia.Color(palette.mountainBase));
      bPaint.setStyle(Skia.PaintStyle.Fill);
      for (const b of buildings) {
        canvas.drawRect(Skia.XYWHRect(b.bx, horizonY - b.bh, b.bw, b.bh), bPaint);
      }
    } else if (scenarioId.includes("desert")) {
      const hazeLines = computeHeatHazeLines(screenW, screenH, state.playerZ, state.playerX);
      const hazePaint = Skia.Paint();
      hazePaint.setColor(Skia.Color(palette.sun || "#ffe066"));
      hazePaint.setAlphaf(0.2);
      hazePaint.setStyle(Skia.PaintStyle.Fill);
      for (const h of hazeLines) {
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

    for (let i = count - 1; i >= 0; i--) {
      const p = projectionBuffer[i]!;
      if (p.y1 <= p.y2 || p.y1 >= p.clip) continue;

      const grassCol = rumbleColor(p.index, rumbleLength, palette.groundDark, palette.groundLight);
      const rumbleCol = rumbleColor(p.index, rumbleLength, palette.rumbleDark, palette.rumbleLight);
      const roadCol = roadColor(p.index, rumbleLength, palette);

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

      // Fog Pass
      const fog = resolveSegmentFog(p.fog, palette);
      if (fog.alpha > 0) {
        const fogPaint = Skia.Paint();
        fogPaint.setColor(Skia.Color(fog.rgba));
        fogPaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawRect(Skia.XYWHRect(0, p.y2, screenW, p.y1 - p.y2), fogPaint);
      }
    }

    // 3. Roadside Sprites Pass
    iterateOutrunSprites(canvas, count, roadData, config, palette.lightsOn, (c, sp, sx, sy, sw, roadW, lightsOn, clipY) => {
      drawRoadSpriteSkia(c, sp, sx, sy, sw, clipY, palette);
    });
  }
};

export const drawSkiaOutrunCar: ShapeDrawer<any, OutrunComponentRegistry> = {
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
        linePaint.setColor(Skia.Color("#ffffff"));
        linePaint.setAlphaf(line.alpha);
        linePaint.setStyle(Skia.PaintStyle.Stroke);
        linePaint.setStrokeWidth(2);
        canvas.drawLine(line.x1, line.y1, line.x2, line.y2, linePaint);
      }
    }

    canvas.translate(baseX, baseY);
    canvas.rotate((tiltAngle * 180) / Math.PI, 0, 0);
    canvas.scale(carScale, carScale);

    // Shadow
    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color("rgba(0, 0, 0, 0.4)"));
    shadowPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawOval(Skia.XYWHRect(-36, 6, 72, 20), shadowPaint);

    // Tires
    const tirePaint = Skia.Paint();
    tirePaint.setColor(Skia.Color("#111111"));
    tirePaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-32, 2, 10, 16), tirePaint);
    canvas.drawRect(Skia.XYWHRect(22, 2, 10, 16), tirePaint);

    // Body
    const bodyPaint = Skia.Paint();
    bodyPaint.setColor(Skia.Color(carColor));
    bodyPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-30, -18, 60, 30), 6, 6), bodyPaint);

    // Bumper
    const bumperPaint = Skia.Paint();
    bumperPaint.setColor(Skia.Color("#1c1c1c"));
    bumperPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-28, 4, 56, 8), bumperPaint);

    // Windshield
    const glassPath = Skia.Path.Make();
    glassPath.moveTo(-20, -16);
    glassPath.lineTo(20, -16);
    glassPath.lineTo(16, -2);
    glassPath.lineTo(-16, -2);
    glassPath.close();

    const glassPaint = Skia.Paint();
    glassPaint.setColor(Skia.Color("#22252a"));
    glassPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawPath(glassPath, glassPaint);

    // Tail Lights
    const tailPaint = Skia.Paint();
    tailPaint.setColor(Skia.Color("#ff2233"));
    tailPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-26, -6, 12, 6), tailPaint);
    canvas.drawRect(Skia.XYWHRect(14, -6, 12, 6), tailPaint);

    canvas.restore();
  }
};

export const drawSkiaOutrunRacer: ShapeDrawer<any, OutrunComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia || entity === undefined) return;
    const racerCtx = resolveOutrunRacerDrawContext(world, entity);
    if (!racerCtx) return;

    const { proj, bodyColor } = racerCtx;
    const { sx, sy, sw, lateral, carW, carH, bestClip } = proj;

    const cx = sx + lateral;
    const cy = sy;

    if (cy >= bestClip || carW < 2) return;

    canvas.save();

    // Shadow
    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color("rgba(0, 0, 0, 0.35)"));
    shadowPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawOval(Skia.XYWHRect(cx - carW * 0.5, cy + carH * 0.15, carW, carH * 0.5), shadowPaint);

    // Body
    const bodyPaint = Skia.Paint();
    bodyPaint.setColor(Skia.Color(bodyColor));
    bodyPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(cx - carW / 2, cy - carH / 2, carW, carH), bodyPaint);

    // Windshield
    const glassPaint = Skia.Paint();
    glassPaint.setColor(Skia.Color("#111827"));
    glassPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(cx - carW * 0.3, cy - carH * 0.4, carW * 0.6, carH * 0.35), glassPaint);

    // Tail Lights
    const tailPaint = Skia.Paint();
    tailPaint.setColor(Skia.Color("#ef4444"));
    tailPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(cx - carW * 0.4, cy, carW * 0.2, carH * 0.2), tailPaint);
    canvas.drawRect(Skia.XYWHRect(cx + carW * 0.2, cy, carW * 0.2, carH * 0.2), tailPaint);

    canvas.restore();
  }
};

export const drawSkiaOutrunHud = {
  draw(canvas: any, world: import("@tiny-aster/core").World<OutrunComponentRegistry, any, any>): void {
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
      overPaint.setColor(Skia.Color("rgba(0, 0, 0, 0.6)"));
      overPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(0, 0, config.WIDTH, config.HEIGHT), overPaint);
    }

    canvas.restore();
  }
};
