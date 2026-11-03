/**
 * Shared canvas theme helpers for Hit & Run themes.
 */
export function drawGroundShadowEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  elevation: number,
  shadowColor: string,
  baseAlpha = 0.35,
  rxRatio = 0.45,
  ryRatio = 0.15
): void {
  const shadowScale = Math.min(1, Math.max(0.4, 1 - elevation / 120));
  const shadowAlpha = baseAlpha * shadowScale;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = shadowColor.replace("__ALPHA__", shadowAlpha.toFixed(3));
  ctx.beginPath();
  ctx.ellipse(0, 0, size * rxRatio * shadowScale, size * ryRatio * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawThemeEntityContext(
  ctx: CanvasRenderingContext2D,
  snapshot: { x: number; y: number; elevation: number; facing: number },
  renderShadow: () => void,
  renderBody: () => void
): void {
  ctx.save();
  ctx.translate(snapshot.x, snapshot.y);
  renderShadow();
  ctx.save();
  ctx.translate(0, -snapshot.elevation);
  ctx.scale(snapshot.facing, 1);
  renderBody();
  ctx.restore();
  ctx.restore();
}
