import { ShapeDrawer, EffectDrawer, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { OutrunComponentRegistry } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { RoadData, RoadSegmentSprite } from "../types/OutrunTypes";
import {
  COAST_PALETTE,
  scenarioHash,
  getScenarioPaletteAtZ
} from "./OutrunPalettes";
import {
  computePlayerCarGeometry,
  computeRacerProjection,
  computeCloudParams,
  computeHeatHazeLines,
  computeSpeedLines
} from "./OutrunVisualHelpers";
import {
  PROJECTION_CAPACITY,
  projectionBuffer,
  rumbleColor,
  roadColor,
  resolveOutrunRoadContext,
  resolveOutrunCarContext,
  resolveRacerRenderContext,
  resolveOutrunHudContext,
  resolveOutrunRacerDrawContext,
  iterateOutrunSprites,
  projectOutrunRoad,
  computeFacetedPeaks,
  getFacetedPeakPolygons,
  computeCoastalBuildings,
  computeMountainCliffs,
  resolveOffroadDustParams,
  RACER_COLORS
} from "./OutrunRenderShared";

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
      const angle = (f / 6) * Math.PI * 2;
      const fx = topX + Math.cos(angle) * 35;
      const fy = topY + Math.sin(angle) * 20;
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
    const roadCtx = resolveOutrunRoadContext(world);
    if (!roadCtx) return;

    const { state, roadData, config, screenW, screenH, rumbleLength, palette } = roadCtx;

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
    const clouds = computeCloudParams(screenW, screenH, state.playerZ, state.playerX);
    ctx.fillStyle = palette.cloudColor;
    for (const cloud of clouds) {
      const { cloudX, cloudY, cloudW, cloudH } = cloud;
      ctx.beginPath();
      ctx.arc(cloudX - cloudW * 0.2, cloudY, cloudH * 0.8, 0, Math.PI * 2);
      ctx.arc(cloudX, cloudY - cloudH * 0.2, cloudH, 0, Math.PI * 2);
      ctx.arc(cloudX + cloudW * 0.2, cloudY, cloudH * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // PASS 2.8: Midday Horizon Heat Haze
    if (palette.dayPhase === "day") {
      const hazeLines = computeHeatHazeLines(screenW, screenH, state.playerZ, state.playerX);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      for (const hl of hazeLines) {
        ctx.beginPath();
        ctx.moveTo(hl.x, hl.hazeY - 22);
        ctx.lineTo(hl.x + hl.waveOffset * 0.5, hl.hazeY - 2);
        ctx.stroke();
      }
    }

    // PASS 3: Horizon by Scenario
    const horizonY = screenH * 0.45;
    const horizonStyle = palette.horizonStyle ?? (palette.id.startsWith("classic_") ? "faceted_peaks" : "coast_sea");

    if (horizonStyle === "faceted_peaks") {
      const peaks = computeFacetedPeaks(screenW, horizonY, state.playerZ, state.playerX, palette.id);
      for (const p of peaks) {
        const { base, facet } = getFacetedPeakPolygons(p);

        ctx.fillStyle = palette.mountainBase;
        ctx.beginPath();
        ctx.moveTo(base[0][0], base[0][1]);
        ctx.lineTo(base[1][0], base[1][1]);
        ctx.lineTo(base[2][0], base[2][1]);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = palette.mountainFacet;
        ctx.beginPath();
        ctx.moveTo(facet[0][0], facet[0][1]);
        ctx.lineTo(facet[1][0], facet[1][1]);
        ctx.lineTo(facet[2][0], facet[2][1]);
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
      const { buildings } = computeCoastalBuildings(screenW, horizonY, state.playerZ, state.playerX);
      ctx.fillStyle = palette.mountainBase;
      for (const { bx, bw, bh } of buildings) {
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
        const hx = h * hillSpacing - hillOffset;
        const hHeight = 30 + scenarioHash("desert_h", h) * 45;
        ctx.quadraticCurveTo(hx + hillSpacing * 0.5, horizonY - hHeight, hx + hillSpacing, horizonY);
      }
      ctx.lineTo(screenW, horizonY);
      ctx.closePath();
      ctx.fill();
    } else {
      // Mountain concrete cliffs and contemporary skyline
      const { cliffs } = computeMountainCliffs(screenW, horizonY, state.playerZ, state.playerX);
      ctx.fillStyle = palette.mountainBase;
      for (const { mx, mw, mh } of cliffs) {
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

    const count = projectOutrunRoad(
      roadData.segments,
      state.playerZ,
      state.playerX,
      config,
      screenW,
      screenH
    );

    let maxy = screenH;

    // PASS 4: Speed lines
    const speedRatio = state.speed / config.maxSpeed;
    const speedLines = computeSpeedLines(screenW, screenH, horizonY, state.playerZ, speedRatio);
    if (speedLines) {
      ctx.lineWidth = 2;
      for (const line of speedLines) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${line.alpha})`;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      }
    }

    // Road segments pass
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

      // Wet road / center asphalt reflection layer
      if (palette.reflectionAlpha > 0) {
        const reflW1 = p.w1 * 0.35;
        const reflW2 = p.w2 * 0.35;
        const reflColor = `rgba(255, 255, 255, ${palette.reflectionAlpha.toFixed(3)})`;
        fillTrapezoid(ctx, p.x1, p.y1, reflW1, p.x2, Math.min(p.y2, maxy), reflW2, reflColor);
      }

      // Inner curve asphalt darkening
      if (Math.abs(p.curve) > 1.5) {
        const innerSide = p.curve > 0 ? 1 : -1;
        const darkAlpha = Math.min(0.25, (Math.abs(p.curve) - 1.5) * 0.08);
        ctx.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x1 + innerSide * p.w1, p.y1);
        ctx.lineTo(p.x2 + innerSide * p.w2, Math.min(p.y2, maxy));
        ctx.lineTo(p.x2, Math.min(p.y2, maxy));
        ctx.closePath();
        ctx.fill();
      }

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

    // Sprites Pass (Render back-to-front with ridge occlusion clipping)
    iterateOutrunSprites(
      ctx,
      count,
      roadData,
      config,
      palette.lightsOn,
      (c, sp, sx, sy, sw, roadW, lights, clipY) => {
        c.save();
        c.beginPath();
        c.rect(0, 0, screenW, clipY);
        c.clip();

        drawCanvasSprite(c, sp, sx, sy, sw, roadW, lights);

        c.restore();
      }
    );
  }
};

export const drawOutrunCar: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    const carCtx = resolveOutrunCarContext(world, entity);
    if (!carCtx) return;

    const { state, carColor, geom } = carCtx;

    ctx.save();

    // Car Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.beginPath();
    ctx.ellipse(geom.baseX, geom.baseY + 10, 34 * geom.carScale, 10 * geom.carScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Off-track Dust
    if (geom.isOffroad && state.speed > 0) {
      const { dustColor, particles } = resolveOffroadDustParams(world, state.playerZ, geom.speedRatio);

      for (const p of particles) {
        ctx.fillStyle = dustColor;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(geom.baseX + (p.isLeft ? -22 : 22) + p.dx, geom.baseY + p.dy, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    ctx.translate(geom.baseX, geom.baseY);
    ctx.rotate(geom.tiltAngle);
    ctx.scale(geom.carScale, geom.carScale);

    ctx.fillStyle = carColor;
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
    const racerCtx = resolveOutrunRacerDrawContext(world, entity);
    if (!racerCtx) return;

    const { proj, bodyColor } = racerCtx;

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
    const hudCtx = resolveOutrunHudContext(world);
    if (!hudCtx) return;

    const { state, config, speedKmh, timeStr, phase, hudBg, hudAccent } = hudCtx;

    ctx.save();

    const drawHudCard = (x: number, y: number, w: number, h: number, text: string, align: "left" | "right" = "left") => {
      ctx.fillStyle = hudBg;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = hudAccent;
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
      ctx.fillStyle = hudAccent;
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
