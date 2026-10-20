import type { ShapeDrawer, World } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import type { RacingComponentRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";
import { Skia } from "../../shared/rendering/SkiaContext";
import {
  getRacingSkin,
  interpretSkia,
  defaultObstacleDrawer,
  defaultZoneDrawer,
  defaultWallDrawer,
  extractActorParams,
  extractWallParams,
  extractZoneParams,
  extractObstacleParams
} from "./RacingSkin";
import { buildTrackRibbon } from "./TrackRibbonGeometry";
import { extractTrackDimensions, computeCheckpointGrid, resolveTrackRibbonContext, resolveRacingParticlePoolContext, resolveFinishCheckers, computeSparkSegment } from "./RacingVisualHelpers";
import type { RacingParticlePool } from "../systems/RacingParticleSystem";

export const drawSkiaTrackSurface: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, halfW, halfH, skin, palette } = extractTrackDimensions(world);

    const fillPaint = Skia.Paint();
    fillPaint.setColor(Skia.Color(palette.surface));
    fillPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-halfW, -halfH, width, height), fillPaint);

    const detailPaint = Skia.Paint();
    detailPaint.setColor(Skia.Color(palette.surfaceDetail));
    detailPaint.setAlphaf(0.4);
    detailPaint.setStyle(Skia.PaintStyle.Stroke);
    detailPaint.setStrokeWidth(2);

    const pattern = skin.surfacePattern ?? "wood";
    if (pattern === "diagonal") {
      for (let x = -halfW; x < halfW; x += 40) {
        canvas.drawLine(x, -halfH, x + height, halfH, detailPaint);
      }
    } else if (pattern === "wood") {
      for (let y = -halfH + 25; y < halfH; y += 35) {
        canvas.drawLine(-halfW, y, halfW, y, detailPaint);
      }
    } else if (pattern === "starfield") {
      const starPaint = Skia.Paint();
      starPaint.setColor(Skia.Color(palette.surfaceDetail));
      starPaint.setStyle(Skia.PaintStyle.Fill);
      starPaint.setAlphaf(0.55);
      for (let i = 0; i < 120; i += 1) {
        const sx = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1) * width;
        const sy = Math.abs((Math.cos(i * 78.233) * 43758.5453) % 1) * height;
        canvas.drawCircle(-halfW + sx, -halfH + sy, i % 3 === 0 ? 2 : 1, starPaint);
      }
    }

    // Match the cached Canvas renderer's deterministic wood grain.
    if (pattern === "wood") {
      const grainPaint = Skia.Paint();
      grainPaint.setColor(Skia.Color(palette.surfaceDetail));
      grainPaint.setAlphaf(0.16);
      grainPaint.setStyle(Skia.PaintStyle.Stroke);
      grainPaint.setStrokeWidth(1);
      for (let i = 0; i < 64; i += 1) {
        const grainX = -halfW + Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1) * width;
        const grainY = -halfH + Math.abs((Math.cos(i * 78.233) * 19341.173) % 1) * height;
        const grainLength = 8 + (i % 6) * 5;
        canvas.drawLine(grainX, grainY, Math.min(halfW, grainX + grainLength), grainY + Math.sin(i * 0.7) * 1.5, grainPaint);
      }

      for (let i = 0; i < 5; i += 1) {
        const knotX = -halfW + width * (0.12 + i * 0.17);
        const knotY = -halfH + height * (0.18 + (i % 2) * 0.31);
        const knotPaint = Skia.Paint();
        knotPaint.setColor(Skia.Color(palette.surfaceDetail));
        knotPaint.setAlphaf(0.16);
        knotPaint.setStyle(Skia.PaintStyle.Stroke);
        knotPaint.setStrokeWidth(1);
        canvas.drawOval(Skia.XYWHRect(knotX - 7, knotY - 2.5, 14, 5), knotPaint);
        canvas.drawOval(Skia.XYWHRect(knotX - 3.5, knotY - 1.2, 7, 2.4), knotPaint);
      }
    }
  }
};

export const drawSkiaTrackRibbon: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const ribbonCtx = resolveTrackRibbonContext(world);
    if (!ribbonCtx) return;

    const { palette, left, right } = ribbonCtx;

    const path = Skia.Path.Make();
    path.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i < left.length; i += 1) {
      path.lineTo(left[i]!.x, left[i]!.y);
    }
    for (let i = right.length - 1; i >= 0; i -= 1) {
      path.lineTo(right[i]!.x, right[i]!.y);
    }
    path.close();

    const shadowPath = path.copy();
    shadowPath.offset(6, 8);
    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(palette.shadow));
    shadowPaint.setAlphaf(0.28);
    shadowPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawPath(shadowPath, shadowPaint);

    const edgePaint = Skia.Paint();
    edgePaint.setColor(Skia.Color(palette.trackEdge));
    edgePaint.setStyle(Skia.PaintStyle.Stroke);
    edgePaint.setStrokeWidth(10);
    canvas.drawPath(path, edgePaint);

    const fillPaint = Skia.Paint();
    fillPaint.setColor(Skia.Color(palette.track));
    fillPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawPath(path, fillPaint);

    const lightCurbPaint = Skia.Paint();
    lightCurbPaint.setColor(Skia.Color(palette.text));
    lightCurbPaint.setStyle(Skia.PaintStyle.Stroke);
    lightCurbPaint.setStrokeWidth(6);
    lightCurbPaint.setAlphaf(0.88);

    const accentCurbPaint = Skia.Paint();
    accentCurbPaint.setColor(Skia.Color(palette.accent));
    accentCurbPaint.setStyle(Skia.PaintStyle.Stroke);
    accentCurbPaint.setStrokeWidth(6);
    accentCurbPaint.setAlphaf(0.88);

    for (let i = 0; i < left.length - 1; i += 4) {
      const end = Math.min(i + 3, left.length - 1);
      const curbPaint = Math.floor(i / 4) % 2 === 0 ? lightCurbPaint : accentCurbPaint;
      canvas.drawLine(left[i]!.x, left[i]!.y, left[end]!.x, left[end]!.y, curbPaint);
      canvas.drawLine(right[i]!.x, right[i]!.y, right[end]!.x, right[end]!.y, curbPaint);
    }

    const centerPaint = Skia.Paint();
    centerPaint.setColor(Skia.Color(palette.text));
    centerPaint.setStyle(Skia.PaintStyle.Stroke);
    centerPaint.setStrokeWidth(2);
    centerPaint.setAlphaf(0.24);
    for (let i = 0; i < left.length; i += 8) {
      const start = Math.min(i + 1, left.length - 1);
      const end = Math.min(i + 5, left.length - 1);
      const startX = (left[start]!.x + right[start]!.x) / 2;
      const startY = (left[start]!.y + right[start]!.y) / 2;
      const endX = (left[end]!.x + right[end]!.x) / 2;
      const endY = (left[end]!.y + right[end]!.y) / 2;
      canvas.drawLine(startX, startY, endX, endY, centerPaint);
    }
  }
};

export const drawSkiaSkidMarks: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const pCtx = resolveRacingParticlePoolContext(world);
    if (!pCtx || pCtx.pool.skidMarks.length === 0) return;

    const { palette, pool } = pCtx;
    const softEdgePaint = Skia.Paint();
    softEdgePaint.setColor(Skia.Color(palette.outline));
    softEdgePaint.setStyle(Skia.PaintStyle.Stroke);

    const rubberPaint = Skia.Paint();
    rubberPaint.setColor(Skia.Color("#242424"));
    rubberPaint.setStyle(Skia.PaintStyle.Stroke);

    for (let i = 0; i < pool.skidMarks.length; i += 1) {
      const seg = pool.skidMarks[i]!;
      if (seg.alpha <= 0) continue;

      softEdgePaint.setAlphaf(seg.alpha * 0.42);
      softEdgePaint.setStrokeWidth(seg.width + 1.5);
      canvas.drawLine(seg.x1, seg.y1, seg.x2, seg.y2, softEdgePaint);

      rubberPaint.setAlphaf(seg.alpha);
      rubberPaint.setStrokeWidth(Math.max(1, seg.width * 0.58));
      canvas.drawLine(seg.x1, seg.y1, seg.x2, seg.y2, rubberPaint);
    }
  }
};

export const drawSkiaSmoke: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const pCtx = resolveRacingParticlePoolContext(world);
    if (!pCtx || pCtx.pool.smokeParticles.length === 0) return;

    const { pool } = pCtx;
    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color("#30343B"));
    shadowPaint.setStyle(Skia.PaintStyle.Fill);

    const bodyPaint = Skia.Paint();
    bodyPaint.setColor(Skia.Color("#B8BEC7"));
    bodyPaint.setStyle(Skia.PaintStyle.Fill);

    const highlightPaint = Skia.Paint();
    highlightPaint.setColor(Skia.Color("#FFFFFF"));
    highlightPaint.setStyle(Skia.PaintStyle.Fill);

    for (let i = 0; i < pool.smokeParticles.length; i += 1) {
      const p = pool.smokeParticles[i]!;
      if (p.alpha <= 0) continue;

      shadowPaint.setAlphaf(p.alpha * 0.18);
      canvas.drawCircle(p.x, p.y, p.radius * 1.3, shadowPaint);

      bodyPaint.setAlphaf(p.alpha * 0.42);
      canvas.drawCircle(p.x, p.y, p.radius * 0.82, bodyPaint);

      highlightPaint.setAlphaf(p.alpha * 0.3);
      canvas.drawCircle(p.x - p.radius * 0.18, p.y - p.radius * 0.18, p.radius * 0.38, highlightPaint);
    }
  }
};

export const drawSkiaCollisionSparks: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const pCtx = resolveRacingParticlePoolContext(world);
    if (!pCtx || pCtx.pool.activeSparkCount === 0) return;

    const { palette, pool } = pCtx;
    const sparkPaint = Skia.Paint();
    sparkPaint.setColor(Skia.Color(palette.danger));
    sparkPaint.setStyle(Skia.PaintStyle.Stroke);
    sparkPaint.setStrokeCap(Skia.StrokeCap.Round);

    const corePaint = Skia.Paint();
    corePaint.setColor(Skia.Color(palette.text));
    corePaint.setStyle(Skia.PaintStyle.Stroke);
    corePaint.setStrokeCap(Skia.StrokeCap.Round);

    for (let i = 0; i < pool.sparks.length; i += 1) {
      const spark = pool.sparks[i]!;
      const seg = computeSparkSegment(spark);
      if (!seg) continue;

      sparkPaint.setAlphaf(seg.alpha * 0.82);
      sparkPaint.setStrokeWidth(3);
      canvas.drawLine(seg.x1, seg.y1, seg.x2, seg.y2, sparkPaint);

      corePaint.setAlphaf(seg.alpha);
      corePaint.setStrokeWidth(1.1);
      canvas.drawLine(seg.x1, seg.y1, seg.x2, seg.y2, corePaint);
    }
  }
};

export const drawSkiaRacingCar: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skin = getRacingSkin(world);
    const params = extractActorParams(world, entity, skin.palette);
    if (params) {
      interpretSkia(canvas, skin.actorDrawer(params));
    }
  }
};

export const drawSkiaTrackWall: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skin = getRacingSkin(world);
    const params = extractWallParams(world, entity, skin.palette);
    if (params) {
      const wallDrawer = skin.wallDrawer ?? defaultWallDrawer;
      interpretSkia(canvas, wallDrawer(params));
    }
  }
};

export const drawSkiaCheckpoint: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skin = getRacingSkin(world);
    const checkpoint = world.getComponent(entity, "Checkpoint");
    if (!checkpoint) return;

    if (checkpoint.isFinish) {
      const { cells, halfW, halfH } = computeCheckpointGrid(checkpoint.width, checkpoint.height);
      const [color1, color2] = resolveFinishCheckers(skin);

      const shadowPaint = Skia.Paint();
      shadowPaint.setColor(Skia.Color(skin.palette.shadow));
      shadowPaint.setAlphaf(0.28);
      shadowPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(
        Skia.XYWHRect(-halfW + 4, -halfH + 5, checkpoint.width, checkpoint.height),
        shadowPaint
      );

      for (let i = 0; i < cells.length; i += 1) {
        const cell = cells[i]!;
        const tilePaint = Skia.Paint();
        tilePaint.setColor(Skia.Color(cell.colorIndex === 0 ? color1 : color2));
        tilePaint.setStyle(Skia.PaintStyle.Fill);
        canvas.drawRect(Skia.XYWHRect(cell.x, cell.y, cell.w, cell.h), tilePaint);
      }
      const strokePaint = Skia.Paint();
      strokePaint.setColor(Skia.Color(skin.palette.outline));
      strokePaint.setStyle(Skia.PaintStyle.Stroke);
      strokePaint.setStrokeWidth(2);
      canvas.drawRect(Skia.XYWHRect(-halfW, -halfH, checkpoint.width, checkpoint.height), strokePaint);
    } else {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(skin.palette.trackEdge));
      paint.setAlphaf(0.4);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(2);
      canvas.drawRect(Skia.XYWHRect(-checkpoint.width / 2, -checkpoint.height / 2, checkpoint.width, checkpoint.height), paint);
    }
  }
};

export const drawSkiaTrackZone: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skin = getRacingSkin(world);
    const params = extractZoneParams(world, entity, skin.palette);
    if (params) {
      const zoneDrawer = skin.zoneDrawers[params.surface] ?? defaultZoneDrawer;
      interpretSkia(canvas, zoneDrawer(params));
    }
  }
};

export const drawSkiaTrackObstacle: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const skin = getRacingSkin(world);
    const params = extractObstacleParams(world, entity, skin.palette);
    if (params) {
      const obstacleDrawer = skin.obstacleDrawers[params.kind] ?? defaultObstacleDrawer;
      interpretSkia(canvas, obstacleDrawer(params));
    }
  }
};
