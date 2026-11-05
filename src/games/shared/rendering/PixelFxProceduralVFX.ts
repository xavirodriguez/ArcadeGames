/**
 * PixelFX-inspired procedural combat pilots.
 *
 * These are native ArcadeGames compositions, not a runtime dependency on PixelFX.
 * They use the same normalized TTL contract and IDrawAdapter for Canvas/Skia parity.
 */
import type {
  CoreComponentRegistry,
  ComponentRegistry,
  Renderer,
  RenderContext,
  ShapeDrawer
} from "@tiny-aster/core";
import { CanvasDrawAdapter, SkiaDrawAdapter, type IDrawAdapter } from "./DrawAdapter";
import { colors } from "../../../theme/colors";
import { ballistic } from "./vfx-geometry";
import { deriveSeed } from "./vfx-core";
import { createVFXTimelineSampler } from "./vfx-timeline";

interface EffectState {
  progress: number;
  alpha: number;
  size: number;
  color: string;
  rotation: number;
}

function readEffectState(
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): EffectState | null {
  const render = world.getComponent(entity, "Render");
  const ttl = world.getComponent(entity, "TTL");
  const transform = world.getComponent(entity, "Transform");
  if (!render || !ttl || ttl.timeLeft <= 0 || ttl.remaining <= 0) return null;

  const progress = Math.max(0, Math.min(1, 1 - ttl.remaining / ttl.timeLeft));
  const opacity = typeof render.opacity === "number" ? render.opacity : 1;
  const size = Math.max(1, (render.size ?? 20) * (transform?.scaleX ?? 1));
  return {
    progress,
    alpha: Math.max(0, Math.min(1, ttl.remaining / ttl.timeLeft)) * opacity,
    size,
    color: render.color ?? colors.white,
    rotation: transform?.rotation ?? 0
  };
}

function rotatePoint(x: number, y: number, angle: number): { x: number; y: number } {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

/** Expanding impact ring, radial rays and eight deterministic polygon shards. */
export function drawPixelFxImpact(
  draw: IDrawAdapter,
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const radius = size * (0.25 + p * 1.75);
  const fade = alpha * (1 - p * 0.25);

  draw.save();
  draw.strokeCircle(0, 0, radius, color, Math.max(1, size * 0.075 * (1 - p)), fade);
  draw.strokeCircle(0, 0, radius * 0.62, color, Math.max(0.75, size * 0.025), fade * 0.45);

  for (let i = 0; i < 8; i++) {
    const angle = rotation + (i * Math.PI) / 4;
    const inner = radius * (0.72 + (i % 2) * 0.08);
    const outer = radius * (1.05 + (i % 3) * 0.12);
    const a = rotatePoint(Math.cos(angle) * inner, Math.sin(angle) * inner, 0);
    const b = rotatePoint(Math.cos(angle + 0.09) * outer, Math.sin(angle + 0.09) * outer, 0);
    const c = rotatePoint(Math.cos(angle - 0.08) * outer * 0.78, Math.sin(angle - 0.08) * outer * 0.78, 0);
    draw.drawLine(a.x, a.y, b.x, b.y, color, Math.max(1, size * 0.055), fade);
    draw.drawLine(b.x, b.y, c.x, c.y, color, Math.max(1, size * 0.035), fade * 0.8);
    draw.drawLine(c.x, c.y, a.x, a.y, color, Math.max(1, size * 0.035), fade * 0.8);
  }
  draw.restore();
}

/** Directional curved slash: a tapered arc with trailing edge strokes. */
export function drawPixelFxSlash(
  draw: IDrawAdapter,
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const sweep = Math.PI * (0.42 + 0.28 * (1 - p));
  const start = rotation - sweep * 0.5 + p * 0.2;
  const radius = size * (0.9 + p * 0.35);

  draw.save();
  draw.drawArc(0, 0, radius, start, sweep, color, Math.max(1.2, size * 0.12 * (1 - p * 0.55)), alpha);
  draw.drawArc(0, 0, radius * 0.78, start + 0.12, sweep * 0.82, color, Math.max(0.8, size * 0.035), alpha * 0.58);
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const angle = start + sweep * t;
    const r0 = radius * (0.84 + (i % 2) * 0.08);
    const r1 = radius * (1.08 + (i % 3) * 0.07);
    draw.drawLine(
      Math.cos(angle) * r0,
      Math.sin(angle) * r0,
      Math.cos(angle + 0.045) * r1,
      Math.sin(angle + 0.045) * r1,
      color,
      Math.max(0.7, size * 0.025),
      alpha * (1 - t * 0.35)
    );
  }
  draw.restore();
}

const EXPLOSION_RING_SCALE = createVFXTimelineSampler([
  { start: 0, end: 0.16, from: 0.22, to: 1, easing: "ease-out" },
  { start: 0.16, end: 1, from: 1, to: 0.76, easing: "ease-out" }
]);
const EXPLOSION_RING_ALPHA = createVFXTimelineSampler([
  { start: 0, end: 0.2, from: 1, to: 0.72, easing: "ease-out" },
  { start: 0.2, end: 1, from: 0.72, to: 0, easing: "ease-in" }
]);
const EXPLOSION_SHARD_ALPHA = createVFXTimelineSampler([
  { start: 0, end: 0.72, from: 1, to: 0.62, easing: "linear" },
  { start: 0.72, end: 1, from: 0.62, to: 0, easing: "ease-in" }
]);

/** Radial breakup: seeded fragment variation and closed-form ballistic motion. */
export function drawPixelFxExplosion(
  draw: IDrawAdapter,
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const ringScale = EXPLOSION_RING_SCALE(p);
  const ringAlpha = alpha * EXPLOSION_RING_ALPHA(p);
  const gravity = ballistic(0, 0, size * 0.84, p);

  draw.save();
  draw.strokeCircle(0, 0, size * ringScale, color, Math.max(0.8, size * 0.04 * (1 - p)), ringAlpha);
  for (let i = 0; i < 10; i++) {
    // Derive each property from the entity identity and a stable stream index.
    // This avoids frame-order dependence and per-frame fragment-array allocation.
    const angleJitter = deriveSeed(entity >>> 0, i) / 0x100000000;
    const speedJitter = deriveSeed(entity >>> 0, i + 16) / 0x100000000;
    const angle = rotation + (i * Math.PI * 2) / 10 + (angleJitter - 0.5) * 0.2;
    const speed = 0.72 + speedJitter * 0.55;
    const travel = ballistic(0, size * (0.35 + speed * 0.65), 0, p);
    const x = Math.cos(angle) * travel;
    const y = Math.sin(angle) * travel + gravity;
    const tangent = size * (0.07 + (i % 3) * 0.025) * (1 - p * 0.35);
    const px = -Math.sin(angle) * tangent;
    const py = Math.cos(angle) * tangent;
    const tailRotation = p * (i % 2 === 0 ? 0.8 : -0.8);
    const tailCos = Math.cos(tailRotation);
    const tailSin = Math.sin(tailRotation);
    const tailX = px * tailCos - py * tailSin;
    const tailY = px * tailSin + py * tailCos;
    const shardAlpha = alpha * EXPLOSION_SHARD_ALPHA(p);
    draw.drawLine(x - tailX, y - tailY, x + tailX, y + tailY, color, Math.max(1, size * 0.045), shardAlpha);
    draw.drawLine(
      x + tailX,
      y + tailY,
      x + Math.cos(angle) * size * 0.09,
      y + Math.sin(angle) * size * 0.09 + gravity * 0.3,
      color,
      Math.max(0.7, size * 0.025),
      shardAlpha * (1 - p * 0.35)
    );
  }
  draw.restore();
}


/** Ground-contact dust: low, expanding puffs and short horizontal streaks. */
export function drawPixelFxDust(
  draw: IDrawAdapter,
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color } = state;
  const spread = size * (0.3 + p * 1.15);
  const fade = alpha * (1 - p * 0.35);

  draw.save();
  draw.drawArc(0, size * 0.08, spread * 0.58, Math.PI * 1.05, Math.PI * 0.9, color, Math.max(1, size * 0.045 * (1 - p)), fade * 0.65);
  for (let i = 0; i < 7; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const lane = Math.floor(i / 2);
    const x = side * spread * (0.28 + lane * 0.17);
    const y = size * (0.08 + (i % 3) * 0.035) - p * size * (0.12 + (i % 2) * 0.06);
    const radius = size * (0.055 + (i % 3) * 0.018) * (1 - p * 0.55);
    draw.fillCircle(x, y, radius, color, fade * (0.8 - (i % 3) * 0.12));
    draw.drawLine(x - radius * 1.8, y + radius * 0.35, x + radius * 1.2, y + radius * 0.35, color, Math.max(0.7, radius * 0.35), fade * 0.45);
  }
  draw.restore();
}

/** Pickup sparkle: compact halo, diamond facets and four-point glints. */
export function drawPixelFxPickup(
  draw: IDrawAdapter,
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color } = state;
  const radius = size * (0.22 + p * 0.95);
  const diamond = size * (0.18 + (1 - p) * 0.22);
  const fade = alpha * (1 - p * 0.2);

  draw.save();
  draw.strokeCircle(0, 0, radius, color, Math.max(0.8, size * 0.035 * (1 - p * 0.6)), fade * 0.65);
  draw.drawLine(0, -diamond, diamond * 0.62, 0, color, Math.max(1, size * 0.055), fade);
  draw.drawLine(diamond * 0.62, 0, 0, diamond, color, Math.max(1, size * 0.055), fade);
  draw.drawLine(0, diamond, -diamond * 0.62, 0, color, Math.max(1, size * 0.055), fade);
  draw.drawLine(-diamond * 0.62, 0, 0, -diamond, color, Math.max(1, size * 0.055), fade);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const inner = radius * 0.82;
    const outer = radius * (1.08 + (i % 2) * 0.18);
    draw.drawLine(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer, color, Math.max(0.8, size * 0.035), fade * 0.8);
  }
  draw.restore();
}

/** Muzzle flash: forward-facing flare, hot core and short recoil rays. */
export function drawPixelFxMuzzle(
  draw: IDrawAdapter,
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color } = state;
  const length = size * (0.55 + (1 - p) * 0.75);
  const width = size * (0.22 + (1 - p) * 0.13);
  const fade = alpha * (1 - p * 0.45);

  draw.save();
  draw.fillCircle(length * 0.12, 0, width * 0.45, color, fade);
  draw.drawLine(-size * 0.12, -width * 0.5, length, 0, color, Math.max(1, size * 0.08), fade);
  draw.drawLine(length, 0, -size * 0.12, width * 0.5, color, Math.max(1, size * 0.08), fade);
  for (let i = 0; i < 5; i++) {
    const offset = (i - 2) * 0.24;
    const endX = length * (0.72 + (i % 2) * 0.12);
    const endY = offset * width * (0.75 + p * 0.3);
    draw.drawLine(0, offset * width * 0.25, endX, endY, color, Math.max(0.7, size * 0.025), fade * (1 - Math.abs(offset) * 0.12));
  }
  draw.drawArc(0, 0, size * (0.25 + p * 0.08), -Math.PI * 0.45, Math.PI * 0.9, color, Math.max(0.8, size * 0.035), fade * 0.55);
  draw.restore();
}

/** Shield crack: segmented energy shell with deterministic radial fractures. */
export function drawPixelFxShieldCrack(
  draw: IDrawAdapter,
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color } = state;
  const radius = size * (0.55 + p * 0.45);
  const fade = alpha * (1 - p * 0.25);

  draw.save();
  draw.drawArc(0, 0, radius, -Math.PI * 0.82, Math.PI * 0.54, color, Math.max(1, size * 0.055 * (1 - p * 0.4)), fade);
  draw.drawArc(0, 0, radius, Math.PI * 0.08, Math.PI * 0.48, color, Math.max(1, size * 0.055 * (1 - p * 0.4)), fade * 0.85);
  draw.drawArc(0, 0, radius * 0.72, Math.PI * 0.72, Math.PI * 0.38, color, Math.max(0.8, size * 0.025), fade * 0.5);
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6 + 0.17;
    const inner = radius * (0.28 + (i % 2) * 0.12);
    const outer = radius * (0.72 + (i % 3) * 0.08);
    const kink = angle + (i % 2 === 0 ? 0.12 : -0.12);
    draw.drawLine(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(kink) * outer, Math.sin(kink) * outer, color, Math.max(0.8, size * 0.035), fade);
    draw.drawLine(Math.cos(kink) * outer, Math.sin(kink) * outer, Math.cos(angle + 0.08) * radius, Math.sin(angle + 0.08) * radius, color, Math.max(0.7, size * 0.022), fade * 0.75);
  }
  draw.restore();
}

/** Sumi-e death burst: ink drops, broken brush arcs and tapered radial strokes. */
export function drawPixelFxInkBurst(
  draw: IDrawAdapter,
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color } = state;
  const spread = size * (0.28 + p * 1.25);
  const fade = alpha * (1 - p * 0.25);

  draw.save();
  draw.drawArc(0, 0, spread * 0.58, -Math.PI * 0.78, Math.PI * 0.48, color, Math.max(1.2, size * 0.09 * (1 - p * 0.45)), fade);
  draw.drawArc(0, 0, spread * 0.78, Math.PI * 0.12, Math.PI * 0.42, color, Math.max(0.8, size * 0.04), fade * 0.65);
  for (let i = 0; i < 9; i++) {
    const angle = (i * Math.PI * 2) / 9 + (i % 2) * 0.13;
    const distance = spread * (0.48 + (i % 3) * 0.2);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const drop = size * (0.035 + (i % 4) * 0.018) * (1 - p * 0.3);
    draw.fillCircle(x, y, drop, color, fade * (0.9 - (i % 3) * 0.16));
    draw.drawLine(x, y, x + Math.cos(angle) * drop * 2.4, y + Math.sin(angle) * drop * 2.4, color, Math.max(0.8, drop * 0.45), fade * 0.8);
  }
  draw.restore();
}




function drawRotatedLine(
  draw: IDrawAdapter,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  alpha: number,
  cos: number,
  sin: number
): void {
  draw.drawLine(
    x1 * cos - y1 * sin,
    x1 * sin + y1 * cos,
    x2 * cos - y2 * sin,
    x2 * sin + y2 * cos,
    color,
    width,
    alpha
  );
}

/** Paddle contact: compressed impact crescent and directional rebound chevrons. */
export function drawPixelFxPaddleImpact(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const radius = size * (0.35 + p * 1.05);
  const fade = alpha * (1 - p * 0.35);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  draw.save();
  draw.drawArc(0, 0, radius, rotation - Math.PI * 0.42, Math.PI * 0.84, color, Math.max(1, size * 0.07 * (1 - p * 0.55)), fade);
  draw.drawArc(0, 0, radius * 0.62, rotation - Math.PI * 0.3, Math.PI * 0.6, color, Math.max(0.8, size * 0.03), fade * 0.55);
  for (let i = 0; i < 4; i++) {
    const lane = (i - 1.5) * 0.22;
    const y = lane * size;
    drawRotatedLine(draw, -size * 0.18, y, size * (0.55 + p * 0.7), y + lane * size * 0.28, color, Math.max(0.8, size * 0.035), fade * (1 - Math.abs(lane) * 0.5), cos, sin);
  }
  draw.restore();
}

/** Brick destruction: angular masonry fragments with short outward trajectories. */
export function drawPixelFxBrickShatter(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const spread = size * (0.25 + p * 1.25);
  const fade = alpha * (1 - p * 0.3);
  const halfW = size * 0.34;
  const halfH = size * 0.2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  draw.save();
  drawRotatedLine(draw, -halfW, -halfH, halfW, -halfH, color, Math.max(0.8, size * 0.035 * (1 - p)), fade * (1 - p), cos, sin);
  drawRotatedLine(draw, halfW, -halfH, halfW, halfH, color, Math.max(0.8, size * 0.035 * (1 - p)), fade * (1 - p), cos, sin);
  drawRotatedLine(draw, halfW, halfH, -halfW, halfH, color, Math.max(0.8, size * 0.035 * (1 - p)), fade * (1 - p), cos, sin);
  drawRotatedLine(draw, -halfW, halfH, -halfW, -halfH, color, Math.max(0.8, size * 0.035 * (1 - p)), fade * (1 - p), cos, sin);
  for (let i = 0; i < 8; i++) {
    const angle = rotation + (i * Math.PI * 2) / 8 + 0.12;
    const distance = spread * (0.55 + (i % 3) * 0.16);
    const cx = Math.cos(angle) * distance;
    const cy = Math.sin(angle) * distance;
    const tangent = size * (0.07 + (i % 3) * 0.025) * (1 - p * 0.25);
    const tx = -Math.sin(angle) * tangent;
    const ty = Math.cos(angle) * tangent;
    const bx = cx - Math.cos(angle) * size * 0.08;
    const by = cy - Math.sin(angle) * size * 0.08;
    draw.drawLine(bx, by, cx + tx, cy + ty, color, Math.max(1, size * 0.045), fade);
    draw.drawLine(cx + tx, cy + ty, cx - tx, cy - ty, color, Math.max(0.8, size * 0.035), fade * 0.85);
    draw.drawLine(cx - tx, cy - ty, bx, by, color, Math.max(0.8, size * 0.035), fade * 0.75);
  }
  draw.restore();
}

/** Flap gust: layered air crescents and feather-like slipstream strokes. */
export function drawPixelFxFlapGust(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const reach = size * (0.35 + p * 0.9);
  const fade = alpha * (1 - p * 0.4);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const arc1X = -size * 0.12 * cos;
  const arc1Y = -size * 0.12 * sin;
  const arc2X = -size * 0.2 * cos - size * 0.12 * sin;
  const arc2Y = -size * 0.2 * sin + size * 0.12 * cos;
  draw.save();
  draw.drawArc(arc1X, arc1Y, reach * 0.7, rotation + Math.PI * 0.72, Math.PI * 0.78, color, Math.max(1, size * 0.055 * (1 - p * 0.4)), fade);
  draw.drawArc(arc2X, arc2Y, reach * 0.48, rotation + Math.PI * 0.82, Math.PI * 0.55, color, Math.max(0.8, size * 0.03), fade * 0.55);
  for (let i = 0; i < 4; i++) {
    const y = (i - 1.5) * size * 0.13;
    drawRotatedLine(draw, -size * (0.18 + (i % 2) * 0.08), y, -reach * (0.75 + (i % 3) * 0.12), y + size * (0.08 + p * 0.05), color, Math.max(0.8, size * 0.028), fade * (0.9 - i * 0.12), cos, sin);
  }
  draw.restore();
}

/** Frog hop: compact take-off crescent and separated ground-contact streaks. */
export function drawPixelFxHop(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const spread = size * (0.25 + p * 0.8);
  const fade = alpha * (1 - p * 0.35);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const arcX = -size * 0.12 * sin;
  const arcY = size * 0.12 * cos;
  draw.save();
  draw.drawArc(arcX, arcY, spread, rotation + Math.PI * 1.08, Math.PI * 0.84, color, Math.max(1, size * 0.06 * (1 - p * 0.5)), fade);
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * size * 0.16;
    const y = size * (0.16 + (i % 2) * 0.08) + p * size * 0.12;
    drawRotatedLine(draw, x, y, x + (i - 2) * size * 0.08, y + size * (0.04 + p * 0.08), color, Math.max(0.8, size * 0.03), fade * (1 - Math.abs(i - 2) * 0.12), cos, sin);
  }
  draw.restore();
}

/** Phase dash: offset afterimages and long directional speed lines. */
export function drawPixelFxPhaseDash(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const length = size * (0.65 + p * 1.35);
  const fade = alpha * (1 - p * 0.55);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  draw.save();
  for (let i = 0; i < 3; i++) {
    const offset = (i + 1) * size * (0.12 + p * 0.035);
    const x = -length * (0.22 + i * 0.18);
    const y = (i - 1) * size * 0.1;
    const halfW = size * 0.12;
    const halfH = size * 0.2;
    drawRotatedLine(draw, x - halfW, y - halfH, x + halfW, y - halfH, color, Math.max(0.8, size * 0.025), fade * (0.72 - i * 0.16), cos, sin);
    drawRotatedLine(draw, x + halfW, y - halfH, x + halfW, y + halfH, color, Math.max(0.8, size * 0.025), fade * (0.72 - i * 0.16), cos, sin);
    drawRotatedLine(draw, x + halfW, y + halfH, x - halfW, y + halfH, color, Math.max(0.8, size * 0.025), fade * (0.72 - i * 0.16), cos, sin);
    drawRotatedLine(draw, x - halfW, y + halfH, x - halfW, y - halfH, color, Math.max(0.8, size * 0.025), fade * (0.72 - i * 0.16), cos, sin);
    drawRotatedLine(draw, x, y - size * 0.28, x - offset - length * 0.35, y - size * 0.28, color, Math.max(0.8, size * 0.035), fade * (0.85 - i * 0.18), cos, sin);
    drawRotatedLine(draw, x, y + size * 0.28, x - offset - length * 0.35, y + size * 0.28, color, Math.max(0.8, size * 0.035), fade * (0.85 - i * 0.18), cos, sin);
  }
  draw.drawArc(-length * 0.2 * cos, -length * 0.2 * sin, size * (0.28 + p * 0.08), rotation - Math.PI * 0.42, Math.PI * 0.84, color, Math.max(0.8, size * 0.03), fade * 0.65);
  draw.restore();
}

const RICOCHET_RING_RADIUS = createVFXTimelineSampler([
  { start: 0, end: 0.12, from: 0.18, to: 0.42, easing: "ease-out" },
  { start: 0.12, end: 1, from: 0.42, to: 1.05, easing: "ease-out" }
]);
const RICOCHET_FLASH_ALPHA = createVFXTimelineSampler([
  { start: 0, end: 0.08, from: 0.45, to: 1, easing: "ease-out" },
  { start: 0.08, end: 0.48, from: 1, to: 0.62, easing: "smoothstep" },
  { start: 0.48, end: 1, from: 0.62, to: 0, easing: "ease-in" }
]);

/** Directional ricochet: a sharp contact flash followed by a reflected trajectory. */
export function drawPixelFxRicochet(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const radius = size * RICOCHET_RING_RADIUS(p);
  const reach = size * (0.55 + p * 0.85);
  const fade = alpha * RICOCHET_FLASH_ALPHA(p);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  draw.save();
  draw.strokeCircle(0, 0, radius, color, Math.max(1, size * 0.055 * (1 - p * 0.45)), fade);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const inner = radius * 0.8;
    const outer = reach * (i % 2 === 0 ? 1 : 0.68);
    drawRotatedLine(draw, Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer, color, Math.max(0.8, size * (i % 2 === 0 ? 0.045 : 0.028)), fade * (1 - p * 0.25), cos, sin);
  }
  drawRotatedLine(draw, -size * 0.22, -size * 0.18, size * 0.12, 0, color, Math.max(1, size * 0.07), fade, cos, sin);
  drawRotatedLine(draw, size * 0.12, 0, reach, -size * (0.28 + p * 0.12), color, Math.max(1, size * 0.055), fade, cos, sin);
  drawRotatedLine(draw, size * 0.12, 0, reach * 0.72, size * 0.12, color, Math.max(0.8, size * 0.025), fade * 0.7, cos, sin);
  draw.restore();
}

const CHARGE_CORE_RADIUS = createVFXTimelineSampler([
  { start: 0, end: 0.62, from: 0.105, to: 0.19, easing: "ease-in-out" },
  { start: 0.62, end: 1, from: 0.19, to: 0.31, easing: "ease-out" }
]);
const CHARGE_CORE_ALPHA = createVFXTimelineSampler([
  { start: 0, end: 0.18, from: 0.5, to: 1, easing: "ease-out" },
  { start: 0.18, end: 0.78, from: 1, to: 0.88, easing: "linear" },
  { start: 0.78, end: 1, from: 0.88, to: 0, easing: "ease-in" }
]);

/** Forward charge cue: a compressed core builds energy before a timed release. */
export function drawPixelFxCharge(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const length = size * (0.7 + p * 1.15);
  const fade = alpha * (1 - p * 0.3);
  const coreAlpha = fade * CHARGE_CORE_ALPHA(p);
  const coreRadius = size * CHARGE_CORE_RADIUS(p);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  draw.save();
  draw.fillCircle(size * 0.12, 0, coreRadius, color, coreAlpha);
  draw.drawArc(0, 0, size * (0.28 + p * 0.08), -Math.PI * 0.42, Math.PI * 0.84, color, Math.max(1, size * 0.055), coreAlpha * 0.8);
  for (let i = 0; i < 5; i++) {
    const lane = (i - 2) * 0.19;
    const startX = -length * (0.12 + (i % 2) * 0.08);
    const endX = -length * (0.62 + (i % 3) * 0.12);
    drawRotatedLine(draw, startX, lane * size, endX, lane * size * (0.72 + p * 0.12), color, Math.max(0.8, size * (i === 2 ? 0.05 : 0.028)), fade * (0.9 - Math.abs(lane) * 0.5), cos, sin);
  }
  drawRotatedLine(draw, size * 0.2, -size * 0.2, size * (0.72 + p * 0.25), 0, color, Math.max(1, size * 0.06), fade, cos, sin);
  drawRotatedLine(draw, size * 0.2, size * 0.2, size * (0.72 + p * 0.25), 0, color, Math.max(1, size * 0.06), fade, cos, sin);
  draw.restore();
}

const SHIELD_PULSE_RADIUS = createVFXTimelineSampler([
  { start: 0, end: 0.14, from: 0.22, to: 0.38, easing: "ease-out" },
  { start: 0.14, end: 0.72, from: 0.38, to: 1.32, easing: "ease-out" },
  { start: 0.72, end: 1, from: 1.32, to: 1.52, easing: "ease-out" }
]);
const SHIELD_PULSE_ALPHA = createVFXTimelineSampler([
  { start: 0, end: 0.12, from: 0.55, to: 1, easing: "ease-out" },
  { start: 0.12, end: 0.72, from: 1, to: 0.72, easing: "linear" },
  { start: 0.72, end: 1, from: 0.72, to: 0, easing: "ease-in" }
]);
const SHIELD_ECHO_RADIUS = createVFXTimelineSampler([
  { start: 0, end: 0.32, from: 0.18, to: 0.18, easing: "linear" },
  { start: 0.32, end: 0.88, from: 0.18, to: 1.28, easing: "ease-out" }
]);
const SHIELD_ECHO_ALPHA = createVFXTimelineSampler([
  { start: 0, end: 0.32, from: 0, to: 0, easing: "linear" },
  { start: 0.32, end: 0.88, from: 0.62, to: 0, easing: "ease-in" }
]);

/** Defensive pulse: a staged expanding shell, delayed echo and separated shield arcs. */
export function drawPixelFxShieldPulse(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const radius = size * SHIELD_PULSE_RADIUS(p);
  const fade = alpha * SHIELD_PULSE_ALPHA(p);
  const echoRadius = size * SHIELD_ECHO_RADIUS(p);
  const echoAlpha = alpha * SHIELD_ECHO_ALPHA(p);
  draw.save();
  draw.strokeCircle(0, 0, radius, color, Math.max(1, size * 0.055 * (1 - p * 0.35)), fade);
  draw.strokeCircle(0, 0, radius * 0.72, color, Math.max(0.8, size * 0.025), fade * 0.52);
  if (echoAlpha > 0.01) {
    draw.strokeCircle(0, 0, echoRadius, color, Math.max(0.8, size * 0.022), echoAlpha);
  }
  for (let i = 0; i < 4; i++) {
    const start = rotation + (i * Math.PI) / 2 + 0.18;
    draw.drawArc(0, 0, radius * 1.12, start, Math.PI * 0.28, color, Math.max(1, size * 0.045), fade * 0.85);
    const x = Math.cos(start + Math.PI * 0.14) * radius;
    const y = Math.sin(start + Math.PI * 0.14) * radius;
    draw.drawLine(x * 0.82, y * 0.82, x * 1.08, y * 1.08, color, Math.max(0.8, size * 0.035), fade);
  }
  draw.restore();
}

const PARRY_CLASH_RADIUS = createVFXTimelineSampler([
  { start: 0, end: 0.2, from: 0.16, to: 0.48, easing: "ease-out" },
  { start: 0.2, end: 0.68, from: 0.48, to: 0.3, easing: "ease-in-out" },
  { start: 0.68, end: 1, from: 0.3, to: 0.76, easing: "ease-out" }
]);
const PARRY_FLASH_ALPHA = createVFXTimelineSampler([
  { start: 0, end: 0.12, from: 0.25, to: 1, easing: "ease-out" },
  { start: 0.12, end: 0.38, from: 1, to: 0.12, easing: "ease-in" },
  { start: 0.38, end: 0.58, from: 0.12, to: 0.72, easing: "ease-out" },
  { start: 0.58, end: 1, from: 0.72, to: 0, easing: "ease-in" }
]);
const PARRY_BURST_REACH = createVFXTimelineSampler([
  { start: 0, end: 0.18, from: 0.22, to: 0.22, easing: "linear" },
  { start: 0.18, end: 0.76, from: 0.22, to: 1.12, easing: "ease-out" },
  { start: 0.76, end: 1, from: 1.12, to: 0.72, easing: "ease-in" }
]);

/** Parry clash: opposing guard arcs snap together, flash, then release a directional counter-burst. */
export function drawPixelFxParry(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const clashRadius = size * PARRY_CLASH_RADIUS(p);
  const flashAlpha = alpha * PARRY_FLASH_ALPHA(p);
  const burstReach = size * PARRY_BURST_REACH(p);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const fade = alpha * (1 - p * 0.24);

  draw.save();
  draw.drawArc(0, 0, clashRadius, rotation - Math.PI * 0.88, Math.PI * 0.58, color, Math.max(1, size * 0.075), fade);
  draw.drawArc(0, 0, clashRadius, rotation + Math.PI * 0.3, Math.PI * 0.58, color, Math.max(1, size * 0.075), fade * 0.82);
  draw.strokeCircle(0, 0, clashRadius * 0.52, color, Math.max(0.8, size * 0.025), flashAlpha * 0.72);
  draw.fillCircle(0, 0, size * (0.075 + PARRY_FLASH_ALPHA(p) * 0.09), color, flashAlpha);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const inner = size * (0.12 + (i % 2) * 0.035);
    const outer = burstReach * (0.72 + (i % 3) * 0.12);
    drawRotatedLine(draw, Math.cos(angle) * inner, Math.sin(angle) * inner,
      Math.cos(angle) * outer, Math.sin(angle) * outer, color,
      Math.max(0.8, size * (i % 2 === 0 ? 0.045 : 0.025)),
      fade * (0.82 - (i % 3) * 0.12), cos, sin);
  }
  draw.restore();
}


const PERFECT_BLOCK_RING = createVFXTimelineSampler([
  { start: 0, end: 0.16, from: 0.82, to: 0.34, easing: "ease-in" },
  { start: 0.16, end: 0.62, from: 0.34, to: 1.18, easing: "ease-out" },
  { start: 0.62, end: 1, from: 1.18, to: 1.42, easing: "ease-out" }
]);
const PERFECT_BLOCK_FLASH = createVFXTimelineSampler([
  { start: 0, end: 0.08, from: 0.12, to: 1, easing: "ease-out" },
  { start: 0.08, end: 0.34, from: 1, to: 0.08, easing: "ease-in" },
  { start: 0.34, end: 0.5, from: 0.08, to: 0.62, easing: "ease-out" },
  { start: 0.5, end: 1, from: 0.62, to: 0, easing: "ease-in" }
]);
/** Perfect Block: compressed guard shell, confirmation flash and expanding segmented pulse. */
export function drawPixelFxPerfectBlock(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const radius = size * PERFECT_BLOCK_RING(p), flash = alpha * PERFECT_BLOCK_FLASH(p);
  const fade = alpha * (1 - p * 0.38), cos = Math.cos(rotation), sin = Math.sin(rotation);
  draw.save();
  draw.strokeCircle(0, 0, radius, color, Math.max(1, size * (0.075 - p * 0.035)), flash);
  draw.drawArc(0, 0, radius * 0.78, rotation - Math.PI * 0.72, Math.PI * 0.52, color, Math.max(1, size * 0.055), fade);
  draw.drawArc(0, 0, radius * 0.78, rotation + Math.PI * 0.2, Math.PI * 0.52, color, Math.max(1, size * 0.055), fade * 0.82);
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3, inner = radius * 0.38, outer = radius * (1.02 + (i % 2) * 0.14);
    drawRotatedLine(draw, Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer, color, Math.max(0.8, size * 0.035), fade * (0.9 - (i % 3) * 0.12), cos, sin);
  }
  draw.fillCircle(0, 0, size * (0.06 + flash * 0.12), color, flash);
  draw.restore();
}

const CRITICAL_CORE_RADIUS = createVFXTimelineSampler([
  { start: 0, end: 0.12, from: 0.08, to: 0.28, easing: "ease-in" },
  { start: 0.12, end: 0.3, from: 0.28, to: 0.12, easing: "ease-in" },
  { start: 0.3, end: 0.72, from: 0.12, to: 0.72, easing: "ease-out" },
  { start: 0.72, end: 1, from: 0.72, to: 1, easing: "ease-out" }
]);
const CRITICAL_FLASH = createVFXTimelineSampler([
  { start: 0, end: 0.1, from: 0.2, to: 1, easing: "ease-out" },
  { start: 0.1, end: 0.24, from: 1, to: 0.16, easing: "ease-in" },
  { start: 0.24, end: 0.38, from: 0.16, to: 0.78, easing: "ease-out" },
  { start: 0.38, end: 1, from: 0.78, to: 0, easing: "ease-in" }
]);
const CRITICAL_FRAGMENT_REACH = createVFXTimelineSampler([
  { start: 0, end: 0.28, from: 0.18, to: 0.3, easing: "ease-in" },
  { start: 0.28, end: 0.82, from: 0.3, to: 1.18, easing: "ease-out" },
  { start: 0.82, end: 1, from: 1.18, to: 1.28, easing: "ease-out" }
]);
/** Critical Hit: double-beat core flash followed by staggered radial fragments. */
export function drawPixelFxCriticalHit(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const core = size * CRITICAL_CORE_RADIUS(p), flash = alpha * CRITICAL_FLASH(p), fade = alpha * (1 - p * 0.3);
  draw.save();
  draw.fillCircle(0, 0, core, color, flash);
  draw.strokeCircle(0, 0, core * 1.32, color, Math.max(0.8, size * 0.035), flash * 0.72);
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI * 2) / 10, delay = (i % 4) * 0.045;
    const localProgress = Math.max(0, Math.min(1, (p - delay) / (1 - delay)));
    const fragmentReach = size * (0.18 + CRITICAL_FRAGMENT_REACH(localProgress) * (0.72 + (i % 3) * 0.12));
    const inner = core * (0.72 + (i % 2) * 0.18), outer = Math.max(inner, fragmentReach);
    drawRotatedLine(draw, Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer, color, Math.max(0.8, size * (i % 3 === 0 ? 0.06 : 0.035)), fade * (0.92 - (i % 3) * 0.12), Math.cos(rotation), Math.sin(rotation));
  }
  draw.restore();
}

const DEFLECTION_CURVE_REACH = createVFXTimelineSampler([
  { start: 0, end: 0.18, from: 0.28, to: 0.36, easing: "ease-out" },
  { start: 0.18, end: 0.7, from: 0.36, to: 1.12, easing: "ease-out" },
  { start: 0.7, end: 1, from: 1.12, to: 1.28, easing: "ease-out" }
]);
const DEFLECTION_CLASH_FLASH = createVFXTimelineSampler([
  { start: 0, end: 0.12, from: 0.9, to: 1, easing: "ease-out" },
  { start: 0.12, end: 0.36, from: 1, to: 0.08, easing: "ease-in" },
  { start: 0.36, end: 0.52, from: 0.08, to: 0.58, easing: "ease-out" },
  { start: 0.52, end: 1, from: 0.58, to: 0, easing: "ease-in" }
]);
/** Projectile Deflection: incoming bolt curves through a clash point and exits on a reflected arc. */
export function drawPixelFxProjectileDeflection(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const reach = size * DEFLECTION_CURVE_REACH(p), flash = alpha * DEFLECTION_CLASH_FLASH(p);
  const cos = Math.cos(rotation), sin = Math.sin(rotation), fade = alpha * (1 - p * 0.26);
  const pointX = -reach * 0.08, pointY = -reach * 0.04;
  const startX = -reach * 0.92, startY = reach * 0.34, endX = reach * 0.86, endY = -reach * 0.62;
  const controlX = reach * 0.62, controlY = reach * 0.48;
  let previousX = startX, previousY = startY;
  draw.save();
  for (let i = 1; i <= 8; i++) {
    const t = i / 8, inverse = 1 - t;
    const x = inverse * inverse * startX + 2 * inverse * t * controlX + t * t * endX;
    const y = inverse * inverse * startY + 2 * inverse * t * controlY + t * t * endY;
    drawRotatedLine(draw, previousX, previousY, x, y, color, Math.max(1, size * (0.055 - t * 0.003)), fade * (1 - t * 0.42), cos, sin);
    previousX = x; previousY = y;
  }
  draw.fillCircle(pointX, pointY, size * (0.055 + flash * 0.075), color, flash);
  draw.strokeCircle(pointX, pointY, size * (0.12 + p * 0.18), color, Math.max(0.8, size * 0.025), flash * 0.72);
  for (let i = 0; i < 5; i++) {
    const angle = rotation + (i * Math.PI * 2) / 5, inner = size * 0.1, outer = size * (0.22 + p * 0.42 + (i % 2) * 0.1);
    drawRotatedLine(draw, Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer, color, Math.max(0.8, size * 0.03), fade * 0.72, 1, 0);
  }
  draw.restore();
}

/** Target warning: pulsing lock-on brackets and a central sight line. */
export function drawPixelFxTargetWarning(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const radius = size * (0.48 + p * 0.2);
  const bracket = size * (0.2 + p * 0.04);
  const fade = alpha * (0.72 + 0.28 * Math.sin(p * Math.PI * 4));
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  draw.save();
  draw.strokeCircle(0, 0, radius, color, Math.max(0.8, size * 0.025), fade * 0.45);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const cx = Math.cos(angle) * radius;
    const cy = Math.sin(angle) * radius;
    const tx = -Math.sin(angle);
    const ty = Math.cos(angle);
    drawRotatedLine(draw, cx - tx * bracket, cy - ty * bracket, cx + tx * bracket, cy + ty * bracket, color, Math.max(1, size * 0.045), fade, cos, sin);
    drawRotatedLine(draw, cx + tx * bracket, cy + ty * bracket, cx + tx * bracket * 0.45, cy + ty * bracket * 0.45, color, Math.max(1, size * 0.045), fade, cos, sin);
  }
  draw.drawLine(-size * 0.18, 0, size * 0.18, 0, color, Math.max(0.8, size * 0.03), fade * 0.8);
  draw.drawLine(0, -size * 0.18, 0, size * 0.18, color, Math.max(0.8, size * 0.03), fade * 0.8);
  draw.restore();
}

/** Teleport transition: a collapsing origin ring and an expanding destination gate. */
export function drawPixelFxTeleport(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const envelope = Math.sin(Math.PI * p);
  const originRadius = size * (0.72 * (1 - p) + 0.08);
  const destinationRadius = size * (0.08 + 0.72 * p);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  draw.save();
  draw.strokeCircle(0, 0, originRadius, color, Math.max(1, size * 0.055), alpha * (1 - p));
  draw.strokeCircle(0, 0, destinationRadius, color, Math.max(1, size * 0.045), alpha * p);
  draw.drawArc(0, 0, size * (0.42 + envelope * 0.16), rotation - Math.PI * 0.72, Math.PI * 1.44, color, Math.max(1, size * 0.035), alpha * envelope);
  for (let i = 0; i < 8; i++) {
    const angle = rotation + (i * Math.PI) / 4;
    const inner = size * (0.18 + p * 0.2);
    const outer = size * (0.48 + (1 - p) * 0.35);
    const x1 = Math.cos(angle) * inner;
    const y1 = Math.sin(angle) * inner;
    const x2 = Math.cos(angle) * outer;
    const y2 = Math.sin(angle) * outer;
    drawRotatedLine(draw, x1, y1, x2, y2, color, Math.max(0.8, size * 0.025), alpha * envelope, cos, sin);
  }
  draw.restore();
}

/** Surface skid: low ground-contact scrape, lateral dust and deterministic speed streaks. */
export function drawPixelFxSurfaceSkid(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const spread = size * (0.38 + p * 0.92);
  const fade = alpha * (1 - p * 0.42);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  draw.save();
  draw.drawArc(0, size * 0.18, spread * 0.7, Math.PI * 1.08, Math.PI * 0.84, color, Math.max(1, size * 0.055 * (1 - p * 0.4)), fade);
  for (let i = 0; i < 7; i++) {
    const lane = i - 3;
    const x = lane * spread * 0.22;
    const y = size * (0.16 + (i % 3) * 0.045) - p * size * (0.08 + (i % 2) * 0.05);
    const radius = size * (0.045 + (i % 3) * 0.018) * (1 - p * 0.45);
    draw.fillCircle(x, y, radius, color, fade * (0.72 - (i % 3) * 0.12));
    drawRotatedLine(draw, x - radius * 2.4, y, x + radius * 1.5, y, color, Math.max(0.7, size * 0.022), fade * 0.55, cos, sin);
  }
  for (let i = 0; i < 4; i++) {
    const y = size * (0.04 + i * 0.075);
    drawRotatedLine(draw, -spread * (0.45 + i * 0.08), y, spread * (0.2 + i * 0.05), y, color, Math.max(0.8, size * 0.03), fade * (0.5 - i * 0.07), cos, sin);
  }
  draw.restore();
}

/** Mechanical motion: deterministic gear housing, teeth, spokes and a rotating inner hub. */
export function drawPixelFxMechanicalMotion(draw: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const spin = rotation + p * Math.PI * 1.5;
  const outer = size * (0.68 + Math.sin(p * Math.PI) * 0.06);
  const inner = outer * 0.68;
  const fade = alpha * (0.82 + 0.18 * Math.sin(p * Math.PI * 2));
  draw.save();
  draw.strokeCircle(0, 0, outer, color, Math.max(1, size * 0.055), fade);
  draw.strokeCircle(0, 0, inner, color, Math.max(1, size * 0.035), fade * 0.78);
  for (let i = 0; i < 8; i++) {
    const angle = spin + (i * Math.PI) / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    draw.drawLine(cos * inner * 0.42, sin * inner * 0.42, cos * outer * 0.9, sin * outer * 0.9, color, Math.max(1, size * 0.045), fade);
    const toothStart = outer * 0.86;
    const toothEnd = outer * 1.08;
    draw.drawLine(cos * toothStart, sin * toothStart, cos * toothEnd, sin * toothEnd, color, Math.max(1, size * 0.065), fade);
  }
  draw.strokeCircle(0, 0, size * (0.18 + p * 0.06), color, Math.max(1, size * 0.06), fade);
  draw.fillCircle(0, 0, size * 0.07, color, fade * 0.9);
  draw.restore();
}

function canvasDrawer(
  drawEffect: (adapter: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number) => void
): ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> {
  return { draw(ctx, world, entity) { drawEffect(new CanvasDrawAdapter(ctx), world, entity); } };
}

function skiaDrawer(
  drawEffect: (adapter: IDrawAdapter, world: import("@tiny-aster/core").World<CoreComponentRegistry>, entity: number) => void
): ShapeDrawer<RenderContext, CoreComponentRegistry> {
  return { draw(canvas, world, entity) { drawEffect(new SkiaDrawAdapter(canvas), world, entity); } };
}

export function registerPixelFxProceduralVFX<TComponents extends CoreComponentRegistry>(
  renderer: Renderer<TComponents, RenderContext>
): void {
  const drawers = [
    ["pixelfx_impact", drawPixelFxImpact],
    ["pixelfx_slash", drawPixelFxSlash],
    ["pixelfx_explosion", drawPixelFxExplosion],
    ["pixelfx_dust", drawPixelFxDust],
    ["pixelfx_pickup", drawPixelFxPickup],
    ["pixelfx_muzzle", drawPixelFxMuzzle],
    ["pixelfx_shield_crack", drawPixelFxShieldCrack],
    ["pixelfx_ink_burst", drawPixelFxInkBurst],
    ["pixelfx_paddle_impact", drawPixelFxPaddleImpact],
    ["pixelfx_brick_shatter", drawPixelFxBrickShatter],
    ["pixelfx_flap_gust", drawPixelFxFlapGust],
    ["pixelfx_hop", drawPixelFxHop],
    ["pixelfx_phase_dash", drawPixelFxPhaseDash],
    ["pixelfx_ricochet", drawPixelFxRicochet],
    ["pixelfx_charge", drawPixelFxCharge],
    ["pixelfx_shield_pulse", drawPixelFxShieldPulse],
    ["pixelfx_parry", drawPixelFxParry],
    ["pixelfx_perfect_block", drawPixelFxPerfectBlock],
    ["pixelfx_critical_hit", drawPixelFxCriticalHit],
    ["pixelfx_projectile_deflection", drawPixelFxProjectileDeflection],
    ["pixelfx_target_warning", drawPixelFxTargetWarning],
    ["pixelfx_teleport", drawPixelFxTeleport],
    ["pixelfx_surface_skid", drawPixelFxSurfaceSkid],
    ["pixelfx_mechanical_motion", drawPixelFxMechanicalMotion]
  ] as const;

  for (const [name, drawEffect] of drawers) {
    if (renderer.type === "canvas") {
      renderer.registerShape(name, canvasDrawer(drawEffect) as never);
    } else {
      renderer.registerShape(name, skiaDrawer(drawEffect) as never);
    }
  }
}
