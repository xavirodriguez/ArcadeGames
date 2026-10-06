import type { ShapeDrawer, World } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";
import { getRacingPalette } from "./RacingPalette";
import { buildTrackRibbon } from "./TrackRibbonGeometry";
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
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
    const width = trackSpec?.width ?? 1600;
    const height = trackSpec?.height ?? 1000;
    const halfW = width / 2;
    const halfH = height / 2;
    const cacheKey = `${trackSpec?.id ?? "default"}:${trackSpec?.theme ?? "breakfast"}`;

    ctx.save();

    // Offscreen Canvas Caching
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      if (!staticCache || staticCache.key !== cacheKey) {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = width;
        offCanvas.height = height;
        const offCtx = offCanvas.getContext("2d");

        if (offCtx) {
          // Render Surface
          offCtx.fillStyle = palette.surface;
          offCtx.fillRect(0, 0, width, height);

          offCtx.strokeStyle = palette.surfaceDetail;
          offCtx.lineWidth = 2;
          offCtx.globalAlpha = 0.4;

          const theme = trackSpec?.theme ?? "breakfast";
          if (theme === "billiard") {
            offCtx.beginPath();
            for (let x = 0; x < width; x += 40) {
              offCtx.moveTo(x, 0);
              offCtx.lineTo(x + height, height);
            }
            offCtx.stroke();
          } else {
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

    // Direct Fallback if document is undefined (e.g., node test env)
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
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
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

export const drawSkidMarks: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world) {
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const pool = world.getResource<RacingParticlePool>("RacingParticles");
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
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const pool = world.getResource<RacingParticlePool>("RacingParticles");
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
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const render = world.getComponent(entity, "Render");
    const transform = world.getComponent(entity, "Transform");
    if (!render) return;

    const size = render.size ?? 16;
    const isPlayer = world.hasComponent(entity, "LocalPlayer");
    const bodyColor = isPlayer ? palette.player : palette.rival;
    const highlightColor = isPlayer ? palette.playerHighlight : palette.rivalHighlight;
    const rotation = transform?.rotation ?? 0;

    const input = world.getComponent(entity, "Input");
    const boosting = input?.actions.boost === true;
    const time = world.getResource<number>("RacingTime") ?? 0;

    ctx.save();

    if (boosting) {
      const oscillation = Math.sin(time * 30) * 0.15 + Math.cos(time * 47) * 0.1;
      const flameLen = size * (1.5 + oscillation);

      ctx.save();
      ctx.fillStyle = palette.danger;
      ctx.beginPath();
      ctx.moveTo(-size * 0.9, 0);
      ctx.lineTo(-size * 0.9 - flameLen, -size * 0.4);
      ctx.lineTo(-size * 0.9 - flameLen, size * 0.4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = palette.obstacle;
      ctx.beginPath();
      ctx.moveTo(-size * 0.9, 0);
      ctx.lineTo(-size * 0.9 - flameLen * 0.7, -size * 0.25);
      ctx.lineTo(-size * 0.9 - flameLen * 0.7, size * 0.25);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.moveTo(-size * 0.9, 0);
      ctx.lineTo(-size * 0.9 - flameLen * 0.4, -size * 0.12);
      ctx.lineTo(-size * 0.9 - flameLen * 0.4, size * 0.12);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = palette.text;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-size * 1.5, -size * 0.7);
      ctx.lineTo(-size * 2.8, -size * 0.7);
      ctx.moveTo(-size * 1.5, size * 0.7);
      ctx.lineTo(-size * 2.8, size * 0.7);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.rotate(-rotation);
    ctx.fillStyle = palette.shadow;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(4, 5, size * 1.05, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = palette.outline;
    const wW = size * 0.45;
    const wH = size * 0.22;
    ctx.fillRect(-size * 0.7, -size * 0.6, wW, wH);
    ctx.fillRect(size * 0.25, -size * 0.6, wW, wH);
    ctx.fillRect(-size * 0.7, size * 0.38, wW, wH);
    ctx.fillRect(size * 0.25, size * 0.38, wW, wH);

    ctx.fillStyle = bodyColor;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-size * 0.9, -size * 0.5, size * 1.8, size * 1.0, size * 0.3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    ctx.roundRect(-size * 0.4, -size * 0.35, size * 0.8, size * 0.7, size * 0.2);
    ctx.fill();

    ctx.fillStyle = palette.outline;
    ctx.fillRect(-size * 0.15, -size * 0.3, size * 0.35, size * 0.6);

    ctx.fillStyle = palette.text;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(-size * 0.05, -size * 0.2, size * 0.12, size * 0.15);
    ctx.globalAlpha = 1.0;

    if (isPlayer) {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(-size * 0.85, -size * 0.08, size * 0.7, size * 0.16);

      ctx.fillStyle = palette.outline;
      ctx.fillRect(-size * 0.92, -size * 0.45, size * 0.1, size * 0.9);
      ctx.fillStyle = palette.player;
      ctx.fillRect(-size * 0.98, -size * 0.48, size * 0.15, size * 0.96);
    } else {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(-size * 0.7, -size * 0.42, size * 1.2, size * 0.08);
      ctx.fillRect(-size * 0.7, size * 0.34, size * 1.2, size * 0.08);

      ctx.fillStyle = palette.text;
      ctx.font = `bold ${Math.round(size * 0.45)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("01", size * 0.25, 0);
    }

    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(size * 0.85, -size * 0.3, size * 0.12, 0, Math.PI * 2);
    ctx.arc(size * 0.85, size * 0.3, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.danger;
    ctx.fillRect(-size * 0.9, -size * 0.35, size * 0.08, size * 0.15);
    ctx.fillRect(-size * 0.9, size * 0.2, size * 0.08, size * 0.15);

    ctx.restore();
  }
};

export const drawTrackWall: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const render = world.getComponent(entity, "Render");
    const wall = world.getComponent(entity, "RacingWall");
    if (!render || !wall) return;

    const halfW = wall.width / 2;
    const halfH = wall.height / 2;
    const depth = 5;

    ctx.save();

    ctx.fillStyle = palette.shadow;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(-halfW + 5, -halfH + 6, wall.width, wall.height);

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = palette.outline;
    ctx.beginPath();
    ctx.moveTo(-halfW, halfH);
    ctx.lineTo(-halfW + depth, halfH + depth);
    ctx.lineTo(halfW + depth, halfH + depth);
    ctx.lineTo(halfW + depth, -halfH + depth);
    ctx.lineTo(halfW, -halfH);
    ctx.lineTo(halfW, halfH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = palette.trackEdge;
    ctx.fillRect(-halfW, -halfH, wall.width, wall.height);

    ctx.fillStyle = palette.track;
    ctx.fillRect(-halfW, -halfH, wall.width, 2.5);

    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-halfW, -halfH, wall.width, wall.height);

    ctx.restore();
  }
};

export const drawCheckpoint: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const checkpoint = world.getComponent(entity, "Checkpoint");
    if (!checkpoint) return;

    ctx.save();
    if (checkpoint.isFinish) {
      const halfW = checkpoint.width / 2;
      const halfH = checkpoint.height / 2;
      const cols = 8;
      const rows = 2;
      const colW = checkpoint.width / cols;
      const rowH = checkpoint.height / rows;

      const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
      const isBilliard = trackSpec?.theme === "billiard";
      const color1 = isBilliard ? "#FFFFF0" : "#FFFFFF";
      const color2 = isBilliard ? "#1B5E20" : "#5D4037";

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          ctx.fillStyle = (r + c) % 2 === 0 ? color1 : color2;
          ctx.fillRect(-halfW + c * colW, -halfH + r * rowH, colW, rowH);
        }
      }
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.strokeRect(-halfW, -halfH, checkpoint.width, checkpoint.height);
    } else {
      ctx.strokeStyle = palette.trackEdge;
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
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const data = world.getComponent(entity, "TrackZoneData");
    const render = world.getComponent(entity, "Render");
    if (!data && !render) return;

    const width = data?.width ?? 140;
    const height = data?.height ?? 140;
    const surface = data?.surface ?? "water";
    const halfW = width / 2;
    const halfH = height / 2;

    ctx.save();

    if (surface === "water") {
      ctx.fillStyle = "#FFFDF0";
      ctx.strokeStyle = palette.player;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#FFFFFF";
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-halfW * 0.3, -halfH * 0.3, halfW * 0.3, 0.2, Math.PI * 0.9);
      ctx.stroke();
    } else if (surface === "oil") {
      ctx.fillStyle = "rgba(25, 25, 30, 0.75)";
      ctx.beginPath();
      ctx.ellipse(0, 0, halfW, halfH, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(-halfW * 0.1, -halfH * 0.1, halfW * 0.4, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = "#ff2a6d";
      ctx.beginPath();
      ctx.arc(halfW * 0.1, halfH * 0.1, halfW * 0.3, Math.PI, Math.PI * 2);
      ctx.stroke();
    } else if (surface === "deadly_edge") {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-halfW, -halfH, width, height);
      ctx.clip();

      ctx.fillStyle = palette.accent;
      ctx.fillRect(-halfW, -halfH, width, height);

      ctx.fillStyle = palette.outline;
      for (let x = -halfW - height; x < halfW + height; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, -halfH);
        ctx.lineTo(x + 12, -halfH);
        ctx.lineTo(x - 8, halfH);
        ctx.lineTo(x - 20, halfH);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else {
      ctx.fillStyle = palette.danger;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(halfW, halfH), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
};

export const drawTrackObstacle: ShapeDrawer<CanvasRenderingContext2D, RacingComponentRegistry> = {
  draw(ctx, world, entity) {
    const palette = getRacingPalette(world as unknown as World<RacingComponentRegistry, RacingEventRegistry>);
    const data = world.getComponent(entity, "TrackObstacleData");
    const render = world.getComponent(entity, "Render");
    if (!data && !render) return;

    const radius = data?.radius ?? render?.size ?? 30;
    const kind = data?.kind ?? "bowl";
    const id = data?.id ?? "";

    ctx.save();

    ctx.fillStyle = palette.shadow;
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.arc(4, 5, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1.0;

    if (kind === "bowl") {
      ctx.fillStyle = "#F8FAFC";
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#FFFEE0";
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 2.5;
      const numRings = 5;
      for (let i = 0; i < numRings; i += 1) {
        const angle = (i * Math.PI * 2) / numRings;
        const dist = radius * 0.45;
        const cx = Math.cos(angle) * dist;
        const cy = Math.sin(angle) * dist;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.15, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (kind === "mug") {
      ctx.fillStyle = palette.obstacle;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(radius * 0.95, 0, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#3D2314";
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#8C5638";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-radius * 0.2, -radius * 0.2, radius * 0.3, 0.4, Math.PI * 1.2);
      ctx.stroke();
    } else if (kind === "billiard_ball") {
      const isEight = id.includes("eight") || id.includes("8");
      const isCue = id.includes("cue");

      ctx.fillStyle = isCue ? "#FFFFFF" : isEight ? "#111827" : palette.obstacle;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      if (!isCue) {
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.font = `bold ${Math.round(radius * 0.55)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(isEight ? "8" : "1", 0, 0);
      }
    } else {
      ctx.fillStyle = palette.obstacle;
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
};
