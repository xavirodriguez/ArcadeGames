import { EntityGeometryProfile, GeometrySubPath, THEME_RESOURCE_KEY, Theme } from "@tiny-aster/core";
import { IDrawAdapter, CanvasDrawAdapter } from "./DrawAdapter";
import { computeMotionSecondaryEffect } from "./ProceduralShapeUtils";

/**
 * Options for generic parametric geometry drawer.
 */
export interface GenericDrawerOptions {
  size?: number;
  baseColor?: string;
  isHitFlashing?: boolean;
  hitFlashColor?: string;
  hitFlashOpacity?: number;
  globalAlpha?: number;
  rotation?: number;
  isThrusting?: boolean;
  tick?: number;
  rng?: { next: () => number; nextRange: (min: number, max: number) => number };
}

/**
 * Retrieves custom parametric geometry from active World Theme resource.
 */
export function getCustomGeometryFromWorld(
  world: { getResource: <T>(key: string) => T | undefined },
  type: "player" | "enemy" | "projectile" | "boss"
): EntityGeometryProfile | undefined {
  const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
  const shapeTokens = theme?.visualTheme?.shapeTokens;
  if (!shapeTokens) return undefined;
  if (type === "player") return shapeTokens.playerGeometry;
  if (type === "enemy") return shapeTokens.enemyGeometry;
  if (type === "projectile") return shapeTokens.projectileGeometry;
  if (type === "boss") return shapeTokens.bossGeometry;
  return undefined;
}

/**
 * Parametrically renders an entity profile using the IDrawAdapter abstraction (Canvas or Skia).
 */
export function drawFromGeometryProfileAdapter(
  adapter: IDrawAdapter,
  profile: EntityGeometryProfile,
  options: GenericDrawerOptions = {}
): void {
  const size = options.size || 20;
  const scale = (size / 2) * (profile.scaleMultiplier || 1.0);
  const baseColor = options.baseColor || "#00E5FF";
  const isHitFlashing = Boolean(options.isHitFlashing);
  const hitFlashColor = options.hitFlashColor || "#FFFFFF";
  const alpha = options.globalAlpha ?? 1.0;

  adapter.save();

  // Draw secondary motion particles if thrusting/moving
  const motionEffect = profile.motionEffect || "flame";
  if (options.isThrusting && motionEffect !== "none") {
    const motionData = computeMotionSecondaryEffect(
      motionEffect,
      size,
      options.tick || 0,
      options.rng
    );
    for (let i = 0; i < motionData.particles.length; i++) {
      const p = motionData.particles[i];
      adapter.fillCircle(p.offsetX, p.offsetY, Math.max(0.5, p.radius), p.color, alpha * p.alpha);
    }
  }

  for (let i = 0; i < profile.subPaths.length; i++) {
    const sub = profile.subPaths[i];
    const subAlpha = sub.alpha !== undefined ? alpha * sub.alpha : alpha;
    const fillColor = isHitFlashing ? hitFlashColor : sub.fillColor || baseColor;
    const strokeColor = isHitFlashing ? hitFlashColor : sub.strokeColor || fillColor;
    const lineWidth = (sub.lineWidth || 1) * scale;
    const subType = sub.type || "polyline";

    if (subType === "ellipse") {
      const rx = (sub.ellipseRadiusX ?? 1) * scale;
      const center = sub.points[0] || { x: 0, y: 0 };
      if (sub.fillColor) {
        adapter.fillCircle(center.x * scale, center.y * scale, rx, fillColor, subAlpha);
      }
      adapter.strokeCircle(center.x * scale, center.y * scale, rx, strokeColor, Math.max(1, lineWidth), subAlpha);
    } else if (subType === "arc") {
      const r = (sub.arcRadius ?? 1) * scale;
      const start = sub.startAngle ?? 0;
      const sweep = (sub.endAngle ?? Math.PI * 2) - start;
      const center = sub.points[0] || { x: 0, y: 0 };
      adapter.drawArc(center.x * scale, center.y * scale, r, start, sweep, strokeColor, Math.max(1, lineWidth), subAlpha);
    } else {
      if (sub.points.length > 1) {
        for (let j = 0; j < sub.points.length - 1; j++) {
          const p1 = sub.points[j];
          const p2 = sub.points[j + 1];
          adapter.drawLine(p1.x * scale, p1.y * scale, p2.x * scale, p2.y * scale, strokeColor, Math.max(1, lineWidth), subAlpha);
        }
        if (sub.closed !== false && sub.points.length > 2) {
          const pFirst = sub.points[0];
          const pLast = sub.points[sub.points.length - 1];
          adapter.drawLine(pLast.x * scale, pLast.y * scale, pFirst.x * scale, pFirst.y * scale, strokeColor, Math.max(1, lineWidth), subAlpha);
        }
      }
    }
  }

  adapter.restore();
}

/**
 * Parametrically renders an entity profile onto an HTML5 Canvas 2D context.
 */
export function drawFromGeometryProfileCanvas(
  ctx: CanvasRenderingContext2D,
  profile: EntityGeometryProfile,
  options: GenericDrawerOptions = {}
): void {
  const adapter = new CanvasDrawAdapter(ctx);
  if (options.rotation !== undefined && options.rotation !== 0) {
    ctx.save();
    ctx.rotate(options.rotation);
    drawFromGeometryProfileAdapter(adapter, profile, options);
    ctx.restore();
  } else {
    drawFromGeometryProfileAdapter(adapter, profile, options);
  }
}

/**
 * Attempts to draw custom parametric geometry for a given role from active theme via IDrawAdapter.
 */
export function tryDrawCustomGeometryAdapter(
  adapter: IDrawAdapter,
  world: { getResource: <T>(key: string) => T | undefined },
  type: "player" | "enemy" | "projectile" | "boss",
  options: GenericDrawerOptions = {}
): boolean {
  const profile = getCustomGeometryFromWorld(world, type);
  if (!profile) return false;
  drawFromGeometryProfileAdapter(adapter, profile, options);
  return true;
}

/**
 * Attempts to draw custom parametric geometry for a given role from active theme onto Canvas2D.
 */
export function tryDrawCustomGeometryCanvas(
  ctx: CanvasRenderingContext2D,
  world: { getResource: <T>(key: string) => T | undefined },
  type: "player" | "enemy" | "projectile" | "boss",
  options: GenericDrawerOptions = {}
): boolean {
  return tryDrawCustomGeometryAdapter(new CanvasDrawAdapter(ctx), world, type, options);
}

/**
 * Renders default high-contrast laser bullet geometry via IDrawAdapter.
 */
export function drawDefaultLaserBulletAdapter(
  adapter: IDrawAdapter,
  size: number,
  color: string
): void {
  const length = size * 4;
  adapter.save();
  adapter.drawLine(-length / 2, 0, length / 2, 0, color, 3);
  adapter.drawLine(-length / 2, 0, length / 2, 0, "#FFFFFF", 1.5);
  adapter.restore();
}

/**
 * Renders Asteroids laser bullet via IDrawAdapter.
 */
export function drawAsteroidsBulletAdapter(
  adapter: IDrawAdapter,
  world: { getResource: <T>(key: string) => T | undefined },
  size: number,
  color: string
): void {
  if (!tryDrawCustomGeometryAdapter(adapter, world, "projectile", { size: size * 4, baseColor: color })) {
    drawDefaultLaserBulletAdapter(adapter, size, color);
  }
}
