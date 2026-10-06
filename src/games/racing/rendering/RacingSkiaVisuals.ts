import type { ShapeDrawer, World } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";
import { Skia } from "../../shared/rendering/SkiaContext";
import { getRacingPalette } from "./RacingPalette";
import { buildTrackRibbon } from "./TrackRibbonGeometry";
import type { RacingParticlePool } from "../systems/RacingParticleSystem";

export const drawSkiaTrackSurface: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
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

    const theme = trackSpec?.theme ?? "breakfast";
    if (theme === "billiard") {
      for (let x = -halfW; x < halfW; x += 40) {
        canvas.drawLine(x, -halfH, x + height, halfH, detailPaint);
      }
    } else {
      for (let y = -halfH + 25; y < halfH; y += 35) {
        canvas.drawLine(-halfW, y, halfW, y, detailPaint);
      }
    }
  }
};

export const drawSkiaTrackRibbon: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
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
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
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
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
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
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const render = world.getComponent(entity, "Render");
    const transform = world.getComponent(entity, "Transform");
    if (!render) return;

    const size = render.size ?? 16;
    const isPlayer = world.hasComponent(entity, "LocalPlayer");
    const bodyColor = isPlayer ? palette.player : palette.rival;
    const highlightColor = isPlayer ? palette.playerHighlight : palette.rivalHighlight;
    const rotation = transform?.rotation ?? 0;

    const input = world.getComponent(entity, "Input");
    const boosting = input?.actions.boost === true;
    const time = world.getResource<number>("RacingTime") ?? 0;

    canvas.save();

    if (boosting) {
      const oscillation = Math.sin(time * 30) * 0.15 + Math.cos(time * 47) * 0.1;
      const flameLen = size * (1.5 + oscillation);

      const flamePath = Skia.Path.Make();
      flamePath.moveTo(-size * 0.9, 0);
      flamePath.lineTo(-size * 0.9 - flameLen, -size * 0.4);
      flamePath.lineTo(-size * 0.9 - flameLen, size * 0.4);
      flamePath.close();

      const outerFlame = Skia.Paint();
      outerFlame.setColor(Skia.Color(palette.danger));
      outerFlame.setStyle(Skia.PaintStyle.Fill);
      canvas.drawPath(flamePath, outerFlame);

      const innerPath = Skia.Path.Make();
      innerPath.moveTo(-size * 0.9, 0);
      innerPath.lineTo(-size * 0.9 - flameLen * 0.4, -size * 0.12);
      innerPath.lineTo(-size * 0.9 - flameLen * 0.4, size * 0.12);
      innerPath.close();

      const coreFlame = Skia.Paint();
      coreFlame.setColor(Skia.Color(palette.accent));
      coreFlame.setStyle(Skia.PaintStyle.Fill);
      canvas.drawPath(innerPath, coreFlame);
    }

    canvas.save();
    canvas.rotate((-rotation * 180) / Math.PI, 0, 0);
    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(palette.shadow));
    shadowPaint.setAlphaf(0.35);
    shadowPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawOval(Skia.XYWHRect(4 - size * 1.05, 5 - size * 0.6, size * 2.1, size * 1.2), shadowPaint);
    canvas.restore();

    const wheelPaint = Skia.Paint();
    wheelPaint.setColor(Skia.Color(palette.outline));
    wheelPaint.setStyle(Skia.PaintStyle.Fill);

    const wW = size * 0.45;
    const wH = size * 0.22;
    canvas.drawRect(Skia.XYWHRect(-size * 0.7, -size * 0.6, wW, wH), wheelPaint);
    canvas.drawRect(Skia.XYWHRect(size * 0.25, -size * 0.6, wW, wH), wheelPaint);
    canvas.drawRect(Skia.XYWHRect(-size * 0.7, size * 0.38, wW, wH), wheelPaint);
    canvas.drawRect(Skia.XYWHRect(size * 0.25, size * 0.38, wW, wH), wheelPaint);

    const bodyPaint = Skia.Paint();
    bodyPaint.setColor(Skia.Color(bodyColor));
    bodyPaint.setStyle(Skia.PaintStyle.Fill);
    const bodyRRect = Skia.RRectXY(
      Skia.XYWHRect(-size * 0.9, -size * 0.5, size * 1.8, size * 1.0),
      size * 0.3,
      size * 0.3
    );
    canvas.drawRRect(bodyRRect, bodyPaint);

    const strokePaint = Skia.Paint();
    strokePaint.setColor(Skia.Color(palette.outline));
    strokePaint.setStyle(Skia.PaintStyle.Stroke);
    strokePaint.setStrokeWidth(1.5);
    canvas.drawRRect(bodyRRect, strokePaint);

    const hlPaint = Skia.Paint();
    hlPaint.setColor(Skia.Color(highlightColor));
    hlPaint.setStyle(Skia.PaintStyle.Fill);
    const hlRRect = Skia.RRectXY(
      Skia.XYWHRect(-size * 0.4, -size * 0.35, size * 0.8, size * 0.7),
      size * 0.2,
      size * 0.2
    );
    canvas.drawRRect(hlRRect, hlPaint);

    const glassPaint = Skia.Paint();
    glassPaint.setColor(Skia.Color(palette.outline));
    glassPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-size * 0.15, -size * 0.3, size * 0.35, size * 0.6), glassPaint);

    if (isPlayer) {
      const stripePaint = Skia.Paint();
      stripePaint.setColor(Skia.Color(palette.accent));
      stripePaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(-size * 0.85, -size * 0.08, size * 0.7, size * 0.16), stripePaint);
    } else {
      const stripePaint = Skia.Paint();
      stripePaint.setColor(Skia.Color(palette.accent));
      stripePaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(-size * 0.7, -size * 0.42, size * 1.2, size * 0.08), stripePaint);
      canvas.drawRect(Skia.XYWHRect(-size * 0.7, size * 0.34, size * 1.2, size * 0.08), stripePaint);
    }

    const lightPaint = Skia.Paint();
    lightPaint.setColor(Skia.Color(palette.accent));
    lightPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(size * 0.85, -size * 0.3, size * 0.12, lightPaint);
    canvas.drawCircle(size * 0.85, size * 0.3, size * 0.12, lightPaint);

    const tailPaint = Skia.Paint();
    tailPaint.setColor(Skia.Color(palette.danger));
    tailPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-size * 0.9, -size * 0.35, size * 0.08, size * 0.15), tailPaint);
    canvas.drawRect(Skia.XYWHRect(-size * 0.9, size * 0.2, size * 0.08, size * 0.15), tailPaint);

    canvas.restore();
  }
};

export const drawSkiaTrackWall: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const render = world.getComponent(entity, "Render");
    const wall = world.getComponent(entity, "RacingWall");
    if (!render || !wall) return;

    const halfW = wall.width / 2;
    const halfH = wall.height / 2;
    const depth = 5;

    // Soft drop shadow
    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(palette.shadow));
    shadowPaint.setAlphaf(0.3);
    shadowPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-halfW + 5, -halfH + 6, wall.width, wall.height), shadowPaint);

    // Front face
    const fillPaint = Skia.Paint();
    fillPaint.setColor(Skia.Color(palette.trackEdge));
    fillPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-halfW, -halfH, wall.width, wall.height), fillPaint);

    // Top face highlight
    const topPaint = Skia.Paint();
    topPaint.setColor(Skia.Color(palette.track));
    topPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawRect(Skia.XYWHRect(-halfW, -halfH, wall.width, 2.5), topPaint);

    // Outline
    const strokePaint = Skia.Paint();
    strokePaint.setColor(Skia.Color(palette.outline));
    strokePaint.setStyle(Skia.PaintStyle.Stroke);
    strokePaint.setStrokeWidth(1.5);
    canvas.drawRect(Skia.XYWHRect(-halfW, -halfH, wall.width, wall.height), strokePaint);
  }
};

export const drawSkiaCheckpoint: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const checkpoint = world.getComponent(entity, "Checkpoint");
    if (!checkpoint) return;

    if (checkpoint.isFinish) {
      const halfW = checkpoint.width / 2;
      const halfH = checkpoint.height / 2;
      const cols = 8;
      const rows = 2;
      const colW = checkpoint.width / cols;
      const rowH = checkpoint.height / rows;

      const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
      const isBilliard = trackSpec?.theme === "billiard";
      const color1 = isBilliard ? "#FFFFF0" : "#FFFFFF";
      const color2 = isBilliard ? "#1B5E20" : "#5D4037";

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const tilePaint = Skia.Paint();
          tilePaint.setColor(Skia.Color((r + c) % 2 === 0 ? color1 : color2));
          tilePaint.setStyle(Skia.PaintStyle.Fill);
          canvas.drawRect(Skia.XYWHRect(-halfW + c * colW, -halfH + r * rowH, colW, rowH), tilePaint);
        }
      }
      const strokePaint = Skia.Paint();
      strokePaint.setColor(Skia.Color(palette.outline));
      strokePaint.setStyle(Skia.PaintStyle.Stroke);
      strokePaint.setStrokeWidth(2);
      canvas.drawRect(Skia.XYWHRect(-halfW, -halfH, checkpoint.width, checkpoint.height), strokePaint);
    } else {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(palette.trackEdge));
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
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const data = world.getComponent(entity, "TrackZoneData");
    const render = world.getComponent(entity, "Render");
    if (!data && !render) return;

    const width = data?.width ?? 140;
    const height = data?.height ?? 140;
    const surface = data?.surface ?? "water";
    const halfW = width / 2;
    const halfH = height / 2;

    if (surface === "water") {
      const fillPaint = Skia.Paint();
      fillPaint.setColor(Skia.Color("#FFFDF0"));
      fillPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawOval(Skia.XYWHRect(-halfW, -halfH, width, height), fillPaint);

      const strokePaint = Skia.Paint();
      strokePaint.setColor(Skia.Color(palette.player));
      strokePaint.setStyle(Skia.PaintStyle.Stroke);
      strokePaint.setStrokeWidth(2);
      canvas.drawOval(Skia.XYWHRect(-halfW, -halfH, width, height), strokePaint);
    } else if (surface === "oil") {
      const fillPaint = Skia.Paint();
      fillPaint.setColor(Skia.Color("rgba(25, 25, 30, 0.75)"));
      fillPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawOval(Skia.XYWHRect(-halfW, -halfH, width, height), fillPaint);
    } else {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(palette.danger));
      paint.setAlphaf(0.35);
      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawRect(Skia.XYWHRect(-halfW, -halfH, width, height), paint);
    }
  }
};

export const drawSkiaTrackObstacle: ShapeDrawer<SkCanvas, RacingComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const data = world.getComponent(entity, "TrackObstacleData");
    const render = world.getComponent(entity, "Render");
    if (!data && !render) return;

    const radius = data?.radius ?? render?.size ?? 30;
    const kind = data?.kind ?? "bowl";

    // Drop shadow
    const shadowPaint = Skia.Paint();
    shadowPaint.setColor(Skia.Color(palette.shadow));
    shadowPaint.setAlphaf(0.32);
    shadowPaint.setStyle(Skia.PaintStyle.Fill);
    canvas.drawCircle(4, 5, radius, shadowPaint);

    if (kind === "bowl") {
      const bowlPaint = Skia.Paint();
      bowlPaint.setColor(Skia.Color("#F8FAFC"));
      bowlPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawCircle(0, 0, radius, bowlPaint);

      const milkPaint = Skia.Paint();
      milkPaint.setColor(Skia.Color("#FFFEE0"));
      milkPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawCircle(0, 0, radius * 0.8, milkPaint);
    } else {
      const fillPaint = Skia.Paint();
      fillPaint.setColor(Skia.Color(palette.obstacle));
      fillPaint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawCircle(0, 0, radius, fillPaint);

      const strokePaint = Skia.Paint();
      strokePaint.setColor(Skia.Color(palette.outline));
      strokePaint.setStyle(Skia.PaintStyle.Stroke);
      strokePaint.setStrokeWidth(2);
      canvas.drawCircle(0, 0, radius, strokePaint);
    }
  }
};
