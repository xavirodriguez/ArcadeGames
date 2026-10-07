import type { ShapeDrawer, EffectDrawer, RenderContext } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import type { OutrunComponentRegistry } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RoadData, ProjectedSegment } from "../types/OutrunTypes";
import { projectRoad, createProjectionBuffer } from "./RoadProjection";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import { ScenarioPalette, scenarioHash, getScenarioPaletteAtZ } from "./OutrunPalettes";

const PROJECTION_CAPACITY = 400;
const projectionBuffer: ProjectedSegment[] = createProjectionBuffer(PROJECTION_CAPACITY);

function rumbleColor(index: number, rumbleLength: number, dark: string, light: string): string {
  return Math.floor(index / rumbleLength) % 2 === 0 ? dark : light;
}

function roadColor(index: number, rumbleLength: number, palette: ScenarioPalette): string {
  return Math.floor(index / rumbleLength) % 2 === 0 ? palette.roadDark : palette.roadLight;
}

function fillTrapezoidSkia(
  canvas: import("@shopify/react-native-skia").SkCanvas,
  paint: import("@shopify/react-native-skia").SkPaint,
  x1: number,
  y1: number,
  w1: number,
  x2: number,
  y2: number,
  w2: number,
  color: string
): void {
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Fill);
  paint.setColor(Skia.Color(color));

  const path = Skia.Path.Make();
  path.moveTo(x1 - w1, y1);
  path.lineTo(x1 + w1, y1);
  path.lineTo(x2 + w2, y2);
  path.lineTo(x2 - w2, y2);
  path.close();
  canvas.drawPath(path, paint);
}

export const drawSkiaOutrunRoad: ShapeDrawer<RenderContext, OutrunComponentRegistry> = {
  draw(ctx, world, _entity) {
    const canvas = ctx as unknown as SkCanvas;
    const state = world.getSingleton("RaceState");
    const roadData = world.getResource<RoadData>("RoadData");
    const config =
      world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

    if (!state || !roadData || roadData.segments.length === 0) return;

    const screenW = config.WIDTH;
    const screenH = config.HEIGHT;
    const rumbleLength = config.rumbleLength;
    const paint = getPaint();

    const palette = getScenarioPaletteAtZ(state.playerZ, roadData);

    // PASS 1: Sky Multi-Band Gradient
    const bandHeight = (screenH * 0.45) / palette.skyBands.length;
    for (let b = 0; b < palette.skyBands.length; b++) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(palette.skyBands[b]));
      canvas.drawRect(Skia.XYWHRect(0, b * bandHeight, screenW, bandHeight + 1), paint);
    }

    // PASS 2: Sun
    const sunRadius = 42;
    const sunY = screenH * 0.28;
    const sunX = screenW * 0.5 - state.playerX * 30;
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.sun));
    canvas.drawCircle(sunX, sunY, sunRadius, paint);

    // PASS 3: Parallax Faceted Mountains
    const horizonY = screenH * 0.45;
    const numPeaks = 12;
    const peakSpacing = screenW / 4;
    const mountainOffsetX = ((state.playerZ * 0.00015) % peakSpacing) + state.playerX * 25;

    for (let m = -2; m < numPeaks + 2; m++) {
      const h1 = scenarioHash(palette.id, m);
      const h2 = scenarioHash(palette.id, m + 100);
      const px = m * peakSpacing - mountainOffsetX;
      const peakY = horizonY - 40 - h1 * 60;

      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(palette.mountainBase));
      const path1 = Skia.Path.Make();
      path1.moveTo(px - peakSpacing * 0.6, horizonY);
      path1.lineTo(px, peakY);
      path1.lineTo(px + peakSpacing * 0.6, horizonY);
      path1.close();
      canvas.drawPath(path1, paint);

      paint.setColor(Skia.Color(palette.mountainFacet));
      const path2 = Skia.Path.Make();
      path2.moveTo(px, peakY);
      path2.lineTo(px + peakSpacing * 0.6, horizonY);
      path2.lineTo(px + (h2 - 0.5) * 20, horizonY);
      path2.close();
      canvas.drawPath(path2, paint);
    }

    const count = projectRoad(
      roadData.segments,
      state.playerZ,
      state.playerX,
      config.cameraHeight,
      config.cameraDepth,
      config.roadWidth,
      Math.min(config.drawDistance, PROJECTION_CAPACITY),
      screenW,
      screenH,
      projectionBuffer
    );

    let maxy = screenH;

    for (let i = 0; i < count; i++) {
      const p = projectionBuffer[i];
      if (p.p1z <= 0 && p.p2z <= 0) continue;
      if (p.y2 >= maxy) continue;

      const grass = rumbleColor(p.index, rumbleLength, palette.groundDark, palette.groundLight);
      fillTrapezoidSkia(canvas, paint, p.x1, p.y1, screenW, p.x2, Math.min(p.y2, maxy), screenW, grass);

      const rumbleW1 = p.w1 * 1.15;
      const rumbleW2 = p.w2 * 1.15;
      const rumble = rumbleColor(p.index, rumbleLength, palette.rumbleDark, palette.rumbleLight);
      fillTrapezoidSkia(canvas, paint, p.x1, p.y1, rumbleW1, p.x2, Math.min(p.y2, maxy), rumbleW2, rumble);

      const road = roadColor(p.index, rumbleLength, palette);
      fillTrapezoidSkia(canvas, paint, p.x1, p.y1, p.w1, p.x2, Math.min(p.y2, maxy), p.w2, road);

      if (Math.floor(p.index / rumbleLength) % 2 === 0) {
        const laneW1 = p.w1 * 0.04;
        const laneW2 = p.w2 * 0.04;
        fillTrapezoidSkia(canvas, paint, p.x1, p.y1, laneW1, p.x2, Math.min(p.y2, maxy), laneW2, palette.lane);
      }

      maxy = p.y2;
    }
  }
};

export const drawSkiaOutrunCar: ShapeDrawer<RenderContext, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    const canvas = ctx as unknown as SkCanvas;
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const state = world.getSingleton("RaceState");
    if (!state) return;

    const config =
      world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

    const visualOffset = world.getComponent(entity, "VisualOffset");
    const vX = visualOffset?.offsetX ?? 0;
    const vY = visualOffset?.offsetY ?? 0;

    const screenW = config.WIDTH;
    const screenH = config.HEIGHT;
    const speedRatio = state.speed / config.maxSpeed;
    const carScale = 1.0 + speedRatio * 0.08;

    const isOffroad = Math.abs(state.playerX) > 1.0;
    const bounceY = isOffroad
      ? (Math.sin(state.playerZ * 0.2) * 3)
      : (Math.sin(state.playerZ * 0.05) * 1.2 * speedRatio);

    const tiltAngle = state.playerX * 0.08 * speedRatio;

    const baseY = screenH - 80 + bounceY + vY;
    const baseX = screenW / 2 + state.playerX * 40 + vX;
    const paint = getPaint();

    canvas.save();
    canvas.translate(baseX, baseY);
    canvas.rotate(tiltAngle, 0, 0);
    canvas.scale(carScale, carScale);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#e63946"));
    const body = Skia.Path.Make();
    body.moveTo(-28, 10);
    body.lineTo(-22, -18);
    body.lineTo(22, -18);
    body.lineTo(28, 10);
    body.close();
    canvas.drawPath(body, paint);

    paint.setColor(Skia.Color("#1d3557"));
    canvas.drawRect(Skia.XYWHRect(-14, -14, 28, 14), paint);

    paint.setColor(Skia.Color("#a8dadc"));
    canvas.drawRect(Skia.XYWHRect(-12, -12, 24, 10), paint);

    paint.setColor(Skia.Color("#111111"));
    canvas.drawRect(Skia.XYWHRect(-26, 6, 10, 8), paint);
    canvas.drawRect(Skia.XYWHRect(16, 6, 10, 8), paint);

    paint.setColor(Skia.Color("#f1faee"));
    canvas.drawRect(Skia.XYWHRect(-18, -16, 8, 4), paint);
    canvas.drawRect(Skia.XYWHRect(10, -16, 8, 4), paint);

    canvas.restore();
  }
};

export const drawSkiaOutrunRacer: ShapeDrawer<RenderContext, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    const canvas = ctx as unknown as SkCanvas;
    const racer = world.getComponent(entity, "Racer");
    const render = world.getComponent(entity, "Render");
    if (!racer || !racer.active || !render || !render.visible) return;

    const state = world.getSingleton("RaceState");
    const roadData = world.getResource<RoadData>("RoadData");
    const config =
      world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;
    if (!state || !roadData) return;

    const count = projectRoad(
      roadData.segments,
      state.playerZ,
      state.playerX,
      config.cameraHeight,
      config.cameraDepth,
      config.roadWidth,
      Math.min(config.drawDistance, PROJECTION_CAPACITY),
      config.WIDTH,
      config.HEIGHT,
      projectionBuffer
    );

    const trackLength = roadData.trackLength;
    let relZ = racer.z - state.playerZ;
    if (relZ > trackLength / 2) relZ -= trackLength;
    if (relZ < -trackLength / 2) relZ += trackLength;
    if (relZ <= 0 || relZ > config.drawDistance * config.segmentLength) return;

    let best: ProjectedSegment | null = null;
    for (let i = 0; i < count; i++) {
      const p = projectionBuffer[i];
      if (p.p1z <= relZ && p.p2z >= relZ) {
        best = p;
        break;
      }
    }
    if (!best) return;

    const t = (relZ - best.p1z) / Math.max(0.001, best.p2z - best.p1z);
    const sx = best.x1 + (best.x2 - best.x1) * t;
    const sy = best.y1 + (best.y2 - best.y1) * t;
    const sw = best.w1 + (best.w2 - best.w1) * t;

    const lateral = racer.lateralX * sw;
    const carW = sw * 0.35;
    const carH = carW * 0.6;

    if (sy > config.HEIGHT || sy >= best.clip || carW < 2) return;

    const colors = ["#457b9d", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];
    const bodyColor = colors[racer.colorIndex % colors.length];
    const paint = getPaint();

    canvas.save();
    canvas.translate(sx + lateral, sy);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(bodyColor));
    canvas.drawRect(Skia.XYWHRect(-carW / 2, -carH, carW, carH), paint);

    paint.setColor(Skia.Color("#222222"));
    canvas.drawRect(Skia.XYWHRect(-carW * 0.3, -carH * 0.85, carW * 0.6, carH * 0.4), paint);

    canvas.restore();
  }
};

export const drawSkiaOutrunHud: EffectDrawer<RenderContext, OutrunComponentRegistry> = {
  draw(ctx, world) {
    const canvas = ctx as unknown as SkCanvas;
    const state = world.getSingleton("RaceState");
    if (!state) return;

    const config =
      world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

    const speedKmh = Math.round((state.speed / config.maxSpeed) * 280);
    const timeStr = state.lapTime.toFixed(1);
    const phase = state.racePhase ?? "racing";
    const paint = getPaint();

    canvas.save();

    const drawSkiaCard = (x: number, y: number, w: number, h: number, _text: string) => {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("rgba(15, 23, 42, 0.85)"));
      canvas.drawRect(Skia.XYWHRect(x, y, w, h), paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(1.5);
      paint.setColor(Skia.Color("#00f0ff"));
      canvas.drawRect(Skia.XYWHRect(x, y, w, h), paint);
    };

    drawSkiaCard(12, 12, 130, 36, `${speedKmh} KM/H`);
    drawSkiaCard(150, 12, 130, 36, `TIME ${timeStr}s`);
    drawSkiaCard(config.WIDTH - 122, 12, 110, 36, `POS ${state.position}`);

    if (phase === "countdown") {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("rgba(15, 23, 42, 0.75)"));
      canvas.drawRect(Skia.XYWHRect(config.WIDTH / 2 - 90, config.HEIGHT / 2 - 50, 180, 100), paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(2);
      paint.setColor(Skia.Color("#ff007f"));
      canvas.drawRect(Skia.XYWHRect(config.WIDTH / 2 - 90, config.HEIGHT / 2 - 50, 180, 100), paint);
    } else if (phase === "finished" || state.isGameOver) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("rgba(15, 23, 42, 0.85)"));
      canvas.drawRect(Skia.XYWHRect(config.WIDTH / 2 - 120, config.HEIGHT / 2 - 50, 240, 100), paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setStrokeWidth(2);
      paint.setColor(Skia.Color("#ffe066"));
      canvas.drawRect(Skia.XYWHRect(config.WIDTH / 2 - 120, config.HEIGHT / 2 - 50, 240, 100), paint);
    }

    canvas.restore();
  }
};
