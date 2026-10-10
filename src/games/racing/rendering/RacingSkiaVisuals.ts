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
import type { RacingParticlePool } from "../systems/RacingParticleSystem";

export const drawSkiaTrackSurface: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const skin = getRacingSkin(world);
    const palette = skin.palette;
    const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
    const width = trackSpec?.width ?? 1600;
    const height = trackSpec?.height ?? 1000;
    const halfW = width / 2;
    const halfH = height / 2;

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
    }
  }
};

export const drawSkiaTrackRibbon: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const skin = getRacingSkin(world);
    const palette = skin.palette;
    const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
    if (!trackSpec || trackSpec.waypoints.length < 3) return;

    const { left, right } = buildTrackRibbon(trackSpec.waypoints);
    if (left.length === 0 || right.length === 0) return;

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
  }
};

export const drawSkiaSkidMarks: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const skin = getRacingSkin(world);
    const palette = skin.palette;
    const pool = world.getResource<RacingParticlePool>("RacingParticles");
    if (!pool || pool.skidMarks.length === 0) return;

    for (let i = 0; i < pool.skidMarks.length; i += 1) {
      const seg = pool.skidMarks[i]!;
      if (seg.alpha <= 0) continue;

      const paint = Skia.Paint();
      paint.setColor(Skia.Color(palette.outline));
      paint.setAlphaf(seg.alpha);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(seg.width);
      canvas.drawLine(seg.x1, seg.y1, seg.x2, seg.y2, paint);
    }
  }
};

export const drawSkiaSmoke: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const skin = getRacingSkin(world);
    const palette = skin.palette;
    const pool = world.getResource<RacingParticlePool>("RacingParticles");
    if (!pool || pool.smokeParticles.length === 0) return;

    for (let i = 0; i < pool.smokeParticles.length; i += 1) {
      const p = pool.smokeParticles[i]!;
      if (p.alpha <= 0) continue;

      const paint = Skia.Paint();
      paint.setColor(Skia.Color(palette.text));
      paint.setAlphaf(p.alpha);
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawCircle(p.x, p.y, p.radius, paint);
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
      const halfW = checkpoint.width / 2;
      const halfH = checkpoint.height / 2;
      const cols = 8;
      const rows = 2;
      const colW = checkpoint.width / cols;
      const rowH = checkpoint.height / rows;

      const [color1, color2] = skin.finishCheckers ?? ["#FFFFFF", "#5D4037"];

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const tilePaint = Skia.Paint();
          tilePaint.setColor(Skia.Color((r + c) % 2 === 0 ? color1 : color2));
          tilePaint.setStyle(Skia.PaintStyle.Fill);
          canvas.drawRect(Skia.XYWHRect(-halfW + c * colW, -halfH + r * rowH, colW, rowH), tilePaint);
        }
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
