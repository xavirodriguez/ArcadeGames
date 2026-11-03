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
    color: render.color ?? "#ffffff",
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

/** Radial breakup: deterministic shard trajectories with gravity and spin-like offsets. */
export function drawPixelFxExplosion(
  draw: IDrawAdapter,
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): void {
  const state = readEffectState(world, entity);
  if (!state || state.alpha <= 0.01) return;
  const { progress: p, alpha, size, color, rotation } = state;
  const travel = size * (0.35 + p * 1.55);
  const gravity = size * p * p * 0.42;

  draw.save();
  draw.strokeCircle(0, 0, size * (0.22 + p * 0.55), color, Math.max(0.8, size * 0.04 * (1 - p)), alpha * (1 - p));
  for (let i = 0; i < 10; i++) {
    const angle = rotation + (i * Math.PI * 2) / 10;
    const speed = 0.72 + ((i * 7) % 5) * 0.11;
    const x = Math.cos(angle) * travel * speed;
    const y = Math.sin(angle) * travel * speed + gravity;
    const tangent = size * (0.07 + (i % 3) * 0.025) * (1 - p * 0.35);
    const px = -Math.sin(angle) * tangent;
    const py = Math.cos(angle) * tangent;
    const tail = rotatePoint(px, py, p * (i % 2 === 0 ? 0.8 : -0.8));
    draw.drawLine(x - tail.x, y - tail.y, x + tail.x, y + tail.y, color, Math.max(1, size * 0.045), alpha * (1 - p * 0.45));
    draw.drawLine(
      x + tail.x,
      y + tail.y,
      x + Math.cos(angle) * size * 0.09,
      y + Math.sin(angle) * size * 0.09 + gravity * 0.3,
      color,
      Math.max(0.7, size * 0.025),
      alpha * (1 - p)
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
    ["pixelfx_phase_dash", drawPixelFxPhaseDash]
  ] as const;

  for (const [name, drawEffect] of drawers) {
    if (renderer.type === "canvas") {
      renderer.registerShape(name, canvasDrawer(drawEffect) as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
    } else {
      renderer.registerShape(name, skiaDrawer(drawEffect) as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
    }
  }
}
