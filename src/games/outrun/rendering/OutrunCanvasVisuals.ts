import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import type { OutrunComponentRegistry } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RoadData, ProjectedSegment, RoadSegmentSprite } from "../types/OutrunTypes";
import { projectRoad } from "./RoadProjection";
import {
  COAST_PALETTE,
  scenarioHash,
  getScenarioPaletteAtZ
} from "./OutrunPalettes";
import {
  PROJECTION_CAPACITY,
  projectionBuffer,
  rumbleColor,
  roadColor,
  resolveOutrunFrame,
  resolveOutrunCarFrame,
  resolveOutrunRacerFrame,
  resolveOutrunHudFrame,
  computeOutrunCloudGeometry,
  computeOutrunHeatHazeGeometry,
  computeOutrunFacetedPeakGeometry,
  computeOutrunCoastBuildingGeometry,
  computeOutrunDesertHillGeometry,
  computeOutrunMountainCliffGeometry,
  computeOutrunPalmFrondGeometry,
  computeSegmentBands,
  computeSpriteDrawPosition,
  computeOffroadDustParticle
} from "./OutrunVisualHelpers";

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

function drawCanvasSprite(
  ctx: CanvasRenderingContext2D,
  sp: RoadSegmentSprite,
  sx: number,
  sy: number,
  sw: number,
  roadWidth: number,
  lightsOn: boolean
): void {
  const scale = sw / (roadWidth * 0.4);
  if (scale < 0.04) return;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);

  if (sp.kind === "palm") {
    // Clean curved trunk
    ctx.strokeStyle = "#5a4d41";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sp.side * 15, -40, sp.side * 10, -80);
    ctx.stroke();

    // Smooth triangular fronds
    ctx.fillStyle = "#00b4d8";
    const topX = sp.side * 10;
    const topY = -80;
    for (let f = 0; f < 6; f++) {
      const { angle, fx, fy } = computeOutrunPalmFrondGeometry(f, 6, topX, topY);
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(fx, fy);
      ctx.lineTo(topX + Math.cos(angle + 0.3) * 15, topY + Math.sin(angle + 0.3) * 10);
      ctx.closePath();
      ctx.fill();
    }
  } else if (sp.kind === "lamp") {
    // Thin LED post
    ctx.fillStyle = lightsOn ? "#9ca3af" : "#4b5563";
    ctx.fillRect(-2, -90, 4, 90);
    ctx.fillRect(-2, -90, sp.side * 22, 4);

    if (lightsOn) {
      // Soft cyan horizontal light glow line (blue hour / night)
      ctx.strokeStyle = "rgba(0, 240, 255, 0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -88);
      ctx.lineTo(sp.side * 22, -88);
      ctx.stroke();

      // Glowing cyan point
      ctx.fillStyle = "#00f0ff";
      ctx.beginPath();
      ctx.arc(sp.side * 20, -88, 6, 0, Math.PI * 2);
      ctx.fill();

      // Soft light beam halo
      ctx.fillStyle = "rgba(0, 240, 255, 0.25)";
      ctx.beginPath();
      ctx.arc(sp.side * 20, -88, 12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Off silhouette during day
      ctx.fillStyle = "#6b7280";
      ctx.beginPath();
      ctx.arc(sp.side * 20, -88, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (sp.kind === "shrub") {
    ctx.fillStyle = "#8d5b4c";
    ctx.beginPath();
    ctx.arc(-10, -12, 14, 0, Math.PI * 2);
    ctx.arc(8, -16, 18, 0, Math.PI * 2);
    ctx.arc(0, -8, 12, 0, Math.PI * 2);
    ctx.fill();
  } else if (sp.kind === "wind_tower") {
    ctx.fillStyle = "#edf2f4";
    ctx.fillRect(-2, -110, 4, 110);
    ctx.save();
    ctx.translate(0, -110);
    ctx.fillStyle = "#90e0ef";
    for (let b = 0; b < 3; b++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-3, -35);
      ctx.lineTo(3, -35);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if (sp.kind === "cypress") {
    ctx.fillStyle = "#2b2d42";
    ctx.beginPath();
    ctx.moveTo(0, -100);
    ctx.quadraticCurveTo(18, -30, 0, 0);
    ctx.quadraticCurveTo(-18, -30, 0, -100);
    ctx.closePath();
    ctx.fill();
  } else if (sp.kind === "wall") {
    ctx.fillStyle = "#e0e0e0";
    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.lineTo(35, 0);
    ctx.lineTo(30, -20);
    ctx.lineTo(-30, -20);
    ctx.closePath();
    ctx.fill();
  } else if (sp.kind === "chevron") {
    ctx.fillStyle = "#111111";
    ctx.fillRect(-18, -45, 36, 30);
    ctx.fillStyle = "#d1d5db";
    ctx.fillRect(-2, -15, 4, 15);
    ctx.strokeStyle = "#ff5252";
    ctx.lineWidth = 3;
    const dir = sp.side > 0 ? 1 : -1;
    for (let c = -1; c <= 1; c++) {
      const cx = c * 10;
      ctx.beginPath();
      ctx.moveTo(cx - dir * 4, -38);
      ctx.lineTo(cx + dir * 4, -30);
      ctx.lineTo(cx - dir * 4, -22);
      ctx.stroke();
    }
  } else if (sp.kind === "billboard") {
    ctx.fillStyle = "#6c757d";
    ctx.fillRect(-25, -60, 4, 60);
    ctx.fillRect(21, -60, 4, 60);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-35, -95, 70, 38);
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(-35, -95, 70, 38);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(sp.text ?? "2049", 0, -72);
  } else if (sp.kind === "arch") {
    const archW = sw * 1.8;
    const archH = 100;
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(-archW, -archH, 12, archH);
    ctx.fillRect(archW - 12, -archH, 12, archH);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-archW, -archH - 24, archW * 2, 24);
    ctx.strokeStyle = "#ff5252";
    ctx.lineWidth = 2;
    ctx.strokeRect(-archW, -archH - 24, archW * 2, 24);
    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(sp.text ?? "OUT RUN 2049", 0, -archH - 8);
  } else if (sp.kind === "banner") {
    const banW = sw * 1.4;
    const banH = 75;
    ctx.fillStyle = "#334155";
    ctx.fillRect(-banW, -banH - 18, banW * 2, 18);
    ctx.strokeStyle = "#ffe066";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-banW, -banH - 18, banW * 2, 18);
    ctx.fillStyle = "#ffe066";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(sp.text ?? "CHECKPOINT", 0, -banH - 5);
  }

  ctx.restore();
}

export const drawOutrunRoad: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, _entity) {
    const frame = resolveOutrunFrame(world);
    if (!frame) return;

    const { state, roadData, config, screenW, screenH, rumbleLength, palette } = frame;

    // PASS 1: Sky Multi-Band Gradient
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

    // PASS 2.5: Parallax Clouds
    const cloudCount = 8;
    ctx.fillStyle = palette.cloudColor;
    for (let c = 0; c < cloudCount; c++) {
      const { cloudX, cloudY, cloudW, cloudH } = computeOutrunCloudGeometry(c, screenW, screenH, state.playerZ, state.playerX);

      ctx.beginPath();
      ctx.arc(cloudX - cloudW * 0.2, cloudY, cloudH * 0.8, 0, Math.PI * 2);
      ctx.arc(cloudX, cloudY - cloudH * 0.2, cloudH, 0, Math.PI * 2);
      ctx.arc(cloudX + cloudW * 0.2, cloudY, cloudH * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // PASS 2.8: Midday Horizon Heat Haze
    if (palette.dayPhase === "day") {
      const hazeY = screenH * 0.45;
      const numLines = 18;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      for (let h = 0; h < numLines; h++) {
        const { x, waveOffset } = computeOutrunHeatHazeGeometry(h, numLines, screenW, state.playerX, state.playerZ);

        ctx.beginPath();
        ctx.moveTo(x, hazeY - 22);
        ctx.lineTo(x + waveOffset * 0.5, hazeY - 2);
        ctx.stroke();
      }
    }

    // PASS 3: Horizon by Scenario
    const horizonY = screenH * 0.45;
    const horizonStyle = palette.horizonStyle ?? (palette.id.startsWith("classic_") ? "faceted_peaks" : "coast_sea");

    if (horizonStyle === "faceted_peaks") {
      const numPeaks = 12;
      const peakSpacing = screenW / 4;
      const mountainOffsetX = ((state.playerZ * 0.00015) % peakSpacing) + state.playerX * 25;

      for (let m = -2; m < numPeaks + 2; m++) {
        const { px, peakY, h2 } = computeOutrunFacetedPeakGeometry(m, peakSpacing, mountainOffsetX, horizonY, palette.id);

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
    } else if (horizonStyle === "coast_sea") {
      // Sea band
      ctx.fillStyle = "#00b4d8";
      ctx.fillRect(0, horizonY - 18, screenW, 18);
      ctx.strokeStyle = "#90e0ef";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(screenW, horizonY);
      ctx.stroke();

      // Brutalist building & wind turbine silhouettes
      const spacing = screenW / 6;
      const horizonOffset = ((state.playerZ * 0.0001) % spacing) + state.playerX * 20;
      ctx.fillStyle = palette.mountainBase;
      for (let b = -2; b < 8; b++) {
        const { bx, bw, bh } = computeOutrunCoastBuildingGeometry(b, spacing, horizonOffset);
        ctx.fillRect(bx, horizonY - bh, bw, bh);

        if (palette.lightsOn) {
          ctx.fillStyle = "#00f0ff";
          ctx.fillRect(bx + 3, horizonY - bh + 4, 3, 3);
          ctx.fillRect(bx + bw - 6, horizonY - bh + 12, 3, 3);
          ctx.fillStyle = palette.mountainBase;
        }
      }
    } else if (palette.id === "desert") {
      // Smooth bezier hills
      const hillSpacing = screenW / 3;
      const hillOffset = ((state.playerZ * 0.00012) % hillSpacing) + state.playerX * 22;
      ctx.fillStyle = palette.mountainBase;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      for (let h = -2; h < 6; h++) {
        const { hx, hHeight } = computeOutrunDesertHillGeometry(h, hillSpacing, hillOffset);
        ctx.quadraticCurveTo(hx + hillSpacing * 0.5, horizonY - hHeight, hx + hillSpacing, horizonY);
      }
      ctx.lineTo(screenW, horizonY);
      ctx.closePath();
      ctx.fill();
    } else {
      // Mountain concrete cliffs and contemporary skyline
      const spacing = screenW / 5;
      const offset = ((state.playerZ * 0.00015) % spacing) + state.playerX * 25;
      ctx.fillStyle = palette.mountainBase;
      for (let m = -2; m < 7; m++) {
        const { mx, mh, mw } = computeOutrunMountainCliffGeometry(m, spacing, offset);
        ctx.fillRect(mx, horizonY - mh, mw, mh);

        ctx.fillStyle = palette.mountainFacet;
        ctx.beginPath();
        ctx.moveTo(mx + mw, horizonY - mh);
        ctx.lineTo(mx + mw + 15, horizonY - mh + 20);
        ctx.lineTo(mx + mw + 15, horizonY);
        ctx.lineTo(mx + mw, horizonY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = palette.mountainBase;
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

    // PASS 4: Speed lines
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

    // Road segments pass
    for (let i = 0; i < count; i++) {
      const p = projectionBuffer[i];
      if (p.p1z <= 0 && p.p2z <= 0) continue;
      if (p.y2 >= maxy) continue;

      const bands = computeSegmentBands(p, palette, rumbleLength, maxy);
      fillTrapezoid(ctx, p.x1, p.y1, screenW, p.x2, bands.y2Clipped, screenW, bands.grassColor);
      fillTrapezoid(ctx, p.x1, p.y1, bands.rumbleW1, p.x2, bands.y2Clipped, bands.rumbleW2, bands.rumbleColorVal);
      fillTrapezoid(ctx, p.x1, p.y1, p.w1, p.x2, bands.y2Clipped, p.w2, bands.roadColorVal);

      if (bands.hasReflection) {
        fillTrapezoid(ctx, p.x1, p.y1, bands.reflW1, p.x2, bands.y2Clipped, bands.reflW2, bands.reflColorVal);
      }

      if (bands.hasInnerDarkening) {
        ctx.fillStyle = `rgba(0, 0, 0, ${bands.innerDarkAlpha})`;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x1 + bands.innerSide * p.w1, p.y1);
        ctx.lineTo(p.x2 + bands.innerSide * p.w2, bands.y2Clipped);
        ctx.lineTo(p.x2, bands.y2Clipped);
        ctx.closePath();
        ctx.fill();
      }

      if (bands.hasLaneMarking) {
        fillTrapezoid(ctx, p.x1, p.y1, bands.laneW1, p.x2, bands.y2Clipped, bands.laneW2, palette.lane);
      }

      if (bands.hasFog) {
        ctx.fillStyle = `rgba(135, 206, 235, ${bands.fogAlpha})`;
        ctx.beginPath();
        ctx.moveTo(p.x1 - p.w1 * 1.2, p.y1);
        ctx.lineTo(p.x1 + p.w1 * 1.2, p.y1);
        ctx.lineTo(p.x2 + p.w2 * 1.2, bands.y2Clipped);
        ctx.lineTo(p.x2 - p.w2 * 1.2, bands.y2Clipped);
        ctx.closePath();
        ctx.fill();
      }

      maxy = p.y2;
    }

    // Sprites Pass (Render back-to-front with ridge occlusion clipping)
    for (let i = count - 1; i >= 0; i--) {
      const p = projectionBuffer[i];
      const seg = roadData.segments[p.index];
      if (!seg || !seg.sprites || seg.sprites.length === 0) continue;

      for (const sp of seg.sprites) {
        const { sx, sy, sw, visible } = computeSpriteDrawPosition(sp, p);
        if (!visible) continue;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, screenW, p.clip);
        ctx.clip();

        drawCanvasSprite(ctx, sp, sx, sy, sw, config.roadWidth, palette.lightsOn);

        ctx.restore();
      }
    }
  }
};

export const drawOutrunCar: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    const frame = resolveOutrunCarFrame(world, entity);
    if (!frame) return;

    const { state, geom } = frame;

    ctx.save();

    // Car Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.beginPath();
    ctx.ellipse(geom.baseX, geom.baseY + 10, 34 * geom.carScale, 10 * geom.carScale, 0, 0, Math.PI * 2);
        // TODO(refactor): código duplicado detectado (bloque) con outrun/rendering/OutrunSkiaVisuals.ts:525-531. Considerar extraer a función compartida. Ref: 690755e3
ctx.fill();

    // Off-track Dust
    if (geom.isOffroad && state.speed > 0) {
      const roadData = world.getResource<RoadData>("RoadData");
      const basePal = roadData ? getScenarioPaletteAtZ(state.playerZ, roadData) : COAST_PALETTE;
      const dustColor = basePal.id === "coast" ? "#e2dfc8" : basePal.id === "desert" ? "#d0a67a" : "#8d99ae";

      for (let d = 0; d < 12; d++) {
        const { dx, dy, alpha, radius } = computeOffroadDustParticle(d, state.playerZ, geom.speedRatio);

        ctx.fillStyle = dustColor;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(geom.baseX + (d % 2 === 0 ? -22 : 22) + dx, geom.baseY + dy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    ctx.translate(geom.baseX, geom.baseY);
    ctx.rotate(geom.tiltAngle);
    ctx.scale(geom.carScale, geom.carScale);

    ctx.fillStyle = "#ff5252";
    ctx.beginPath();
    ctx.moveTo(-28, 10);
    ctx.lineTo(-22, -18);
    ctx.lineTo(22, -18);
    ctx.lineTo(28, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1d3557";
    ctx.fillRect(-14, -14, 28, 14);

    ctx.fillStyle = "#00f0ff";
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
    const frame = resolveOutrunRacerFrame(world, entity);
    if (!frame) return;

    const { proj, racer } = frame;

    const colors = ["#457b9d", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];
    const bodyColor = colors[racer.colorIndex % colors.length];

    ctx.save();
    ctx.translate(proj.sx + proj.lateral, proj.sy);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-proj.carW / 2, -proj.carH, proj.carW, proj.carH);
    ctx.fillStyle = "#222";
    ctx.fillRect(-proj.carW * 0.3, -proj.carH * 0.85, proj.carW * 0.6, proj.carH * 0.4);
    ctx.restore();
  }
};

export const drawOutrunHud: EffectDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world) {
    const frame = resolveOutrunHudFrame(world);
    if (!frame) return;

    const { state, config, speedKmh, timeStr, phase } = frame;

    ctx.save();

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
