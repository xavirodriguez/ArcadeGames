import type { ShapeDrawer, EffectDrawer, RenderContext } from "@tiny-aster/core";
import type { SkCanvas } from "@shopify/react-native-skia";
import type { OutrunComponentRegistry } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RoadData, ProjectedSegment, RoadSegmentSprite } from "../types/OutrunTypes";
import { projectRoad, createProjectionBuffer } from "./RoadProjection";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import {
  COAST_PALETTE,
  ScenarioPalette,
  scenarioHash,
  getScenarioPaletteAtZ,
  applyDayPhase
} from "./OutrunPalettes";
import { computePlayerCarGeometry, computeRacerProjection } from "./OutrunVisualHelpers";

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

function drawSkiaSprite(
  canvas: SkCanvas,
  paint: import("@shopify/react-native-skia").SkPaint,
  sp: RoadSegmentSprite,
  sx: number,
  sy: number,
  sw: number,
  roadWidth: number,
  lightsOn: boolean
): void {
  const scale = sw / (roadWidth * 0.4);
  if (scale < 0.04) return;

  canvas.save();
  canvas.translate(sx, sy);
  canvas.scale(scale, scale);

  paint.reset();
  paint.setAntiAlias(true);

  if (sp.kind === "palm") {
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(5);
    paint.setColor(Skia.Color("#5a4d41"));
    const trunk = Skia.Path.Make();
    trunk.moveTo(0, 0);
    trunk.quadTo(sp.side * 15, -40, sp.side * 10, -80);
    canvas.drawPath(trunk, paint);

    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#00b4d8"));
    const topX = sp.side * 10;
    const topY = -80;
    for (let f = 0; f < 6; f++) {
      const angle = (f / 6) * Math.PI * 2;
      const fx = topX + Math.cos(angle) * 35;
      const fy = topY + Math.sin(angle) * 20;
      const frond = Skia.Path.Make();
      frond.moveTo(topX, topY);
      frond.lineTo(fx, fy);
      frond.lineTo(topX + Math.cos(angle + 0.3) * 15, topY + Math.sin(angle + 0.3) * 10);
      frond.close();
      canvas.drawPath(frond, paint);
    }
  } else if (sp.kind === "lamp") {
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#d1d5db"));
    canvas.drawRect(Skia.XYWHRect(-2, -90, 4, 90), paint);
    canvas.drawRect(Skia.XYWHRect(-2, -90, sp.side * 22, 4), paint);

    paint.setColor(Skia.Color(lightsOn ? "#00f0ff" : "#fff8e7"));
    canvas.drawCircle(sp.side * 20, -88, 5, paint);
  } else if (sp.kind === "shrub") {
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#8d5b4c"));
    canvas.drawCircle(-10, -12, 14, paint);
    canvas.drawCircle(8, -16, 18, paint);
    canvas.drawCircle(0, -8, 12, paint);
  } else if (sp.kind === "wind_tower") {
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#edf2f4"));
    canvas.drawRect(Skia.XYWHRect(-2, -110, 4, 110), paint);

    canvas.save();
    canvas.translate(0, -110);
    paint.setColor(Skia.Color("#90e0ef"));
    for (let b = 0; b < 3; b++) {
      canvas.rotate((360 / 3), 0, 0);
      const blade = Skia.Path.Make();
      blade.moveTo(0, 0);
      blade.lineTo(-3, -35);
      blade.lineTo(3, -35);
      blade.close();
      canvas.drawPath(blade, paint);
    }
    canvas.restore();
  } else if (sp.kind === "cypress") {
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#2b2d42"));
    const cypress = Skia.Path.Make();
    cypress.moveTo(0, -100);
    cypress.quadTo(18, -30, 0, 0);
    cypress.quadTo(-18, -30, 0, -100);
    cypress.close();
    canvas.drawPath(cypress, paint);
  } else if (sp.kind === "wall") {
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#e0e0e0"));
    const wall = Skia.Path.Make();
    wall.moveTo(-35, 0);
    wall.lineTo(35, 0);
    wall.lineTo(30, -20);
    wall.lineTo(-30, -20);
    wall.close();
    canvas.drawPath(wall, paint);
  } else if (sp.kind === "chevron") {
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#111111"));
    canvas.drawRect(Skia.XYWHRect(-18, -45, 36, 30), paint);
    paint.setColor(Skia.Color("#d1d5db"));
    canvas.drawRect(Skia.XYWHRect(-2, -15, 4, 15), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(3);
    paint.setColor(Skia.Color("#ff5252"));
    const dir = sp.side > 0 ? 1 : -1;
    for (let c = -1; c <= 1; c++) {
      const cx = c * 10;
      const chevron = Skia.Path.Make();
      chevron.moveTo(cx - dir * 4, -38);
      chevron.lineTo(cx + dir * 4, -30);
      chevron.lineTo(cx - dir * 4, -22);
      canvas.drawPath(chevron, paint);
    }
  } else if (sp.kind === "billboard") {
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#6c757d"));
    canvas.drawRect(Skia.XYWHRect(-25, -60, 4, 60), paint);
    canvas.drawRect(Skia.XYWHRect(21, -60, 4, 60), paint);

    paint.setColor(Skia.Color("#1e293b"));
    canvas.drawRect(Skia.XYWHRect(-35, -95, 70, 38), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2);
    paint.setColor(Skia.Color("#00f0ff"));
    canvas.drawRect(Skia.XYWHRect(-35, -95, 70, 38), paint);
  } else if (sp.kind === "arch") {
    const archW = sw * 1.8;
    const archH = 100;
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#f8f9fa"));
    canvas.drawRect(Skia.XYWHRect(-archW, -archH, 12, archH), paint);
    canvas.drawRect(Skia.XYWHRect(archW - 12, -archH, 12, archH), paint);

    paint.setColor(Skia.Color("#0f172a"));
    canvas.drawRect(Skia.XYWHRect(-archW, -archH - 24, archW * 2, 24), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2);
    paint.setColor(Skia.Color("#ff5252"));
    canvas.drawRect(Skia.XYWHRect(-archW, -archH - 24, archW * 2, 24), paint);
  } else if (sp.kind === "banner") {
    const banW = sw * 1.4;
    const banH = 75;
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#334155"));
    canvas.drawRect(Skia.XYWHRect(-banW, -banH - 18, banW * 2, 18), paint);

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color("#ffe066"));
    canvas.drawRect(Skia.XYWHRect(-banW, -banH - 18, banW * 2, 18), paint);
  }

  canvas.restore();
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

    const basePalette = getScenarioPaletteAtZ(state.playerZ, roadData);
    const progress = state.playerZ / roadData.trackLength;
    const palette = applyDayPhase(basePalette, progress);

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

    // PASS 2.5: Parallax Clouds
    const cloudCount = 8;
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(palette.cloudColor));
    for (let c = 0; c < cloudCount; c++) {
      const h1 = scenarioHash("cloud_x", c);
      const h2 = scenarioHash("cloud_y", c);
      const h3 = scenarioHash("cloud_w", c);
      const baseCloudX = h1 * screenW;
      const cloudY = screenH * 0.08 + h2 * (screenH * 0.2);
      const cloudW = 50 + h3 * 60;
      const cloudH = cloudW * 0.35;
      const cloudX = ((baseCloudX + state.playerZ * 0.00005 * (c + 1) + state.playerX * 15) % screenW + screenW) % screenW;

      canvas.drawCircle(cloudX - cloudW * 0.2, cloudY, cloudH * 0.8, paint);
      canvas.drawCircle(cloudX, cloudY - cloudH * 0.2, cloudH, paint);
      canvas.drawCircle(cloudX + cloudW * 0.2, cloudY, cloudH * 0.7, paint);
    }

    // PASS 3: Scenario Horizon
    const horizonY = screenH * 0.45;
    if (palette.id === "coast") {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("#00b4d8"));
      canvas.drawRect(Skia.XYWHRect(0, horizonY - 18, screenW, 18), paint);

      const spacing = screenW / 6;
      const horizonOffset = ((state.playerZ * 0.0001) % spacing) + state.playerX * 20;
      paint.setColor(Skia.Color(palette.mountainBase));
      for (let b = -2; b < 8; b++) {
        const bx = b * spacing - horizonOffset;
        const bw = 18 + scenarioHash("coast_b", b) * 20;
        const bh = 15 + scenarioHash("coast_bh", b) * 35;
        canvas.drawRect(Skia.XYWHRect(bx, horizonY - bh, bw, bh), paint);
      }
    } else if (palette.id === "desert") {
      const hillSpacing = screenW / 3;
      const hillOffset = ((state.playerZ * 0.00012) % hillSpacing) + state.playerX * 22;
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(palette.mountainBase));

      const path = Skia.Path.Make();
      path.moveTo(0, horizonY);
      for (let h = -2; h < 6; h++) {
        const hx = h * hillSpacing - hillOffset;
        const hHeight = 30 + scenarioHash("desert_h", h) * 45;
        path.quadTo(hx + hillSpacing * 0.5, horizonY - hHeight, hx + hillSpacing, horizonY);
      }
      path.lineTo(screenW, horizonY);
      path.close();
      canvas.drawPath(path, paint);
    } else {
      const spacing = screenW / 5;
      const offset = ((state.playerZ * 0.00015) % spacing) + state.playerX * 25;
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Fill);
      for (let m = -2; m < 7; m++) {
        const mx = m * spacing - offset;
        const mh = 35 + scenarioHash("mtn_h", m) * 55;
        const mw = 30 + scenarioHash("mtn_w", m) * 25;
        paint.setColor(Skia.Color(palette.mountainBase));
        canvas.drawRect(Skia.XYWHRect(mx, horizonY - mh, mw, mh), paint);

        paint.setColor(Skia.Color(palette.mountainFacet));
        const path = Skia.Path.Make();
        path.moveTo(mx + mw, horizonY - mh);
        path.lineTo(mx + mw + 15, horizonY - mh + 20);
        path.lineTo(mx + mw + 15, horizonY);
        path.lineTo(mx + mw, horizonY);
        path.close();
        canvas.drawPath(path, paint);
      }
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

      // Inner curve asphalt darkening
      if (Math.abs(p.curve) > 1.5) {
        const innerSide = p.curve > 0 ? 1 : -1;
        const darkAlpha = Math.min(0.25, (Math.abs(p.curve) - 1.5) * 0.08);
        paint.reset();
        paint.setAntiAlias(true);
        paint.setStyle(Skia.PaintStyle.Fill);
        paint.setColor(Skia.Color(`rgba(0, 0, 0, ${darkAlpha})`));

        const darkPath = Skia.Path.Make();
        darkPath.moveTo(p.x1, p.y1);
        darkPath.lineTo(p.x1 + innerSide * p.w1, p.y1);
        darkPath.lineTo(p.x2 + innerSide * p.w2, Math.min(p.y2, maxy));
        darkPath.lineTo(p.x2, Math.min(p.y2, maxy));
        darkPath.close();
        canvas.drawPath(darkPath, paint);
      }

      if (Math.floor(p.index / rumbleLength) % 2 === 0) {
        const laneW1 = p.w1 * 0.04;
        const laneW2 = p.w2 * 0.04;
        fillTrapezoidSkia(canvas, paint, p.x1, p.y1, laneW1, p.x2, Math.min(p.y2, maxy), laneW2, palette.lane);
      }

      maxy = p.y2;
    }

    // Sprites Pass (Render back-to-front with ridge occlusion clipping)
    for (let i = count - 1; i >= 0; i--) {
      const p = projectionBuffer[i];
      const seg = roadData.segments[p.index];
      if (!seg || !seg.sprites || seg.sprites.length === 0) continue;

      for (const sp of seg.sprites) {
        let sx = p.x1;
        if (sp.kind !== "arch" && sp.kind !== "banner") {
          sx = p.x1 + sp.side * (p.w1 * sp.offset);
        }
        const sy = p.y1;
        const sw = p.w1;

        if (sy >= p.clip || sw < 2) continue;

        canvas.save();
        const clipRect = Skia.XYWHRect(0, 0, screenW, p.clip);
        canvas.clipRect(clipRect, Skia.ClipOp.Intersect, true);

        drawSkiaSprite(canvas, paint, sp, sx, sy, sw, config.roadWidth, palette.lightsOn);

        canvas.restore();
      }
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
    const geom = computePlayerCarGeometry(state, config, visualOffset);
    const paint = getPaint();

    canvas.save();

    // Car Shadow
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.3)"));
    canvas.drawOval(Skia.XYWHRect(geom.baseX - 30 * geom.carScale, geom.baseY + 2, 60 * geom.carScale, 16 * geom.carScale), paint);

    // Off-track Dust
    if (geom.isOffroad && state.speed > 0) {
      const roadData = world.getResource<RoadData>("RoadData");
      const basePal = roadData ? getScenarioPaletteAtZ(state.playerZ, roadData) : COAST_PALETTE;
      const dustColor = basePal.id === "coast" ? "#e2dfc8" : basePal.id === "desert" ? "#d0a67a" : "#8d99ae";

      paint.setColor(Skia.Color(dustColor));
      for (let d = 0; d < 12; d++) {
        const h1 = scenarioHash("dust_x", d + Math.floor(state.playerZ * 0.1));
        const h2 = scenarioHash("dust_y", d + Math.floor(state.playerZ * 0.1));
        const dx = (h1 - 0.5) * 45;
        const dy = h2 * 25 + 5;

        canvas.drawCircle(geom.baseX + (d % 2 === 0 ? -22 : 22) + dx, geom.baseY + dy, 2 + h1 * 2, paint);
      }
    }

    canvas.translate(geom.baseX, geom.baseY);
    canvas.rotate((geom.tiltAngle * 180) / Math.PI, 0, 0);
    canvas.scale(geom.carScale, geom.carScale);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#ff5252"));
    const body = Skia.Path.Make();
    body.moveTo(-28, 10);
    body.lineTo(-22, -18);
    body.lineTo(22, -18);
    body.lineTo(28, 10);
    body.close();
    canvas.drawPath(body, paint);

    paint.setColor(Skia.Color("#1d3557"));
    canvas.drawRect(Skia.XYWHRect(-14, -14, 28, 14), paint);

    paint.setColor(Skia.Color("#00f0ff"));
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

    const proj = computeRacerProjection(
      racer,
      state,
      roadData,
      config,
      projectionBuffer,
      PROJECTION_CAPACITY
    );
    if (!proj) return;

    const colors = ["#457b9d", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];
    const bodyColor = colors[racer.colorIndex % colors.length];
    const paint = getPaint();

    canvas.save();
    canvas.translate(proj.sx + proj.lateral, proj.sy);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(bodyColor));
    canvas.drawRect(Skia.XYWHRect(-proj.carW / 2, -proj.carH, proj.carW, proj.carH), paint);

    paint.setColor(Skia.Color("#222222"));
    canvas.drawRect(Skia.XYWHRect(-proj.carW * 0.3, -proj.carH * 0.85, proj.carW * 0.6, proj.carH * 0.4), paint);

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
