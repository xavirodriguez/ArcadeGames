import type { ShapeDrawer, World } from "@tiny-aster/core";
import type { RacingComponentRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";
import {
  getRacingSkin,
  interpretCanvas,
  defaultObstacleDrawer,
  defaultZoneDrawer,
  defaultWallDrawer,
  extractActorParams,
  extractWallParams,
  extractZoneParams,
  extractObstacleParams
} from "./RacingSkin";
import { buildTrackRibbon } from "./TrackRibbonGeometry";
import { extractTrackDimensions, computeCheckpointGrid, resolveTrackRibbonContext, resolveRacingParticlePoolContext, resolveFinishCheckers } from "./RacingVisualHelpers";
import type { RacingParticlePool } from "../systems/RacingParticleSystem";

interface StaticCacheEntry {
  key: string;
  canvas: HTMLCanvasElement;
}

let staticCache: StaticCacheEntry | null = null;
export let lastStaticDrawTimeMs: number = 0;

export function clearStaticRacingCache(): void {
  staticCache = null;
}

export const drawTrackSurface: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world) {
    const start = typeof performance !== "undefined" ? performance.now() : 0;
    const { width, height, halfW, halfH, skin, palette, trackSpec } = extractTrackDimensions(world);
    const cacheKey = `${trackSpec?.id ?? "default"}:${skin.id}`;

    ctx.save();

    // Offscreen Canvas Caching
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      if (!staticCache || staticCache.key !== cacheKey) {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = width;
        offCanvas.height = height;
        const offCtx = offCanvas.getContext("2d");

        if (offCtx) {
          offCtx.fillStyle = palette.surface;
          offCtx.fillRect(0, 0, width, height);

          offCtx.strokeStyle = palette.surfaceDetail;
          offCtx.lineWidth = 2;
          offCtx.globalAlpha = 0.4;

          const pattern = skin.surfacePattern ?? "wood";
          if (pattern === "diagonal") {
            offCtx.beginPath();
            for (let x = 0; x < width; x += 40) {
              offCtx.moveTo(x, 0);
              offCtx.lineTo(x + height, height);
            }
            offCtx.stroke();
          } else if (pattern === "starfield") {
            offCtx.fillStyle = palette.surfaceDetail;
            for (let i = 0; i < 120; i += 1) {
              const sx = (Math.sin(i * 12.9898) * 43758.5453) % 1 * width;
              const sy = (Math.cos(i * 78.233) * 43758.5453) % 1 * height;
              const sr = (i % 3 === 0) ? 2 : 1;
              offCtx.beginPath();
              offCtx.arc(Math.abs(sx), Math.abs(sy), sr, 0, Math.PI * 2);
              offCtx.fill();
            }
          } else if (pattern === "wood") {
            offCtx.beginPath();
            for (let y = 25; y < height; y += 35) {
              offCtx.moveTo(0, y);
              const curveOffset = Math.sin(y * 0.05) * 8;
              offCtx.quadraticCurveTo(width / 2, y + curveOffset, width, y);
            }
            offCtx.stroke();
          }

          // Subtle, deterministic surface grain adds material without per-frame cost.
          if (pattern === "wood") {
            offCtx.save();
            offCtx.globalAlpha = 0.16;
            offCtx.strokeStyle = palette.surfaceDetail;
            offCtx.lineWidth = 1;
            for (let i = 0; i < 64; i += 1) {
              const grainX = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1) * width;
              const grainY = Math.abs((Math.cos(i * 78.233) * 19341.173) % 1) * height;
              const grainLength = 8 + (i % 6) * 5;
              offCtx.beginPath();
              offCtx.moveTo(grainX, grainY);
              offCtx.lineTo(Math.min(width, grainX + grainLength), grainY + Math.sin(i * 0.7) * 1.5);
              offCtx.stroke();
            }
            for (let i = 0; i < 5; i += 1) {
              const knotX = width * (0.12 + i * 0.17);
              const knotY = height * (0.18 + (i % 2) * 0.31);
              offCtx.beginPath();
              offCtx.ellipse(knotX, knotY, 7, 2.5, 0, 0, Math.PI * 2);
              offCtx.stroke();
              offCtx.beginPath();
              offCtx.ellipse(knotX, knotY, 3.5, 1.2, 0, 0, Math.PI * 2);
              offCtx.stroke();
            }
            offCtx.restore();
          } else if (pattern === "starfield") {
            offCtx.save();
            offCtx.globalAlpha = 0.55;
            offCtx.strokeStyle = palette.text;
            offCtx.lineWidth = 1;
            for (let i = 0; i < 120; i += 15) {
              const sx = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1) * width;
              const sy = Math.abs((Math.cos(i * 78.233) * 43758.5453) % 1) * height;
              offCtx.beginPath();
              offCtx.moveTo(sx - 3, sy);
              offCtx.lineTo(sx + 3, sy);
              offCtx.moveTo(sx, sy - 3);
              offCtx.lineTo(sx, sy + 3);
              offCtx.stroke();
            }
            offCtx.restore();
          }

          staticCache = { key: cacheKey, canvas: offCanvas };
        }
      }

      if (staticCache) {
        ctx.drawImage(staticCache.canvas, -halfW, -halfH);
        ctx.restore();
        if (typeof performance !== "undefined") {
          lastStaticDrawTimeMs = performance.now() - start;
        }
        return;
      }
    }

    // Direct Fallback if document is undefined (e.g. node test env)
    ctx.fillStyle = palette.surface;
    ctx.fillRect(-halfW, -halfH, width, height);

    ctx.restore();
    if (typeof performance !== "undefined") {
      lastStaticDrawTimeMs = performance.now() - start;
    }
  }
};

export const drawTrackRibbon: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world) {
    const ribbonCtx = resolveTrackRibbonContext(world);
    if (!ribbonCtx) return;

    const { palette, left, right } = ribbonCtx;

    ctx.save();

    // Soft Outer Shadow Ribbon
    ctx.save();
    ctx.fillStyle = palette.shadow;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.moveTo(left[0]!.x + 6, left[0]!.y + 8);
    for (let i = 1; i < left.length; i += 1) {
      ctx.lineTo(left[i]!.x + 6, left[i]!.y + 8);
    }
    for (let i = right.length - 1; i >= 0; i -= 1) {
      ctx.lineTo(right[i]!.x + 6, right[i]!.y + 8);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Closed Ribbon Polygon
    ctx.beginPath();
    ctx.moveTo(left[0]!.x, left[0]!.y);
    for (let i = 1; i < left.length; i += 1) {
      ctx.lineTo(left[i]!.x, left[i]!.y);
    }
    for (let i = right.length - 1; i >= 0; i -= 1) {
      ctx.lineTo(right[i]!.x, right[i]!.y);
    }
    ctx.closePath();

    ctx.strokeStyle = palette.trackEdge;
    ctx.lineWidth = 10;
    ctx.lineJoin = "round";
    ctx.stroke();

    ctx.fillStyle = palette.track;
    ctx.fill();

    // Alternating kerbs make the track boundary readable without changing its geometry.
    for (let i = 0; i < left.length - 1; i += 4) {
      const end = Math.min(i + 3, left.length - 1);
      const curbColor = Math.floor(i / 4) % 2 === 0 ? palette.text : palette.accent;
      ctx.strokeStyle = curbColor;
      ctx.globalAlpha = 0.88;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(left[i]!.x, left[i]!.y);
      ctx.lineTo(left[end]!.x, left[end]!.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(right[i]!.x, right[i]!.y);
      ctx.lineTo(right[end]!.x, right[end]!.y);
      ctx.stroke();
    }

    ctx.strokeStyle = palette.text;
    ctx.globalAlpha = 0.24;
    ctx.lineWidth = 2;
    for (let i = 0; i < left.length; i += 8) {
      const start = Math.min(i + 1, left.length - 1);
      const end = Math.min(i + 5, left.length - 1);
      const startX = (left[start]!.x + right[start]!.x) / 2;
      const startY = (left[start]!.y + right[start]!.y) / 2;
      const endX = (left[end]!.x + right[end]!.x) / 2;
      const endY = (left[end]!.y + right[end]!.y) / 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.restore();
  }
};

export const drawSkidMarks: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world) {
    const pCtx = resolveRacingParticlePoolContext(world);
    if (!pCtx || pCtx.pool.skidMarks.length === 0) return;

    const { palette, pool } = pCtx;
    ctx.save();
    ctx.lineCap = "round";

    for (let i = 0; i < pool.skidMarks.length; i += 1) {
      const seg = pool.skidMarks[i]!;
      if (seg.alpha <= 0) continue;

      ctx.globalAlpha = seg.alpha * 0.42;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = seg.width + 1.5;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();

      ctx.globalAlpha = seg.alpha;
      ctx.strokeStyle = "#242424";
      ctx.lineWidth = Math.max(1, seg.width * 0.58);
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }

    ctx.restore();
  }
};

export const drawSmoke: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world) {
    const pCtx = resolveRacingParticlePoolContext(world);
    if (!pCtx || pCtx.pool.smokeParticles.length === 0) return;

    const { pool } = pCtx;
    ctx.save();

    for (let i = 0; i < pool.smokeParticles.length; i += 1) {
      const p = pool.smokeParticles[i]!;
      if (p.alpha <= 0) continue;

      ctx.globalAlpha = p.alpha * 0.18;
      ctx.fillStyle = "#30343B";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = p.alpha * 0.42;
      ctx.fillStyle = "#B8BEC7";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.82, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = p.alpha * 0.3;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(p.x - p.radius * 0.18, p.y - p.radius * 0.18, p.radius * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
};

export const drawRacingCar: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const skin = getRacingSkin(world);
    const params = extractActorParams(world, entity, skin.palette);
    if (params) {
      interpretCanvas(ctx, skin.actorDrawer(params));
    }
  }
};

export const drawTrackWall: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const skin = getRacingSkin(world);
    const params = extractWallParams(world, entity, skin.palette);
    if (params) {
      const wallDrawer = skin.wallDrawer ?? defaultWallDrawer;
      interpretCanvas(ctx, wallDrawer(params));
    }
  }
};

export const drawCheckpoint: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const skin = getRacingSkin(world);
    const checkpoint = world.getComponent(entity, "Checkpoint");
    if (!checkpoint) return;

    ctx.save();
    if (checkpoint.isFinish) {
      const { cells, halfW, halfH } = computeCheckpointGrid(checkpoint.width, checkpoint.height);
      const [color1, color2] = resolveFinishCheckers(skin);

      for (let i = 0; i < cells.length; i += 1) {
        const cell = cells[i]!;
        ctx.fillStyle = cell.colorIndex === 0 ? color1 : color2;
        ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
      }
      ctx.strokeStyle = skin.palette.outline;
      ctx.lineWidth = 2;
      ctx.strokeRect(-halfW, -halfH, checkpoint.width, checkpoint.height);
    } else {
      ctx.strokeStyle = skin.palette.trackEdge;
      ctx.globalAlpha = 0.4;
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 2;
      ctx.strokeRect(-checkpoint.width / 2, -checkpoint.height / 2, checkpoint.width, checkpoint.height);
    }
    ctx.restore();
  }
};

export const drawTrackZone: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const skin = getRacingSkin(world);
    const params = extractZoneParams(world, entity, skin.palette);
    if (params) {
      const zoneDrawer = skin.zoneDrawers[params.surface] ?? defaultZoneDrawer;
      interpretCanvas(ctx, zoneDrawer(params));
    }
  }
};

export const drawTrackObstacle: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const skin = getRacingSkin(world);
    const params = extractObstacleParams(world, entity, skin.palette);
    if (params) {
      const obstacleDrawer = skin.obstacleDrawers[params.kind] ?? defaultObstacleDrawer;
      interpretCanvas(ctx, obstacleDrawer(params));
    }
  }
};
