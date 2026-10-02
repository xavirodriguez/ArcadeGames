/**
 * Canvas EffectDrawer for procedural Hit&Run backdrop (BackdropGenerator spec).
 * Presentation-only: reads HitRunBackdropSpec resource; no sim writes.
 */
import type {
  EffectDrawer,
  CoreComponentRegistry,
  BackdropSpec,
  BackdropLayerSpec,
  FantasyFeatureSpec,
  WaterfallSpec,
  RiverSpec,
  BackdropParticleSpec,
  Camera2DComponent,
  RunState
} from "@tiny-aster/core";

const RESOURCE_KEY = "HitRunBackdropSpec";

function resolveMainCameraX(world: {
  query: (t: string) => number[];
  getComponent: (e: number, t: string) => unknown;
}): number {
  const cameras = world.query("Camera2D");
  for (let i = 0; i < cameras.length; i++) {
    const cam = world.getComponent(cameras[i], "Camera2D") as Camera2DComponent | undefined;
    if (cam?.isMain) return cam.x ?? 0;
  }
  return 0;
}

function resolveElapsed(world: {
  getResource: (k: string) => unknown;
  tick?: number;
}): number {
  const rs = world.getResource("RunState") as RunState | undefined;
  if (rs && typeof rs.elapsedTime === "number") return rs.elapsedTime;
  return ((world as { tick?: number }).tick ?? 0) / 60;
}

function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: BackdropSpec["theme"]
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, theme.skyGradientTop);
  grad.addColorStop(1, theme.skyGradientBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawFantasyFeature(
  ctx: CanvasRenderingContext2D,
  f: FantasyFeatureSpec,
  offsetX: number,
  elapsed: number
): void {
  const x = f.x + offsetX;
  const y = f.y;
  const s = f.scale * 20;
  ctx.save();
  ctx.globalAlpha = f.alpha;
  ctx.fillStyle = f.colorToken ?? "#c0a0ff";
  ctx.strokeStyle = f.colorToken ?? "#e0c0ff";

  switch (f.type) {
    case "twin_moons": {
      ctx.shadowColor = f.colorToken ?? "#ff88aa";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(x, y, s * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 1.8, y + s * 0.3, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "aurora": {
      ctx.strokeStyle = f.colorToken ?? "#66ffcc";
      ctx.lineWidth = 3;
      ctx.globalAlpha = f.alpha * 0.55;
      ctx.beginPath();
      const waves = 5;
      for (let i = 0; i <= waves; i++) {
        const t = i / waves;
        const px = x - s * 4 + t * s * 8;
        const py = y + Math.sin(t * Math.PI * 2 + elapsed * 0.8) * s * 0.8;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    }
    case "floating_island": {
      ctx.beginPath();
      ctx.ellipse(x, y, s * 2.2, s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - s * 0.6, y - s * 1.8, s * 1.2, s * 1.5);
      break;
    }
    case "giant_tree": {
      ctx.fillStyle = "#3a2840";
      ctx.fillRect(x - s * 0.25, y - s * 0.5, s * 0.5, s * 2.2);
      ctx.fillStyle = f.colorToken ?? "#4a3050";
      ctx.beginPath();
      ctx.arc(x, y - s * 1.2, s * 1.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "crystal_spire":
    default: {
      ctx.beginPath();
      ctx.moveTo(x, y - s * 2);
      ctx.lineTo(x + s * 0.6, y + s);
      ctx.lineTo(x - s * 0.6, y + s);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawWaterfall(
  ctx: CanvasRenderingContext2D,
  wf: WaterfallSpec,
  offsetX: number,
  elapsed: number,
  color: string
): void {
  const x = wf.x + offsetX;
  ctx.save();
  ctx.globalAlpha = wf.alpha * 0.85;
  ctx.fillStyle = color;
  const pulse = 1 + Math.sin(elapsed * 6 + wf.x * 0.01) * 0.08;
  ctx.fillRect(x - (wf.width * pulse) / 2, wf.topY, wf.width * pulse, wf.bottomY - wf.topY);
  ctx.globalAlpha = wf.alpha * 0.35;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - wf.width * 0.15, wf.topY, wf.width * 0.3, wf.bottomY - wf.topY);
  ctx.restore();
}

function drawRiver(
  ctx: CanvasRenderingContext2D,
  river: RiverSpec,
  offsetX: number
): void {
  if (!river.path.length) return;
  ctx.save();
  ctx.strokeStyle = river.colorToken;
  ctx.lineWidth = river.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(river.path[0].x + offsetX, river.path[0].y);
  for (let i = 1; i < river.path.length; i++) {
    ctx.lineTo(river.path[i].x + offsetX, river.path[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTerrainLayer(
  ctx: CanvasRenderingContext2D,
  layer: BackdropLayerSpec,
  offsetX: number,
  viewportHeight: number,
  fogColor: string
): void {
  if (!layer.points.length) return;
  ctx.save();
  ctx.globalAlpha = layer.alpha;
  ctx.fillStyle = layer.fillColorToken;
  ctx.beginPath();
  const first = layer.points[0];
  ctx.moveTo(first.x + offsetX, first.y);
  for (let i = 1; i < layer.points.length; i++) {
    const p = layer.points[i];
    ctx.lineTo(p.x + offsetX, p.y);
  }
  const last = layer.points[layer.points.length - 1];
  ctx.lineTo(last.x + offsetX, viewportHeight + 40);
  ctx.lineTo(first.x + offsetX, viewportHeight + 40);
  ctx.closePath();
  ctx.fill();

  if (layer.fogFactor > 0) {
    ctx.globalAlpha = layer.fogFactor * 0.5;
    ctx.fillStyle = fogColor;
    ctx.fill();
  }

  if (layer.strokeColorToken) {
    ctx.globalAlpha = layer.alpha * 0.6;
    ctx.strokeStyle = layer.strokeColorToken;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(first.x + offsetX, first.y);
    for (let i = 1; i < layer.points.length; i++) {
      ctx.lineTo(layer.points[i].x + offsetX, layer.points[i].y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: BackdropParticleSpec[],
  elapsed: number,
  w: number,
  h: number
): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    let x = p.x + p.speedX * elapsed;
    let y = p.y + p.speedY * elapsed;
    x = ((x % w) + w) % w;
    y = ((y % h) + h) % h;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.colorToken;
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Background effect: procedural fantasy landscape with camera parallax.
 */
export const drawHitRunProceduralBackdrop: EffectDrawer<
  CanvasRenderingContext2D,
  CoreComponentRegistry
> = {
  draw(ctx, world) {
    const spec = world.getResource(RESOURCE_KEY) as BackdropSpec | undefined;
    if (!spec) return;

    const w = spec.viewportWidth;
    const h = spec.viewportHeight;
    const camX = resolveMainCameraX(world);
    const elapsed = resolveElapsed(world);
    const theme = spec.theme;

    drawSky(ctx, w, h, theme);

    // Sky features (screen-space, slight parallax)
    for (let i = 0; i < spec.skyFeatures.length; i++) {
      drawFantasyFeature(ctx, spec.skyFeatures[i], -camX * 0.05, elapsed);
    }

    // Collect layers sorted by depth (far → near)
    const layers: { layer: BackdropLayerSpec; chunkOffset: number }[] = [];
    for (let c = 0; c < spec.chunks.length; c++) {
      const chunk = spec.chunks[c];
      for (let L = 0; L < chunk.layers.length; L++) {
        layers.push({ layer: chunk.layers[L], chunkOffset: 0 });
      }
    }
    layers.sort((a, b) => a.layer.depth - b.layer.depth);

    for (let i = 0; i < layers.length; i++) {
      const { layer } = layers[i];
      const offsetX = -camX * layer.depth;

      drawTerrainLayer(ctx, layer, offsetX, h, theme.fogColor);

      for (let r = 0; r < layer.rivers.length; r++) {
        drawRiver(ctx, layer.rivers[r], offsetX);
      }
      for (let wf = 0; wf < layer.waterfalls.length; wf++) {
        drawWaterfall(ctx, layer.waterfalls[wf], offsetX, elapsed, theme.waterfall);
      }
      for (let f = 0; f < layer.fantasyFeatures.length; f++) {
        drawFantasyFeature(ctx, layer.fantasyFeatures[f], offsetX, elapsed);
      }
    }

    drawParticles(ctx, spec.particles, elapsed, w, h);

    const mask = spec.playfieldMask;
    if (mask?.enabled) {
      ctx.save();
      ctx.globalAlpha = mask.opacity;
      ctx.fillStyle = mask.colorToken || theme.maskColor || "#000000";
      ctx.fillRect(mask.x, mask.y, mask.width, mask.height);
      ctx.restore();
    }
  }
};

export const HIT_RUN_BACKDROP_RESOURCE = RESOURCE_KEY;
