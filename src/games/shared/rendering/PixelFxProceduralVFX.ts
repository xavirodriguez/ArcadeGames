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

export function registerPixelFxProceduralVFX(
  renderer: Renderer<CoreComponentRegistry, RenderContext>
): void {
  const drawers = [
    ["pixelfx_impact", drawPixelFxImpact],
    ["pixelfx_slash", drawPixelFxSlash],
    ["pixelfx_explosion", drawPixelFxExplosion]
  ] as const;

  for (const [name, drawEffect] of drawers) {
    if (renderer.type === "canvas") {
      renderer.registerShape(name, canvasDrawer(drawEffect) as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
    } else {
      renderer.registerShape(name, skiaDrawer(drawEffect) as unknown as ShapeDrawer<RenderContext, ComponentRegistry>);
    }
  }
}
