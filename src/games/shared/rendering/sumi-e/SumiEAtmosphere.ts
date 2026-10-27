/**
 * SumiEAtmosphere.ts
 * Phase 3: extra atmospheric layers and particle helpers for shan-shui depth.
 *
 * - Extended ink-wash layer stacks (architecture / near foreground)
 * - Deterministic mist bands
 * - Ambient particle spawners (petals, residual ink dots, distant birds as points)
 * - Camera-aware parallax mapping aligned with ParallaxSystem factors
 */

import type { InkWashLayerSpec } from "../InkWashParallaxBackdrop";
import { DEFAULT_INK_WASH_LAYERS, MOUNTAIN_INK_WASH_LAYERS, COASTAL_INK_WASH_LAYERS } from "../InkWashParallaxBackdrop";
import { PARALLAX_FACTORS, type ParallaxLayerName, computeParallaxOffset } from "../ParallaxSystem";
import type { VisualParticlePool } from "../VisualParticlePool";
import { SUMI_E_PALETTE } from "./SumiEPalette";

/** Full atmospheric stack: sky void → far mountains → mid → architecture → near foliage. */
export const ATMOSPHERE_INK_WASH_LAYERS: readonly InkWashLayerSpec[] = [
  { depth: 0.04, alpha: 0.05, yRatio: 0.12, height: 180 }, // far mist mountains
  { depth: 0.1, alpha: 0.1, yRatio: 0.22, height: 140 },
  { depth: 0.18, alpha: 0.16, yRatio: 0.32, height: 110 },
  { depth: 0.3, alpha: 0.22, yRatio: 0.42, height: 85 }, // mid hills
  { depth: 0.42, alpha: 0.28, yRatio: 0.5, height: 60 }, // architecture / houses
  { depth: 0.55, alpha: 0.34, yRatio: 0.58, height: 40 } // near foliage / rocks
];

export type AtmospherePreset = "default" | "mountain" | "coastal" | "atmosphere";

export function getAtmosphereLayers(preset: AtmospherePreset = "atmosphere"): readonly InkWashLayerSpec[] {
  switch (preset) {
    case "mountain":
      return MOUNTAIN_INK_WASH_LAYERS;
    case "coastal":
      return COASTAL_INK_WASH_LAYERS;
    case "default":
      return DEFAULT_INK_WASH_LAYERS;
    default:
      return ATMOSPHERE_INK_WASH_LAYERS;
  }
}

/** Map ink-wash depth to ParallaxSystem layer names for consistent camera coupling. */
export function inkDepthToParallaxLayer(depth: number): ParallaxLayerName {
  if (depth < 0.08) return "layer1_nebula";
  if (depth < 0.2) return "layer2_distant_stars";
  if (depth < 0.35) return "layer3_near_stars";
  if (depth < 0.5) return "layer4_distant_asteroids";
  return "layer5_near_objects";
}

/** Camera X for ink-wash from ParallaxSystem factors (world camera → layer offset). */
export function cameraXForInkLayer(cameraX: number, layerDepth: number, multiplier = 1): number {
  const name = inkDepthToParallaxLayer(layerDepth);
  // invert: ink uses offset = -cameraX * depth; parallax uses cameraX * factor
  const { offsetX } = computeParallaxOffset(cameraX, 0, name, multiplier);
  // Use layer's own depth when closer match desired
  return cameraX * layerDepth * multiplier || offsetX;
}

// ─── Mist bands (deterministic, no RNG) ───────────────────────────────────────

export interface MistBandSpec {
  yRatio: number;
  height: number;
  alpha: number;
  speed: number; // phase speed
  depth: number;
}

export const DEFAULT_MIST_BANDS: readonly MistBandSpec[] = [
  { yRatio: 0.35, height: 40, alpha: 0.06, speed: 0.15, depth: 0.12 },
  { yRatio: 0.48, height: 28, alpha: 0.08, speed: 0.22, depth: 0.25 },
  { yRatio: 0.62, height: 22, alpha: 0.05, speed: 0.18, depth: 0.4 }
];

export interface MistBandGeometry {
  y: number;
  h: number;
  alpha: number;
  phase: number;
}

export function computeMistBands(
  h: number,
  timeSec: number,
  cameraX: number,
  bands: readonly MistBandSpec[] = DEFAULT_MIST_BANDS
): MistBandGeometry[] {
  return bands.map((b) => ({
    y: h * b.yRatio,
    h: b.height,
    alpha: b.alpha,
    phase: timeSec * b.speed + cameraX * b.depth * 0.001
  }));
}

/** Canvas: soft horizontal mist rectangles with sine alpha modulation. */
export function drawMistBandsCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  bands: readonly MistBandGeometry[],
  color = SUMI_E_PALETTE.paperWarm
): void {
  for (const b of bands) {
    const a = b.alpha * (0.7 + 0.3 * Math.sin(b.phase));
    ctx.fillStyle = color;
    ctx.globalAlpha = a;
    ctx.fillRect(0, b.y, w, b.h);
  }
  ctx.globalAlpha = 1;
}

// ─── Ambient particles (petals, ink residual, birds) ───────────────────────────

export type AmbientParticleKind = "petal" | "ink_dot" | "bird";

export interface AmbientSpawnOptions {
  kind: AmbientParticleKind;
  x: number;
  y: number;
  /** Optional direction bias. */
  windX?: number;
  windY?: number;
}

const PETAL_COLOR = "#c4a090";
const INK_DOT_COLOR = SUMI_E_PALETTE.inkSoft;
const BIRD_COLOR = SUMI_E_PALETTE.ink;

/**
 * Spawns a single ambient particle into a VisualParticlePool.
 * Deterministic velocities when seed-like values are passed via wind.
 */
export function spawnAmbientParticle(
  pool: VisualParticlePool,
  opts: AmbientSpawnOptions
): void {
  const windX = opts.windX ?? -12;
  const windY = opts.windY ?? 8;

  switch (opts.kind) {
    case "petal":
      pool.spawn(opts.x, opts.y, windX * 0.4, windY * 0.3, 2.5, 3, PETAL_COLOR, {
        type: "petal",
        angle: 0,
        angularVelocity: 1.2
      });
      break;
    case "ink_dot":
      pool.spawn(opts.x, opts.y, windX * 0.1, windY * 0.05, 1.2, 2, INK_DOT_COLOR, {
        type: "ink_dot"
      });
      break;
    case "bird":
      pool.spawn(opts.x, opts.y, windX * 1.5, windY * -0.2, 4.0, 2.5, BIRD_COLOR, {
        type: "bird",
        angle: 0
      });
      break;
  }
}

/**
 * Deterministic ambient burst along a horizontal band (e.g. each N frames).
 * Uses index-based positions — no Math.random.
 */
export function spawnAmbientBand(
  pool: VisualParticlePool,
  kind: AmbientParticleKind,
  count: number,
  viewportW: number,
  y: number,
  tick: number
): void {
  for (let i = 0; i < count; i++) {
    const t = (tick * 0.1 + i * 1.618) % 1;
    const x = t * viewportW;
    const windPhase = Math.sin(tick * 0.05 + i);
    spawnAmbientParticle(pool, {
      kind,
      x,
      y: y + windPhase * 10,
      windX: -10 - windPhase * 5,
      windY: 4 + windPhase * 3
    });
  }
}

// ─── Regional / LevelTheme bridge ─────────────────────────────────────────────

export type SumiERegionId = "mountain" | "coast" | "forest" | "winter" | "village";

export interface RegionalAtmosphere {
  region: SumiERegionId;
  layers: readonly InkWashLayerSpec[];
  mist: readonly MistBandSpec[];
  ambientKinds: AmbientParticleKind[];
  paperHint: string;
  inkHint: string;
}

export const REGIONAL_ATMOSPHERES: Record<SumiERegionId, RegionalAtmosphere> = {
  mountain: {
    region: "mountain",
    layers: MOUNTAIN_INK_WASH_LAYERS,
    mist: DEFAULT_MIST_BANDS,
    ambientKinds: ["bird", "ink_dot"],
    paperHint: SUMI_E_PALETTE.paper,
    inkHint: SUMI_E_PALETTE.ink
  },
  coast: {
    region: "coast",
    layers: COASTAL_INK_WASH_LAYERS,
    mist: [
      { yRatio: 0.5, height: 50, alpha: 0.07, speed: 0.2, depth: 0.15 },
      { yRatio: 0.65, height: 30, alpha: 0.05, speed: 0.28, depth: 0.3 }
    ],
    ambientKinds: ["petal", "ink_dot"],
    paperHint: SUMI_E_PALETTE.paper,
    inkHint: SUMI_E_PALETTE.distantBlue
  },
  forest: {
    region: "forest",
    layers: ATMOSPHERE_INK_WASH_LAYERS,
    mist: DEFAULT_MIST_BANDS,
    ambientKinds: ["petal", "bird"],
    paperHint: "#e4e6d8",
    inkHint: SUMI_E_PALETTE.ink
  },
  winter: {
    region: "winter",
    layers: MOUNTAIN_INK_WASH_LAYERS,
    mist: [
      { yRatio: 0.3, height: 60, alpha: 0.09, speed: 0.12, depth: 0.1 },
      { yRatio: 0.55, height: 40, alpha: 0.06, speed: 0.16, depth: 0.28 }
    ],
    ambientKinds: ["ink_dot"],
    paperHint: "#eef0f2",
    inkHint: "#1a1c1e"
  },
  village: {
    region: "village",
    layers: DEFAULT_INK_WASH_LAYERS,
    mist: DEFAULT_MIST_BANDS,
    ambientKinds: ["petal", "bird", "ink_dot"],
    paperHint: SUMI_E_PALETTE.paperWarm,
    inkHint: SUMI_E_PALETTE.ink
  }
};

export function getRegionalAtmosphere(region: SumiERegionId = "mountain"): RegionalAtmosphere {
  return REGIONAL_ATMOSPHERES[region] ?? REGIONAL_ATMOSPHERES.mountain;
}

/** Expose parallax factor table for documentation / debug. */
export const SUMI_PARALLAX_FACTORS = PARALLAX_FACTORS;
