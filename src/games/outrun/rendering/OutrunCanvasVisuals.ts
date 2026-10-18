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
import { resolveRoadFogColor } from "./OutrunFog";
import { colors } from "../../../theme/colors";
import { hexToRgba } from "../../shared/rendering/CosmicPalette";
import {
  OUTRUN_PLAYER_PIXEL_SPRITE,
  OUTRUN_TRAFFIC_PIXEL_SPRITE,
  getOutrunAnimationFrame,
  resolveOutrunPixelColor,
  visitOutrunPixelRuns
} from "./OutrunPixelSprites";

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
    ctx.fillStyle = colors.slate;
    ctx.fillRect(sx - archW / 2, sy - archH, archW * 0.1, archH);
    ctx.fillRect(sx + archW / 2 - archW * 0.1, sy - archH, archW * 0.1, archH);

    ctx.fillStyle = sp.kind === "arch" ? colors.pink : colors.blue;
    ctx.fillRect(sx - archW / 2, sy - archH, archW, archH * 0.35);

    if (sp.text) {
      ctx.fillStyle = colors.white;
      ctx.font = `bold ${Math.max(10, Math.floor(archH * 0.25))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(sp.text, sx, sy - archH * 0.75);
    }
  } else if (sp.kind === "billboard") {
    const bw = size * 1.8;
    const bh = size * 1.0;
    ctx.fillStyle = colors.borderDark;
    ctx.fillRect(sx - 4, sy - bh, 8, bh);

    ctx.fillStyle = colors.blueLight;
    ctx.fillRect(sx - bw / 2, sy - bh - bh * 0.8, bw, bh);

    if (sp.text) {
      ctx.fillStyle = colors.white;
      ctx.font = `bold ${Math.max(8, Math.floor(bh * 0.4))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(sp.text, sx, sy - bh - bh * 0.3);
    }
  } else if (sp.kind === "chevron") {
    const cw = size * 0.6;
    const ch = size * 0.8;
    ctx.fillStyle = colors.amber;
    ctx.beginPath();
    ctx.moveTo(sx - cw / 2, sy);
    ctx.lineTo(sx + cw / 2, sy - ch / 2);
    ctx.lineTo(sx - cw / 2, sy - ch);
    ctx.closePath();
    ctx.fill();
  } else if (sp.kind === "palm") {
    ctx.fillStyle = colors.orangeDark;
    ctx.fillRect(sx - size * 0.08, sy - h, size * 0.16, h);

    ctx.fillStyle = colors.green;
    ctx.beginPath();
    ctx.arc(sx, sy - h, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (sp.kind === "lamp") {
    ctx.fillStyle = colors.slate;
    ctx.fillRect(sx - 2, sy - h, 4, h);
    ctx.fillStyle = palette.lightsOn ? colors.yellow : colors.borderLight;
    ctx.beginPath();
    ctx.arc(sx, sy - h, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (sp.kind === "cypress") {
    ctx.fillStyle = colors.green;
    ctx.beginPath();
    ctx.moveTo(sx - size * 0.3, sy);
    ctx.lineTo(sx, sy - h * 1.2);
    ctx.lineTo(sx + size * 0.3, sy);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = colors.green;
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
      ctx.fillStyle = palette.sun || colors.yellow;
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
    if (count === 0) {
      console.warn("[drawOutrunRoad] projectOutrunRoad returned 0 projected segments.");
    }

    let renderedCount = 0;
    for (let i = count - 1; i >= 0; i--) {
      const p = projectionBuffer[i]!;
      if (p.y1 <= p.y2 || p.y2 >= p.clip) continue;
      renderedCount++;

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

    }

    // One continuous fog gradient avoids visible bands at segment boundaries.
    const fogGradient = ctx.createLinearGradient(0, horizonY, 0, screenH);
    fogGradient.addColorStop(0, resolveRoadFogColor(palette, 0.55));
    fogGradient.addColorStop(1, resolveRoadFogColor(palette, 0));
    ctx.fillStyle = fogGradient;
    ctx.fillRect(0, horizonY, screenW, Math.max(0, screenH - horizonY));

    if (count > 0 && renderedCount === 0) {
      console.warn("[drawOutrunRoad] 100% of projected road segments were clipped or discarded.");
    }

    // 3. Roadside Sprites Pass
    iterateOutrunSprites(ctx, count, roadData, config, palette.lightsOn, (c, sp, sx, sy, _sw, _roadW, _lightsOn, clipY) => {
      drawRoadSpriteCanvas(c, sp, sx, sy, _sw, clipY, palette);
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
      ctx.strokeStyle = colors.white;
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

    // Crisp pixel shadow keeps the sprite aligned with the arcade art direction.
    ctx.fillStyle = hexToRgba(colors.surface, 0.4);
    ctx.fillRect(-24, 18, 48, 4);
    ctx.fillRect(-16, 22, 32, 4);

    const playerFrame = getOutrunAnimationFrame(state.playerZ);
    const playerSprite = OUTRUN_PLAYER_PIXEL_SPRITE.frames[playerFrame]!;
    visitOutrunPixelRuns(playerSprite, -32, -18, 4, (pixel, x, y, width, height) => {
      ctx.fillStyle = resolveOutrunPixelColor(pixel, carColor);
      ctx.fillRect(x, y, width, height);
    });

    ctx.restore();
  }
};

export const drawOutrunRacer: ShapeDrawer<CanvasRenderingContext2D, OutrunComponentRegistry> = {
  draw(ctx, world, entity) {
    if (entity === undefined) return;
    const racerCtx = resolveOutrunRacerDrawContext(world, entity);
    if (!racerCtx) return;

    const { proj, bodyColor } = racerCtx;
    const { sx, sy, lateral, carW, bestClip } = proj;

    const cx = sx + lateral;
    const cy = sy;

    if (cy >= bestClip || carW < 2) return;

    ctx.save();

    const pixelSize = carW / OUTRUN_TRAFFIC_PIXEL_SPRITE.width;
    const spriteWidth = pixelSize * OUTRUN_TRAFFIC_PIXEL_SPRITE.width;
    const spriteHeight = pixelSize * OUTRUN_TRAFFIC_PIXEL_SPRITE.height;

    ctx.fillStyle = hexToRgba(colors.surface, 0.35);
    ctx.fillRect(cx - spriteWidth * 0.35, cy + spriteHeight * 0.4, spriteWidth * 0.7, Math.max(1, pixelSize));

    const trafficSprite = OUTRUN_TRAFFIC_PIXEL_SPRITE.frames[racerCtx.frame]!;
    visitOutrunPixelRuns(
      trafficSprite,
      cx - spriteWidth / 2,
      cy - spriteHeight / 2,
      pixelSize,
      (pixel, x, y, width, height) => {
        ctx.fillStyle = resolveOutrunPixelColor(pixel, bodyColor);
        ctx.fillRect(x, y, width, height);
      }
    );

    ctx.restore();
  }
};

export const drawOutrunHud = {
  draw(ctx: CanvasRenderingContext2D, world: import("@tiny-aster/core").World<OutrunComponentRegistry>): void {
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
    ctx.fillStyle = colors.white;
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
      ctx.fillStyle = hexToRgba(colors.surface, 0.6);
      ctx.fillRect(0, 0, config.WIDTH, config.HEIGHT);

      ctx.fillStyle = colors.red;
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", config.WIDTH / 2, config.HEIGHT / 2);
    }

    ctx.restore();
  }
};
