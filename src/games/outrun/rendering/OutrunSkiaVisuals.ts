import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import type { OutrunComponentRegistry } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RoadData, ProjectedSegment } from "../types/OutrunTypes";
import { projectRoad, createProjectionBuffer } from "./RoadProjection";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";

const PROJECTION_CAPACITY = 400;
const projectionBuffer: ProjectedSegment[] = createProjectionBuffer(PROJECTION_CAPACITY);

const COLORS = {
  sky: "#5c94fc",
  grassDark: "#10a010",
  grassLight: "#10c010",
  rumbleDark: "#cc0000",
  rumbleLight: "#ffffff",
  roadDark: "#444444",
  roadLight: "#666666",
  lane: "#ffffff"
};

function rumbleColor(index: number, rumbleLength: number, dark: string, light: string): string {
  return Math.floor(index / rumbleLength) % 2 === 0 ? dark : light;
}

function roadColor(index: number, rumbleLength: number): string {
  return Math.floor(index / rumbleLength) % 2 === 0 ? COLORS.roadDark : COLORS.roadLight;
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

export const drawSkiaOutrunRoad: ShapeDrawer<import("@shopify/react-native-skia").SkCanvas, OutrunComponentRegistry> = {
  draw(canvas, world, _entity) {
    const state = world.getSingleton("RaceState");
    const roadData = world.getResource<RoadData>("RoadData");
    const config =
      world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

    if (!state || !roadData || roadData.segments.length === 0) return;

    const screenW = config.WIDTH;
    const screenH = config.HEIGHT;
    const rumbleLength = config.rumbleLength;
    const paint = getPaint();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(COLORS.sky));
    canvas.drawRect(Skia.XYWHRect(0, 0, screenW, screenH), paint);

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

    for (let i = count - 1; i >= 0; i--) {
      const p = projectionBuffer[i];
      if (p.p1z <= 0 && p.p2z <= 0) continue;

      const grass = rumbleColor(p.index, rumbleLength, COLORS.grassDark, COLORS.grassLight);
      fillTrapezoidSkia(canvas, paint, p.x1, p.y1, screenW, p.x2, p.y2, screenW, grass);

      const rumbleW1 = p.w1 * 1.15;
      const rumbleW2 = p.w2 * 1.15;
      const rumble = rumbleColor(p.index, rumbleLength, COLORS.rumbleDark, COLORS.rumbleLight);
      fillTrapezoidSkia(canvas, paint, p.x1, p.y1, rumbleW1, p.x2, p.y2, rumbleW2, rumble);

      const road = roadColor(p.index, rumbleLength);
      fillTrapezoidSkia(canvas, paint, p.x1, p.y1, p.w1, p.x2, p.y2, p.w2, road);

      if (Math.floor(p.index / rumbleLength) % 2 === 0) {
        const laneW1 = p.w1 * 0.04;
        const laneW2 = p.w2 * 0.04;
        fillTrapezoidSkia(canvas, paint, p.x1, p.y1, laneW1, p.x2, p.y2, laneW2, COLORS.lane);
      }
    }
  }
};

export const drawSkiaOutrunCar: ShapeDrawer<import("@shopify/react-native-skia").SkCanvas, OutrunComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const state = world.getSingleton("RaceState");
    if (!state) return;

    const config =
      world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;
    const screenW = config.WIDTH;
    const screenH = config.HEIGHT;
    const carScale = 1.0 + (state.speed / config.maxSpeed) * 0.08;
    const baseY = screenH - 80;
    const baseX = screenW / 2 + state.playerX * 40;
    const paint = getPaint();

    canvas.save();
    canvas.translate(baseX, baseY);
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

export const drawSkiaOutrunRacer: ShapeDrawer<import("@shopify/react-native-skia").SkCanvas, OutrunComponentRegistry> = {
  draw(canvas, world, entity) {
    const racer = world.getComponent(entity, "Racer");
    const render = world.getComponent(entity, "Render");
    if (!racer || !racer.active || !render || !render.visible) return;
  }
};

export const drawSkiaOutrunHud: EffectDrawer<import("@shopify/react-native-skia").SkCanvas, OutrunComponentRegistry> = {
  draw(_canvas, world) {
    const state = world.getSingleton("RaceState");
    if (!state) return;
  }
};
