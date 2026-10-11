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
import {
  resolveRacingTrackFrame,
  resolveRacingSkinAndParticles,
  computeCheckeredFinishGrid
} from "./RacingRenderUtils";

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
    const { skin, palette, trackSpec, width, height, halfW, halfH } = resolveRacingTrackFrame(world);
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
    const { palette, trackSpec } = resolveRacingTrackFrame(world);
    if (!trackSpec || trackSpec.waypoints.length < 3) return;

    const { left, right } = buildTrackRibbon(trackSpec.waypoints);
    if (left.length === 0 || right.length === 0) return;

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

    ctx.restore();
  }
};

// TODO(refactor): código duplicado detectado (bloque) con racing/rendering/RacingCanvasVisuals.ts:191-196. Considerar extraer a función compartida. Ref: 658d61dd
export const drawSkidMarks: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world) {
    const { palette, pool } = resolveRacingSkinAndParticles(world);
    if (!pool || pool.skidMarks.length === 0) return;

    ctx.save();
    ctx.strokeStyle = palette.outline;
    ctx.lineCap = "round";

    for (let i = 0; i < pool.skidMarks.length; i += 1) {
      const seg = pool.skidMarks[i]!;
      if (seg.alpha <= 0) continue;

      ctx.globalAlpha = seg.alpha;
      ctx.lineWidth = seg.width;
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
    const { palette, pool } = resolveRacingSkinAndParticles(world);
    if (!pool || pool.smokeParticles.length === 0) return;

    ctx.save();
    ctx.fillStyle = palette.text;

    for (let i = 0; i < pool.smokeParticles.length; i += 1) {
      const p = pool.smokeParticles[i]!;
      if (p.alpha <= 0) continue;

      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
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

        // TODO(refactor): código duplicado detectado (bloque) con racing/rendering/RacingSkiaVisuals.ts:168-181. Considerar extraer a función compartida. Ref: 5f514a71
ctx.save();
    if (checkpoint.isFinish) {
      const halfW = checkpoint.width / 2;
      const halfH = checkpoint.height / 2;
      const [color1, color2] = skin.finishCheckers ?? ["#FFFFFF", "#5D4037"];
      const cells = computeCheckeredFinishGrid(checkpoint.width, checkpoint.height, 8, 2, color1, color2);

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        ctx.fillStyle = cell.color;
        ctx.fillRect(cell.x, cell.y, cell.colW, cell.rowH);
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
