import type { ShapeDrawer } from "@tiny-aster/core";
import type { OutrunComponentRegistry, RoadSegmentSprite } from "../types/OutrunTypes";
import {
  resolveOutrunRoadContext,
  resolveOutrunHorizonContext,
  projectOutrunRoad,
  projectionBuffer,
  computeRoadSegmentColors,
  getFacetedPeakPolygons,
  iterateOutrunSprites,
  resolveOutrunCarContext,
  resolveOutrunRacerDrawContext,
  resolveOutrunHudContext,
  resolveOffroadDustParams
} from "./OutrunRenderShared";
import { computeSpeedLines } from "./OutrunVisualHelpers";
import { resolveSegmentFog } from "./OutrunFog";

function drawRoadSpriteCanvas(
  ctx: CanvasRenderingContext2D,
  sp: RoadSegmentSprite,
  sx: number,
  sy: number,
  sw: number,
  clipY: number,
  palette: import("./OutrunPalettes").ModulatedPalette
): void {
  if (sy >= clipY || sw < 2) return;

  ctx.save();

  const size = sw * 0.8;
  const h = size * 1.5;

  if (sp.kind === "arch" || sp.kind === "banner") {
    const archW = sw * 2.2;
    const archH = sw * 1.2;
    ctx.fillStyle = "#334155";
    ctx.fillRect(sx - archW / 2, sy - archH, archW * 0.1, archH);
    ctx.fillRect(sx + archW / 2 - archW * 0.1, sy - archH, archW * 0.1, archH);

    ctx.fillStyle = sp.kind === "arch" ? "#e11d48" : "#2563eb";
    ctx.fillRect(sx - archW / 2, sy - archH, archW, archH * 0.35);

    if (sp.text) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(10, Math.floor(archH * 0.25))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(sp.text, sx, sy - archH * 0.75);
    }
  } else if (sp.kind === "billboard") {
    const bw = size * 1.8;
    const bh = size * 1.0;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(sx - 4, sy - bh, 8, bh);

    ctx.fillStyle = "#0284c7";
    ctx.fillRect(sx - bw / 2, sy - bh - bh * 0.8, bw, bh);

    if (sp.text) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(8, Math.floor(bh * 0.4))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(sp.text, sx, sy - bh - bh * 0.3);
    }
  } else if (sp.kind === "chevron") {
    const cw = size * 0.6;
    const ch = size * 0.8;
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(sx - cw / 2, sy);
    ctx.lineTo(sx + cw / 2, sy - ch / 2);
    ctx.lineTo(sx - cw / 2, sy - ch);
    ctx.closePath();
    ctx.fill();
  } else if (sp.kind === "palm") {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(sx - size * 0.08, sy - h, size * 0.16, h);

    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.arc(sx, sy - h, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (sp.kind === "lamp") {
    ctx.fillStyle = "#64748b";
    ctx.fillRect(sx - 2, sy - h, 4, h);
    ctx.fillStyle = palette.lightsOn ? "#fef08a" : "#94a3b8";
    ctx.beginPath();
    ctx.arc(sx, sy - h, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (sp.kind === "cypress") {
    ctx.fillStyle = "#14532d";
    ctx.beginPath();
    ctx.moveTo(sx - size * 0.3, sy);
    ctx.lineTo(sx, sy - h * 1.2);
    ctx.lineTo(sx + size * 0.3, sy);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.arc(sx, sy - size * 0.3, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export const drawOutrunRoad: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world) {
    const roadCtx = resolveOutrunRoadContext(world);
    if (!roadCtx) return;

    const { state, roadData, config, screenW, screenH, rumbleLength, palette } = roadCtx;
    ctx.save();

    const horizonCtx = resolveOutrunHorizonContext(roadCtx);
    const { horizonY, bands, bandHeight } = horizonCtx;

    // 1. Sky Bands
    for (let i = 0; i < bands.length; i++) {
      ctx.fillStyle = bands[i]!;
      ctx.fillRect(0, i * bandHeight, screenW, bandHeight + 1);
    }

    // Sun/Moon
    if (palette.sun) {
      ctx.fillStyle = palette.sun;
      const sunX = ((screenW * 0.7 - state.playerX * 15) % screenW + screenW) % screenW;
      ctx.beginPath();
      ctx.arc(sunX, horizonY - 35, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Clouds
    if (palette.cloudColor && horizonCtx.clouds) {
      ctx.fillStyle = palette.cloudColor;
      for (const c of horizonCtx.clouds) {
        ctx.beginPath();
        ctx.ellipse(c.cloudX, c.cloudY, c.cloudW / 2, c.cloudH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Horizon Scenery
    if (horizonCtx.peaks) {
      for (const p of horizonCtx.peaks) {
        const poly = getFacetedPeakPolygons(p);
        ctx.fillStyle = palette.mountainBase;
        ctx.beginPath();
        ctx.moveTo(poly.base[0][0], poly.base[0][1]);
        ctx.lineTo(poly.base[1][0], poly.base[1][1]);
        ctx.lineTo(poly.base[2][0], poly.base[2][1]);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = palette.mountainFacet;
        ctx.beginPath();
        ctx.moveTo(poly.facet[0][0], poly.facet[0][1]);
        ctx.lineTo(poly.facet[1][0], poly.facet[1][1]);
        ctx.lineTo(poly.facet[2][0], poly.facet[2][1]);
        ctx.closePath();
        ctx.fill();
      }
    } else if (horizonCtx.buildings) {
      ctx.fillStyle = palette.mountainBase;
      for (const b of horizonCtx.buildings) {
        ctx.fillRect(b.bx, horizonY - b.bh, b.bw, b.bh);
      }
    } else if (horizonCtx.hazeLines) {
      ctx.fillStyle = palette.sun || "#ffe066";
      ctx.globalAlpha = 0.2;
      for (const h of horizonCtx.hazeLines) {
        ctx.fillRect(h.x, h.hazeY, 20, 2);
      }
      ctx.globalAlpha = 1.0;
    }

    // Ground Base
    ctx.fillStyle = palette.groundDark;
    ctx.fillRect(0, horizonY, screenW, screenH - horizonY);

    // 2. Road Segments Pass
    const count = projectOutrunRoad(roadData.segments, state.playerZ, state.playerX, config, screenW, screenH);

    for (let i = count - 1; i >= 0; i--) {
      const p = projectionBuffer[i]!;
      if (p.y1 <= p.y2 || p.y2 >= p.clip) continue;

      const { grassCol, rumbleCol, roadCol } = computeRoadSegmentColors(p.index, rumbleLength, palette);

      // Grass
      ctx.fillStyle = grassCol;
      ctx.fillRect(0, p.y2, screenW, p.y1 - p.y2);

      // Rumble Strips
      ctx.fillStyle = rumbleCol;
      ctx.beginPath();
      ctx.moveTo(p.x2 - p.w2 * 1.18, p.y2);
      ctx.lineTo(p.x2 + p.w2 * 1.18, p.y2);
      ctx.lineTo(p.x1 + p.w1 * 1.18, p.y1);
      ctx.lineTo(p.x1 - p.w1 * 1.18, p.y1);
      ctx.closePath();
      ctx.fill();

      // Road Surface
      ctx.fillStyle = roadCol;
      ctx.beginPath();
      ctx.moveTo(p.x2 - p.w2, p.y2);
      ctx.lineTo(p.x2 + p.w2, p.y2);
      ctx.lineTo(p.x1 + p.w1, p.y1);
      ctx.lineTo(p.x1 - p.w1, p.y1);
      ctx.closePath();
      ctx.fill();

      // Lane Divider
      if (Math.floor(p.index / rumbleLength) % 2 === 0) {
        ctx.fillStyle = palette.lane;
        const lw1 = p.w1 * 0.03;
        const lw2 = p.w2 * 0.03;
        ctx.beginPath();
        ctx.moveTo(p.x2 - lw2, p.y2);
        ctx.lineTo(p.x2 + lw2, p.y2);
        ctx.lineTo(p.x1 + lw1, p.y1);
        ctx.lineTo(p.x1 - lw1, p.y1);
        ctx.closePath();
        ctx.fill();
      }

      // Fog Pass
      const fog = resolveSegmentFog(p.fog, palette);
      if (fog.alpha > 0) {
        ctx.fillStyle = fog.rgba;
        ctx.fillRect(0, p.y2, screenW, p.y1 - p.y2);
      }
    }

    // 3. Roadside Sprites Pass
    iterateOutrunSprites(ctx, count, roadData, config, palette.lightsOn, (c, sp, sx, sy, sw, roadW, lightsOn, clipY) => {
      drawRoadSpriteCanvas(c, sp, sx, sy, sw, clipY, palette);
    });

    ctx.restore();
  }
};

export const drawOutrunCar: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    if (entity === undefined) return;
    const carCtx = resolveOutrunCarContext(world, entity);
    if (!carCtx) return;

    const { state, config, carColor, geom } = carCtx;
    const { baseX, baseY, carScale, tiltAngle, isOffroad, speedRatio } = geom;

    ctx.save();

    // Offroad Dust
    if (isOffroad && speedRatio > 0) {
      const { dustColor, particles } = resolveOffroadDustParams(world, state.playerZ, speedRatio);
      for (const p of particles) {
        ctx.fillStyle = dustColor;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(baseX + p.dx, baseY + p.dy, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // Speed Lines
    const speedLines = computeSpeedLines(config.WIDTH, config.HEIGHT, config.HEIGHT * 0.45, state.playerZ, speedRatio);
    if (speedLines) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      for (const line of speedLines) {
        ctx.globalAlpha = line.alpha;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    }

    ctx.translate(baseX, baseY);
    ctx.rotate(tiltAngle);
    ctx.scale(carScale, carScale);

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(0, 16, 36, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tires
    ctx.fillStyle = "#111111";
    ctx.fillRect(-32, 2, 10, 16);
    ctx.fillRect(22, 2, 10, 16);

    // Car Body
    ctx.fillStyle = carColor;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(-30, -18, 60, 30, 6);
    } else {
      ctx.rect(-30, -18, 60, 30);
    }
    ctx.fill();

    // Bumper
    ctx.fillStyle = "#1c1c1c";
    ctx.fillRect(-28, 4, 56, 8);

    // Rear Windshield
    ctx.fillStyle = "#22252a";
    ctx.beginPath();
    ctx.moveTo(-20, -16);
    ctx.lineTo(20, -16);
    ctx.lineTo(16, -2);
    ctx.lineTo(-16, -2);
    ctx.closePath();
    ctx.fill();

    // Tail Lights
    ctx.fillStyle = "#ff2233";
    ctx.fillRect(-26, -6, 12, 6);
    ctx.fillRect(14, -6, 12, 6);

    // License Plate
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(-8, 2, 16, 6);

    ctx.restore();
  }
};

export const drawOutrunRacer: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    if (entity === undefined) return;
    const racerCtx = resolveOutrunRacerDrawContext(world, entity);
    if (!racerCtx) return;

    const { proj, bodyColor } = racerCtx;
    const { sx, sy, sw, lateral, carW, carH, bestClip } = proj;

    const cx = sx + lateral;
    const cy = sy;

    if (cy >= bestClip || carW < 2) return;

    ctx.save();

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + carH * 0.4, carW * 0.5, carH * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(cx - carW / 2, cy - carH / 2, carW, carH, Math.max(2, carH * 0.15));
    } else {
      ctx.rect(cx - carW / 2, cy - carH / 2, carW, carH);
    }
    ctx.fill();

    // Windshield
    ctx.fillStyle = "#111827";
    ctx.fillRect(cx - carW * 0.3, cy - carH * 0.4, carW * 0.6, carH * 0.35);

    // Tail lights
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(cx - carW * 0.4, cy, carW * 0.2, carH * 0.2);
    ctx.fillRect(cx + carW * 0.2, cy, carW * 0.2, carH * 0.2);

    ctx.restore();
  }
};

export const drawOutrunHud = {
  draw(ctx: CanvasRenderingContext2D, world: import("@tiny-aster/core").World<OutrunComponentRegistry, any, any>): void {
    const hudCtx = resolveOutrunHudContext(world);
    if (!hudCtx) return;

    const { state, config, speedKmh, timeStr, phase, hudBg, hudAccent } = hudCtx;
    ctx.save();

    // Top Panel
    ctx.fillStyle = hudBg;
    ctx.fillRect(16, 16, 180, 60);

    ctx.strokeStyle = hudAccent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 16, 180, 60);

    // Metrics Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`${speedKmh} KM/H`, 28, 40);

    ctx.fillStyle = hudAccent;
    ctx.font = "14px sans-serif";
    ctx.fillText(`TIME: ${timeStr}s`, 28, 62);

    // Countdown Overlay
    if (phase === "countdown") {
      const cd = Math.ceil(state.countdownTime ?? 3);
      const text = cd > 0 ? `${cd}` : "GO!";
      ctx.fillStyle = hudAccent;
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, config.WIDTH / 2, config.HEIGHT / 2);
    }

    // Game Over Overlay
    if (state.isGameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, config.WIDTH, config.HEIGHT);

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", config.WIDTH / 2, config.HEIGHT / 2);
    }

    ctx.restore();
  }
};
