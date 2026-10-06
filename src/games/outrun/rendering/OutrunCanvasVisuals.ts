import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import type { OutrunComponentRegistry } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RoadData, ProjectedSegment } from "../types/OutrunTypes";
import { projectRoad, createProjectionBuffer } from "./RoadProjection";
import { COAST_PALETTE, ScenarioPalette, scenarioHash } from "./OutrunPalettes";

/** Module-level reusable buffer — avoids per-frame allocations. */
const PROJECTION_CAPACITY = 400;
const projectionBuffer: ProjectedSegment[] = createProjectionBuffer(PROJECTION_CAPACITY);

function rumbleColor(index: number, rumbleLength: number, dark: string, light: string): string {
  return Math.floor(index / rumbleLength) % 2 === 0 ? dark : light;
}

function roadColor(index: number, rumbleLength: number, palette: ScenarioPalette): string {
  return Math.floor(index / rumbleLength) % 2 === 0 ? palette.roadDark : palette.roadLight;
}

function fillTrapezoid(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  w1: number,
  x2: number,
  y2: number,
  w2: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x1 + w1, y1);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x2 - w2, y2);
  ctx.closePath();
  ctx.fill();
}

export const drawOutrunRoad: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, _entity) {
    const state = world.getSingleton("RaceState");
    const roadData = world.getResource<RoadData>("RoadData");
    const config =
      world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

    if (!state || !roadData || roadData.segments.length === 0) return;

    const screenW = config.WIDTH;
    const screenH = config.HEIGHT;
    const rumbleLength = config.rumbleLength;

    const palette = COAST_PALETTE;

    // PASS 1: Sky Multi-Band Gradient (5 bands)
    const bandHeight = (screenH * 0.45) / palette.skyBands.length;
    for (let b = 0; b < palette.skyBands.length; b++) {
      ctx.fillStyle = palette.skyBands[b];
      ctx.fillRect(0, b * bandHeight, screenW, bandHeight + 1);
    }

    // PASS 2: Sun
    const sunRadius = 42;
    const sunY = screenH * 0.28;
    const sunX = screenW * 0.5 - state.playerX * 30;
    ctx.fillStyle = palette.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

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

      ctx.fillStyle = palette.mountainBase;
      ctx.beginPath();
      ctx.moveTo(px - peakSpacing * 0.6, horizonY);
      ctx.lineTo(px, peakY);
      ctx.lineTo(px + peakSpacing * 0.6, horizonY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = palette.mountainFacet;
      ctx.beginPath();
      ctx.moveTo(px, peakY);
      ctx.lineTo(px + peakSpacing * 0.6, horizonY);
      ctx.lineTo(px + (h2 - 0.5) * 20, horizonY);
      ctx.closePath();
      ctx.fill();
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

    // PASS 4: Speed lines at high speed
    const speedRatio = state.speed / config.maxSpeed;
    if (speedRatio > 0.7) {
      const lineCount = 12;
      const alpha = (speedRatio - 0.7) * 2.5;
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.6, alpha)})`;
      ctx.lineWidth = 2;
      const t = state.playerZ * 0.05;

      for (let sl = 0; sl < lineCount; sl++) {
        const angle = (sl / lineCount) * Math.PI * 2 + (sl % 2 === 0 ? t : -t) * 0.1;
        const x1 = screenW / 2 + Math.cos(angle) * (screenW * 0.2);
        const y1 = horizonY + Math.sin(angle) * (screenH * 0.15);
        const x2 = screenW / 2 + Math.cos(angle) * (screenW * 0.55);
        const y2 = horizonY + Math.sin(angle) * (screenH * 0.45);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    for (let i = 0; i < count; i++) {
      const p = projectionBuffer[i];
      if (p.p1z <= 0 && p.p2z <= 0) continue;
      if (p.y2 >= maxy) continue;

      const grass = rumbleColor(p.index, rumbleLength, palette.groundDark, palette.groundLight);
      fillTrapezoid(ctx, p.x1, p.y1, screenW, p.x2, Math.min(p.y2, maxy), screenW, grass);

      const rumbleW1 = p.w1 * 1.15;
      const rumbleW2 = p.w2 * 1.15;
      const rumble = rumbleColor(p.index, rumbleLength, palette.rumbleDark, palette.rumbleLight);
      fillTrapezoid(ctx, p.x1, p.y1, rumbleW1, p.x2, Math.min(p.y2, maxy), rumbleW2, rumble);

      const road = roadColor(p.index, rumbleLength, palette);
      fillTrapezoid(ctx, p.x1, p.y1, p.w1, p.x2, Math.min(p.y2, maxy), p.w2, road);

      if (Math.floor(p.index / rumbleLength) % 2 === 0) {
        const laneW1 = p.w1 * 0.04;
        const laneW2 = p.w2 * 0.04;
        fillTrapezoid(ctx, p.x1, p.y1, laneW1, p.x2, Math.min(p.y2, maxy), laneW2, palette.lane);
      }

      if (p.fog > 0.4) {
        const alpha = Math.min(0.8, (p.fog - 0.4) * 1.33);
        ctx.fillStyle = `rgba(135, 206, 235, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(p.x1 - p.w1 * 1.2, p.y1);
        ctx.lineTo(p.x1 + p.w1 * 1.2, p.y1);
        ctx.lineTo(p.x2 + p.w2 * 1.2, Math.min(p.y2, maxy));
        ctx.lineTo(p.x2 - p.w2 * 1.2, Math.min(p.y2, maxy));
        ctx.closePath();
        ctx.fill();
      }

      maxy = p.y2;
    }
  }
};

export const drawOutrunCar: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
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

    // Offroad vibration / high-speed suspension bounce
    const isOffroad = Math.abs(state.playerX) > 1.0;
    const bounceY = isOffroad
      ? (Math.sin(state.playerZ * 0.2) * 3)
      : (Math.sin(state.playerZ * 0.05) * 1.2 * speedRatio);

    // Steering roll/tilt
    const tiltAngle = state.playerX * 0.08 * speedRatio;

    const baseY = screenH - 80 + bounceY + vY;
    const baseX = screenW / 2 + state.playerX * 40 + vX;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate(tiltAngle);
    ctx.scale(carScale, carScale);

    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.moveTo(-28, 10);
    ctx.lineTo(-22, -18);
    ctx.lineTo(22, -18);
    ctx.lineTo(28, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1d3557";
    ctx.fillRect(-14, -14, 28, 14);

    ctx.fillStyle = "#a8dadc";
    ctx.fillRect(-12, -12, 24, 10);

    ctx.fillStyle = "#111";
    ctx.fillRect(-26, 6, 10, 8);
    ctx.fillRect(16, 6, 10, 8);

    ctx.fillStyle = "#f1faee";
    ctx.fillRect(-18, -16, 8, 4);
    ctx.fillRect(10, -16, 8, 4);

    ctx.restore();
  }
};

export const drawOutrunRacer: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
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

    ctx.save();
    ctx.translate(sx + lateral, sy);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-carW / 2, -carH, carW, carH);
    ctx.fillStyle = "#222";
    ctx.fillRect(-carW * 0.3, -carH * 0.85, carW * 0.6, carH * 0.4);
    ctx.restore();
  }
};

export const drawOutrunHud: EffectDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world) {
    const state = world.getSingleton("RaceState");
    if (!state) return;

    const config =
      world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

    const speedKmh = Math.round((state.speed / config.maxSpeed) * 280);
    const timeStr = state.lapTime.toFixed(1);
    const phase = state.racePhase ?? "racing";

    ctx.save();

    // Top HUD Bar with dark high-contrast backing plates (Contrast >= 4.5:1)
    const drawHudCard = (x: number, y: number, w: number, h: number, text: string, align: "left" | "right" = "left") => {
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      ctx.font = "bold 16px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = align;
      const tx = align === "left" ? x + 10 : x + w - 10;
      ctx.fillText(text, tx, y + 24);
    };

    drawHudCard(12, 12, 130, 36, `${speedKmh} KM/H`);
    drawHudCard(150, 12, 130, 36, `TIME ${timeStr}s`);
    drawHudCard(config.WIDTH - 122, 12, 110, 36, `POS ${state.position}`, "right");

    // Countdown or Finish Center Overlay
    if (phase === "countdown") {
      const cd = Math.ceil(state.countdownTime ?? 3);
      const cdText = cd > 0 ? `${cd}` : "GO!";
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.fillRect(config.WIDTH / 2 - 90, config.HEIGHT / 2 - 50, 180, 100);
      ctx.strokeStyle = "#ff007f";
      ctx.lineWidth = 2;
      ctx.strokeRect(config.WIDTH / 2 - 90, config.HEIGHT / 2 - 50, 180, 100);

      ctx.font = "bold 42px monospace";
      ctx.fillStyle = "#00f0ff";
      ctx.textAlign = "center";
      ctx.fillText(cdText, config.WIDTH / 2, config.HEIGHT / 2 + 14);
    } else if (phase === "finished" || state.isGameOver) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(config.WIDTH / 2 - 120, config.HEIGHT / 2 - 50, 240, 100);
      ctx.strokeStyle = "#ffe066";
      ctx.lineWidth = 2;
      ctx.strokeRect(config.WIDTH / 2 - 120, config.HEIGHT / 2 - 50, 240, 100);

      ctx.font = "bold 28px monospace";
      ctx.fillStyle = "#ffe066";
      ctx.textAlign = "center";
      ctx.fillText("FINISH!", config.WIDTH / 2, config.HEIGHT / 2 + 10);
    }

    ctx.restore();
  }
};
