/**
 * Canvas EffectDrawer for procedural Hit&Run backdrop (BackdropGenerator).
 * Presentation-only: cinematic sky, layered terrain, soft water & particles.
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

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function resolveMainCameraX(world: {
  query: (t: string) => readonly number[];
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

/** Smooth polyline with quadratic midpoints for softer ridgelines. */
function strokeSmoothRidge(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  offsetX: number
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x + offsetX, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2 + offsetX;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x + offsetX, points[i].y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x + offsetX, last.y);
}

function fillSmoothTerrain(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  offsetX: number,
  bottomY: number
): void {
  if (points.length < 2) return;
  strokeSmoothRidge(ctx, points, offsetX);
  const last = points[points.length - 1];
  const first = points[0];
  ctx.lineTo(last.x + offsetX, bottomY);
  ctx.lineTo(first.x + offsetX, bottomY);
  ctx.closePath();
  ctx.fill();
}

/* -------------------------------------------------------------------------- */
/*  Sky                                                                        */
/* -------------------------------------------------------------------------- */

function drawSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: BackdropSpec["theme"],
  elapsed: number
): void {
  // Deep multi-stop vertical sky
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, theme.skyGradientTop);
  grad.addColorStop(0.35, "#120c1c");
  grad.addColorStop(0.62, "#1c1228");
  grad.addColorStop(0.82, theme.skyGradientBottom);
  grad.addColorStop(1, "#3a2040");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Warm horizon bloom (subtle dusk)
  const bloom = ctx.createRadialGradient(w * 0.5, h * 0.72, 0, w * 0.5, h * 0.72, w * 0.55);
  bloom.addColorStop(0, "rgba(255, 90, 100, 0.14)");
  bloom.addColorStop(0.45, "rgba(180, 60, 90, 0.06)");
  bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  // Cool upper glow
  const zenith = ctx.createRadialGradient(w * 0.35, h * 0.12, 0, w * 0.35, h * 0.12, w * 0.4);
  zenith.addColorStop(0, "rgba(80, 100, 180, 0.08)");
  zenith.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = zenith;
  ctx.fillRect(0, 0, w, h);

  // Soft stars (deterministic positions from index)
  ctx.save();
  for (let i = 0; i < 48; i++) {
    const sx = ((i * 97 + 13) % 1000) / 1000 * w;
    const sy = ((i * 53 + 29) % 1000) / 1000 * h * 0.55;
    const twinkle = 0.35 + 0.45 * Math.sin(elapsed * (1.2 + (i % 5) * 0.3) + i);
    const r = 0.6 + (i % 3) * 0.45;
    ctx.globalAlpha = twinkle * 0.7;
    ctx.fillStyle = i % 7 === 0 ? theme.accentGlow : "#e8e4f0";
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*  Fantasy features                                                           */
/* -------------------------------------------------------------------------- */

function drawFantasyFeature(
  ctx: CanvasRenderingContext2D,
  f: FantasyFeatureSpec,
  offsetX: number,
  elapsed: number
): void {
  const x = f.x + offsetX;
  const y = f.y;
  const s = f.scale * 22;
  const accent = f.colorToken ?? "#ff8aa0";

  ctx.save();
  ctx.globalAlpha = f.alpha;

  switch (f.type) {
    case "twin_moons": {
      // Soft outer halos
      const drawMoon = (mx: number, my: number, radius: number, a: number) => {
        const halo = ctx.createRadialGradient(mx, my, radius * 0.3, mx, my, radius * 2.4);
        halo.addColorStop(0, "rgba(255, 200, 210, 0.35)");
        halo.addColorStop(0.4, "rgba(255, 120, 140, 0.12)");
        halo.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.globalAlpha = a * f.alpha;
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(mx, my, radius * 2.4, 0, Math.PI * 2);
        ctx.fill();

        const body = ctx.createRadialGradient(mx - radius * 0.25, my - radius * 0.25, 0, mx, my, radius);
        body.addColorStop(0, "#fff5f7");
        body.addColorStop(0.55, "#f0c0c8");
        body.addColorStop(1, "#c08090");
        ctx.globalAlpha = a * f.alpha;
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(mx, my, radius, 0, Math.PI * 2);
        ctx.fill();
      };
      drawMoon(x, y, s * 1.15, 1);
      drawMoon(x + s * 2.1, y + s * 0.35, s * 0.72, 0.9);
      break;
    }

    case "aurora": {
      const bands = 4;
      for (let b = 0; b < bands; b++) {
        const phase = elapsed * (0.4 + b * 0.08) + b * 0.7;
        const amp = s * (0.9 + b * 0.25);
        const baseY = y + b * s * 0.35;
        ctx.beginPath();
        const steps = 24;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const px = x - s * 5 + t * s * 10;
          const py =
            baseY +
            Math.sin(t * Math.PI * 2.2 + phase) * amp +
            Math.sin(t * Math.PI * 4 + phase * 1.3) * amp * 0.25;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        // mirror downward for filled ribbon
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const px = x - s * 5 + t * s * 10;
          const py =
            baseY +
            18 +
            b * 6 +
            Math.sin(t * Math.PI * 2.2 + phase) * amp * 0.3;
          ctx.lineTo(px, py);
        }
        ctx.closePath();
        const colors = [
          "rgba(100, 255, 200, 0.12)",
          "rgba(120, 180, 255, 0.10)",
          "rgba(200, 120, 255, 0.09)",
          "rgba(255, 100, 160, 0.07)"
        ];
        ctx.fillStyle = colors[b % colors.length];
        ctx.globalAlpha = f.alpha * (0.85 - b * 0.12);
        ctx.fill();
      }
      break;
    }

    case "floating_island": {
      // Soft shadow under island
      ctx.globalAlpha = f.alpha * 0.25;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(x, y + s * 1.1, s * 2.0, s * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = f.alpha;
      const rock = ctx.createLinearGradient(x, y - s * 2, x, y + s);
      rock.addColorStop(0, "#5a4868");
      rock.addColorStop(0.5, accent);
      rock.addColorStop(1, "#2a1c30");
      ctx.fillStyle = rock;
      ctx.beginPath();
      ctx.moveTo(x - s * 2.4, y);
      ctx.quadraticCurveTo(x - s * 1.2, y - s * 0.9, x, y - s * 0.5);
      ctx.quadraticCurveTo(x + s * 1.2, y - s * 0.9, x + s * 2.4, y);
      ctx.quadraticCurveTo(x + s * 1.5, y + s * 0.9, x, y + s * 0.7);
      ctx.quadraticCurveTo(x - s * 1.5, y + s * 0.9, x - s * 2.4, y);
      ctx.closePath();
      ctx.fill();

      // Small plateau top
      ctx.fillStyle = "rgba(255, 200, 210, 0.15)";
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.35, s * 1.1, s * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "giant_tree": {
      // Trunk
      const trunk = ctx.createLinearGradient(x - s * 0.3, y, x + s * 0.3, y);
      trunk.addColorStop(0, "#2a1820");
      trunk.addColorStop(0.5, "#4a3040");
      trunk.addColorStop(1, "#2a1820");
      ctx.fillStyle = trunk;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.28, y + s * 1.6);
      ctx.lineTo(x - s * 0.18, y - s * 0.4);
      ctx.lineTo(x + s * 0.18, y - s * 0.4);
      ctx.lineTo(x + s * 0.28, y + s * 1.6);
      ctx.closePath();
      ctx.fill();

      // Canopy layers
      const canopyColors = ["#3a2848", accent, "#2c2038"];
      const canopyYs = [y - s * 0.6, y - s * 1.3, y - s * 1.9];
      const canopyRs = [s * 1.6, s * 1.25, s * 0.85];
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = canopyColors[c];
        ctx.globalAlpha = f.alpha * (0.95 - c * 0.05);
        ctx.beginPath();
        ctx.ellipse(x, canopyYs[c], canopyRs[c], canopyRs[c] * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "crystal_spire":
    default: {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 14;
      const crystal = ctx.createLinearGradient(x, y - s * 2.4, x, y + s);
      crystal.addColorStop(0, "#ffffff");
      crystal.addColorStop(0.35, accent);
      crystal.addColorStop(1, "#4a2030");
      ctx.fillStyle = crystal;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 2.4);
      ctx.lineTo(x + s * 0.55, y + s * 0.2);
      ctx.lineTo(x + s * 0.15, y + s * 0.9);
      ctx.lineTo(x - s * 0.15, y + s * 0.9);
      ctx.lineTo(x - s * 0.55, y + s * 0.2);
      ctx.closePath();
      ctx.fill();
      // Highlight facet
      ctx.shadowBlur = 0;
      ctx.globalAlpha = f.alpha * 0.45;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(x, y - s * 2.2);
      ctx.lineTo(x + s * 0.2, y - s * 0.4);
      ctx.lineTo(x, y - s * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*  Water                                                                      */
/* -------------------------------------------------------------------------- */

function drawWaterfall(
  ctx: CanvasRenderingContext2D,
  wf: WaterfallSpec,
  offsetX: number,
  elapsed: number,
  color: string
): void {
  const x = wf.x + offsetX;
  const top = wf.topY;
  const bot = wf.bottomY;
  const height = bot - top;
  if (height <= 0) return;

  ctx.save();

  // Mist pool at base
  const mist = ctx.createRadialGradient(x, bot, 2, x, bot, wf.width * 2.5);
  mist.addColorStop(0, "rgba(200, 230, 255, 0.35)");
  mist.addColorStop(0.5, "rgba(140, 190, 230, 0.12)");
  mist.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalAlpha = wf.alpha * 0.8;
  ctx.fillStyle = mist;
  ctx.beginPath();
  ctx.ellipse(x, bot + 4, wf.width * 2.2, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main column gradient
  const col = ctx.createLinearGradient(x - wf.width / 2, top, x + wf.width / 2, top);
  col.addColorStop(0, "rgba(100, 180, 220, 0.15)");
  col.addColorStop(0.35, color);
  col.addColorStop(0.5, "rgba(255, 255, 255, 0.75)");
  col.addColorStop(0.65, color);
  col.addColorStop(1, "rgba(100, 180, 220, 0.15)");
  ctx.globalAlpha = wf.alpha * 0.7;
  ctx.fillStyle = col;
  const sway = Math.sin(elapsed * 5 + wf.x * 0.02) * 1.5;
  ctx.fillRect(x - wf.width / 2 + sway, top, wf.width, height);

  // Streaming highlight lines
  ctx.globalAlpha = wf.alpha * 0.4;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const lx = x - wf.width * 0.25 + i * (wf.width * 0.25) + Math.sin(elapsed * 7 + i) * 2;
    const flow = ((elapsed * 80 + i * 40) % height);
    ctx.beginPath();
    ctx.moveTo(lx, top + flow);
    ctx.lineTo(lx, Math.min(bot, top + flow + 18));
    ctx.stroke();
  }

  ctx.restore();
}

function drawRiver(
  ctx: CanvasRenderingContext2D,
  river: RiverSpec,
  offsetX: number
): void {
  if (river.path.length < 2) return;
  ctx.save();

  // Soft outer glow
  ctx.strokeStyle = river.colorToken;
  ctx.lineWidth = river.width * 1.35;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.25;
  strokeSmoothRidge(ctx, river.path, offsetX);
  ctx.stroke();

  // Body
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = river.width;
  strokeSmoothRidge(ctx, river.path, offsetX);
  ctx.stroke();

  // Specular highlight
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "rgba(200, 230, 255, 0.9)";
  ctx.lineWidth = Math.max(2, river.width * 0.22);
  strokeSmoothRidge(ctx, river.path, offsetX);
  ctx.stroke();

  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*  Terrain                                                                    */
/* -------------------------------------------------------------------------- */

function drawTerrainLayer(
  ctx: CanvasRenderingContext2D,
  layer: BackdropLayerSpec,
  offsetX: number,
  viewportHeight: number,
  fogColor: string
): void {
  if (!layer.points.length) return;

  const first = layer.points[0];
  const last = layer.points[layer.points.length - 1];
  const minY = layer.points.reduce((m, p) => Math.min(m, p.y), first.y);
  const bottom = viewportHeight + 60;

  ctx.save();

  // Base fill with vertical depth gradient
  const fillGrad = ctx.createLinearGradient(0, minY - 20, 0, bottom);
  fillGrad.addColorStop(0, layer.fillColorToken);
  fillGrad.addColorStop(0.55, layer.fillColorToken);
  fillGrad.addColorStop(1, "#0c0814");
  ctx.globalAlpha = layer.alpha;
  ctx.fillStyle = fillGrad;
  fillSmoothTerrain(ctx, layer.points, offsetX, bottom);

  // Atmospheric fog wash over the silhouette
  if (layer.fogFactor > 0.01) {
    ctx.globalAlpha = layer.fogFactor * 0.55;
    ctx.fillStyle = fogColor;
    fillSmoothTerrain(ctx, layer.points, offsetX, bottom);
  }

  // Soft ridge highlight / rim light
  if (layer.strokeColorToken) {
    ctx.globalAlpha = layer.alpha * 0.35;
    ctx.strokeStyle = layer.strokeColorToken;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    strokeSmoothRidge(ctx, layer.points, offsetX);
    ctx.stroke();

    // thinner bright edge
    ctx.globalAlpha = layer.alpha * 0.15;
    ctx.strokeStyle = "rgba(255, 220, 230, 0.5)";
    ctx.lineWidth = 1;
    strokeSmoothRidge(ctx, layer.points, offsetX);
    ctx.stroke();
  }

  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*  Atmospheric band between depths                                            */
/* -------------------------------------------------------------------------- */

function drawHazeBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  height: number,
  color: string,
  alpha: number
): void {
  const g = ctx.createLinearGradient(0, y, 0, y + height);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.4, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(0, y, w, height);
  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*  Particles                                                                  */
/* -------------------------------------------------------------------------- */

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: BackdropParticleSpec[],
  elapsed: number,
  w: number,
  h: number
): void {
  ctx.save();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    let x = p.x + p.speedX * elapsed;
    let y = p.y + p.speedY * elapsed;
    x = ((x % w) + w) % w;
    y = ((y % h) + h) % h;

    const pulse = 0.7 + 0.3 * Math.sin(elapsed * 2.5 + i * 1.7);
    const r = p.size * pulse;

    // Soft glow core
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    glow.addColorStop(0, p.colorToken);
    glow.addColorStop(0.4, p.colorToken);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = p.alpha * 0.45 * pulse;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = p.alpha * pulse;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.8, r * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*  Playfield vignette / mask                                                  */
/* -------------------------------------------------------------------------- */

function drawPlayfieldMask(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mask: BackdropSpec["playfieldMask"],
  theme: BackdropSpec["theme"]
): void {
  if (!mask?.enabled) return;

  ctx.save();
  // Soft vertical gradient instead of a hard rectangle
  const g = ctx.createLinearGradient(0, mask.y - 40, 0, mask.y + mask.height);
  const c = mask.colorToken || theme.maskColor || "#05040a";
  g.addColorStop(0, "rgba(5, 4, 10, 0)");
  g.addColorStop(0.25, c);
  g.addColorStop(1, c);
  ctx.globalAlpha = mask.opacity;
  ctx.fillStyle = g;
  ctx.fillRect(0, mask.y - 40, w, mask.height + 40);

  // Side vignettes for focus on the action
  const sideL = ctx.createLinearGradient(0, 0, w * 0.12, 0);
  sideL.addColorStop(0, "rgba(0,0,0,0.35)");
  sideL.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = sideL;
  ctx.fillRect(0, 0, w * 0.12, h);

  const sideR = ctx.createLinearGradient(w, 0, w * 0.88, 0);
  sideR.addColorStop(0, "rgba(0,0,0,0.35)");
  sideR.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sideR;
  ctx.fillRect(w * 0.88, 0, w * 0.12, h);

  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/*  Main drawer                                                                */
/* -------------------------------------------------------------------------- */

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

    // 1. Sky + stars + horizon bloom
    drawSky(ctx, w, h, theme, elapsed);

    // 2. Sky features (moons / aurora) — very slight parallax
    for (let i = 0; i < spec.skyFeatures.length; i++) {
      drawFantasyFeature(ctx, spec.skyFeatures[i], -camX * 0.04, elapsed);
    }

    // 3. Terrain layers far → near
    const layers: BackdropLayerSpec[] = [];
    for (let c = 0; c < spec.chunks.length; c++) {
      const chunk = spec.chunks[c];
      for (let L = 0; L < chunk.layers.length; L++) {
        layers.push(chunk.layers[L]);
      }
    }
    layers.sort((a, b) => a.depth - b.depth);

    let prevDepth = 0;
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const offsetX = -camX * layer.depth;

      // Soft atmospheric separation between depth planes
      if (i > 0) {
        const bandY = h * (0.35 + layer.depth * 0.25);
        drawHazeBand(ctx, w, bandY - 30, 70, theme.fogColor, 0.18 + layer.fogFactor * 0.15);
      }
      prevDepth = layer.depth;

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

    // 4. Ambient motes
    drawParticles(ctx, spec.particles, elapsed, w, h);

    // 5. Playfield readability + vignette
    drawPlayfieldMask(ctx, w, h, spec.playfieldMask, theme);

    void prevDepth;
  }
};

export const HIT_RUN_BACKDROP_RESOURCE = RESOURCE_KEY;
