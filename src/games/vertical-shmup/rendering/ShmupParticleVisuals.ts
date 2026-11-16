/**
 * Soft particle sprites for SharedParticlePool debris (spawnLayeredExplosion).
 * Presentation only — no simulation side effects.
 */

export interface ParticleDrawEntity {
  size?: number;
  color?: string;
  opacity?: number;
}

export function drawCanvasParticle(ctx: CanvasRenderingContext2D, entity: ParticleDrawEntity): void {
  const size = Math.max(0.5, entity.size ?? 3);
  const color = entity.color ?? "#ffffff";
  const opacity = entity.opacity ?? 1;
  if (opacity <= 0.02) return;

  const r = size * 0.5;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

  // Soft outer glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
  glow.addColorStop(0, color);
  glow.addColorStop(0.35, color);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Bright core
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity * 0.95));
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0.4, r * 0.45), 0, Math.PI * 2);
  ctx.fill();

  // Mid body
  ctx.fillStyle = color;
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity * 0.85));
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawSkiaParticle(
  canvas: { drawCircle: (x: number, y: number, r: number, paint: unknown) => void },
  entity: ParticleDrawEntity,
  paintFactory?: {
    Color: (c: string) => unknown;
    setColor: (p: unknown, c: unknown) => void;
    setAlphaf?: (p: unknown, a: number) => void;
    Make: () => unknown;
  }
): void {
  if (!paintFactory) return;
  const size = Math.max(0.5, entity.size ?? 3);
  const color = entity.color ?? "#ffffff";
  const opacity = Math.max(0, Math.min(1, entity.opacity ?? 1));
  if (opacity <= 0.02) return;

  const r = size * 0.5;
  const paint = paintFactory.Make();

  // Outer soft disk
  paintFactory.setColor(paint, paintFactory.Color(color));
  paintFactory.setAlphaf?.(paint, opacity * 0.35);
  canvas.drawCircle(0, 0, r * 2.0, paint);

  // Body
  paintFactory.setColor(paint, paintFactory.Color(color));
  paintFactory.setAlphaf?.(paint, opacity * 0.9);
  canvas.drawCircle(0, 0, r, paint);

  // Core
  paintFactory.setColor(paint, paintFactory.Color("#ffffff"));
  paintFactory.setAlphaf?.(paint, opacity);
  canvas.drawCircle(0, 0, Math.max(0.4, r * 0.4), paint);
}
