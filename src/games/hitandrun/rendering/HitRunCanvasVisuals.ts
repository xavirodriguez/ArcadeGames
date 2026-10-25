/**
 * Hit&Run canvas shape drawers — delegates rendering to active HitRunTheme.
 */
import type {
  ShapeDrawer,
  CoreComponentRegistry
} from "@tiny-aster/core";
import { ThemeRegistry } from "./theme/ThemeRegistry";
import type { EntityRenderSnapshot } from "./theme/HitRunThemeTypes";
import type { BeltElevationComponent } from "../belt/BeltElevationComponent";
import { getInterpolatedPosition } from "./HitRunRenderInterpolation";

function getElevationZ(
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): number {
  const elevation = world.getComponent(entity, "BeltElevation") as BeltElevationComponent | undefined;
  return elevation?.z ?? 0;
}

function buildEntitySnapshot(
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number,
  visualId: string,
  defaultSize: number
): EntityRenderSnapshot | null {
  const render = world.getComponent(entity, "Render");
  const transform = world.getComponent(entity, "Transform");
  if (!render?.visible || !transform) return null;

  const size = render.size || defaultSize;
  const z = getElevationZ(world, entity);
  const facing = (transform.scaleX ?? 1) >= 0 ? 1 : -1;

  // Use interpolated position for smooth visual rendering
  const pos = getInterpolatedPosition(world, entity, 1.0);
  const depth = pos.y;

  return {
    x: pos.x,
    y: pos.y,
    depth,
    elevation: z,
    facing,
    scale: transform.scaleX ?? 1,
    animState: "idle",
    hitFlash: render.hitFlashFrames ?? 0,
    visualId,
    size,
    color: render.color
  };
}

export const drawHitRunPlayer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const snapshot = buildEntitySnapshot(world, entity, "player", 24);
    if (!snapshot) return;
    const elapsed = (world.tick ?? 0) / 60;
    ThemeRegistry.getActiveTheme().renderEntity(ctx, snapshot, elapsed);
  }
};

export const drawHitRunPopcorn: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const snapshot = buildEntitySnapshot(world, entity, "popcorn", 10);
    if (!snapshot) return;
    const elapsed = (world.tick ?? 0) / 60;
    ThemeRegistry.getActiveTheme().renderEntity(ctx, snapshot, elapsed);
  }
};

export const drawHitRunWallTrooper: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const snapshot = buildEntitySnapshot(world, entity, "wall_trooper", 14);
    if (!snapshot) return;
    const elapsed = (world.tick ?? 0) / 60;
    ThemeRegistry.getActiveTheme().renderEntity(ctx, snapshot, elapsed);
  }
};

export const drawHitRunHopper: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const snapshot = buildEntitySnapshot(world, entity, "hopper", 12);
    if (!snapshot) return;
    const elapsed = (world.tick ?? 0) / 60;
    ThemeRegistry.getActiveTheme().renderEntity(ctx, snapshot, elapsed);
  }
};

export const drawHitRunCharger: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const snapshot = buildEntitySnapshot(world, entity, "charger", 14);
    if (!snapshot) return;
    const elapsed = (world.tick ?? 0) / 60;
    ThemeRegistry.getActiveTheme().renderEntity(ctx, snapshot, elapsed);
  }
};

export interface HitRunSamuraiFallbackContext {
  snapshot: EntityRenderSnapshot;
  size: number;
  state: string;
  dead: boolean;
  windup: boolean;
  attack: boolean;
  sway: number;
  swordAngle: number;
}

export function resolveHitRunSamuraiFallbackContext(
  world: import("@tiny-aster/core").World<CoreComponentRegistry>,
  entity: number
): HitRunSamuraiFallbackContext | null {
  const snapshot = buildEntitySnapshot(world, entity, "samurai", 32);
  if (!snapshot) return null;

  const size = snapshot.size;
  const state = world.getComponent(entity, "StateMachine")?.currentState ?? "Patrol";
  const dead = world.hasComponent(entity, "Dead");
  const windup = state === "Anticipation" || state === "Windup";
  const attack = state === "Attack" || state === "Charge";
  const sway = Math.sin((world.tick ?? 0) / 60 * 6) * size * 0.018;
  const swordAngle = windup ? -1.1 : attack ? 0.18 : -0.26;

  return { snapshot, size, state, dead, windup, attack, sway, swordAngle };
}

/** Procedural Neo-Retro fallback used only when the bundled samurai PNG cannot load. */
export const drawHitRunSamuraiFallback: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const samuraiCtx = resolveHitRunSamuraiFallbackContext(world, entity);
    if (!samuraiCtx) return;

    const { snapshot, size, dead, attack, sway, swordAngle } = samuraiCtx;
    const outline = "#171923";
    const lacquer = "#c92337";
    const highlight = "#f05245";
    const gold = "#e6b84b";
    const steel = "#aeb8c8";

    ctx.save();
    ctx.translate(snapshot.x, snapshot.y);

    // Keep the shadow on the ground plane even while airborne.
    ctx.fillStyle = "rgba(3, 5, 11, 0.42)";
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.42, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, -snapshot.elevation);
    ctx.scale(snapshot.facing, 1);

    if (dead) {
      ctx.save();
      ctx.translate(0, -size * 0.22);
      ctx.rotate(-0.1);
      ctx.fillStyle = outline;
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.12, size * 0.52, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lacquer;
      ctx.beginPath();
      ctx.moveTo(-size * 0.32, -size * 0.25);
      ctx.lineTo(size * 0.18, -size * 0.37);
      ctx.lineTo(size * 0.42, -size * 0.12);
      ctx.lineTo(-size * 0.05, -size * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = steel;
      ctx.lineWidth = Math.max(1.2, size * 0.045);
      ctx.beginPath();
      ctx.moveTo(size * 0.22, -size * 0.18);
      ctx.lineTo(size * 0.78, size * 0.02);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      return;
    }

    // Armored greaves and boots, built around a stable feet baseline.
    ctx.fillStyle = outline;
    ctx.fillRect(-size * 0.27, -size * 0.28, size * 0.19, size * 0.25);
    ctx.fillRect(size * 0.07, -size * 0.28, size * 0.19, size * 0.25);
    ctx.fillStyle = "#303541";
    ctx.fillRect(-size * 0.25, -size * 0.27, size * 0.12, size * 0.17);
    ctx.fillRect(size * 0.09, -size * 0.27, size * 0.12, size * 0.17);
    ctx.fillStyle = "#0e1119";
    ctx.fillRect(-size * 0.31, -size * 0.08, size * 0.23, size * 0.08);
    ctx.fillRect(size * 0.04, -size * 0.08, size * 0.26, size * 0.08);

    // Split armored skirt/tassets.
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.moveTo(-size * 0.27, -size * 0.76);
    ctx.lineTo(size * 0.25, -size * 0.76);
    ctx.lineTo(size * 0.33, -size * 0.34);
    ctx.lineTo(size * 0.11, -size * 0.28);
    ctx.lineTo(-size * 0.02, -size * 0.43);
    ctx.lineTo(-size * 0.18, -size * 0.29);
    ctx.lineTo(-size * 0.35, -size * 0.37);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lacquer;
    ctx.beginPath();
    ctx.moveTo(-size * 0.22, -size * 0.72);
    ctx.lineTo(-size * 0.01, -size * 0.7);
    ctx.lineTo(-size * 0.08, -size * 0.38);
    ctx.lineTo(-size * 0.2, -size * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7e182a";
    ctx.beginPath();
    ctx.moveTo(size * 0.02, -size * 0.71);
    ctx.lineTo(size * 0.2, -size * 0.72);
    ctx.lineTo(size * 0.26, -size * 0.37);
    ctx.lineTo(size * 0.12, -size * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = gold;
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, -size * 0.63);
    ctx.lineTo(size * 0.2, -size * 0.62);
    ctx.stroke();

    // Layered red cuirass with dark bevels and bright plate seams.
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.moveTo(-size * 0.29, -size * 1.22);
    ctx.lineTo(size * 0.18, -size * 1.27);
    ctx.lineTo(size * 0.3, -size * 0.78);
    ctx.lineTo(size * 0.17, -size * 0.69);
    ctx.lineTo(-size * 0.28, -size * 0.72);
    ctx.lineTo(-size * 0.36, -size * 0.91);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lacquer;
    ctx.beginPath();
    ctx.moveTo(-size * 0.24, -size * 1.18);
    ctx.lineTo(size * 0.13, -size * 1.21);
    ctx.lineTo(size * 0.21, -size * 0.82);
    ctx.lineTo(-size * 0.23, -size * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = highlight;
    ctx.lineWidth = Math.max(1.2, size * 0.035);
    ctx.beginPath();
    ctx.moveTo(-size * 0.18, -size * 1.12);
    ctx.lineTo(size * 0.1, -size * 1.13);
    ctx.moveTo(-size * 0.21, -size * 0.98);
    ctx.lineTo(size * 0.17, -size * 0.99);
    ctx.moveTo(-size * 0.19, -size * 0.87);
    ctx.lineTo(size * 0.18, -size * 0.88);
    ctx.stroke();
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(-size * 0.04, -size * 1.1);
    ctx.lineTo(size * 0.05, -size * 1.09);
    ctx.lineTo(size * 0.02, -size * 0.93);
    ctx.lineTo(-size * 0.07, -size * 0.94);
    ctx.closePath();
    ctx.fill();

    // Shoulder guards and forearms.
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.ellipse(-size * 0.28, -size * 1.12, size * 0.16, size * 0.14, -0.25, 0, Math.PI * 2);
    ctx.ellipse(size * 0.23, -size * 1.11, size * 0.16, size * 0.14, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lacquer;
    ctx.beginPath();
    ctx.ellipse(-size * 0.28, -size * 1.13, size * 0.12, size * 0.09, -0.25, 0, Math.PI * 2);
    ctx.ellipse(size * 0.23, -size * 1.12, size * 0.12, size * 0.09, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = size * 0.11;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(size * 0.2, -size * 1.02);
    ctx.lineTo(size * 0.28, -size * 0.83);
    ctx.stroke();
    ctx.strokeStyle = lacquer;
    ctx.lineWidth = size * 0.07;
    ctx.beginPath();
    ctx.moveTo(size * 0.2, -size * 1.02);
    ctx.lineTo(size * 0.28, -size * 0.83);
    ctx.stroke();

    // Demon mask, bright eye slits, and gold oni horns.
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.ellipse(-size * 0.01 + sway, -size * 1.42, size * 0.23, size * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#34303a";
    ctx.beginPath();
    ctx.ellipse(-size * 0.01 + sway, -size * 1.42, size * 0.18, size * 0.19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff554c";
    ctx.fillRect(-size * 0.14 + sway, -size * 1.45, size * 0.09, size * 0.035);
    ctx.fillRect(size * 0.02 + sway, -size * 1.45, size * 0.09, size * 0.035);
    ctx.strokeStyle = gold;
    ctx.lineWidth = size * 0.055;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 0.14 + sway, -size * 1.56);
    ctx.lineTo(-size * 0.28 + sway, -size * 1.72);
    ctx.lineTo(-size * 0.2 + sway, -size * 1.88);
    ctx.moveTo(size * 0.1 + sway, -size * 1.56);
    ctx.lineTo(size * 0.27 + sway, -size * 1.72);
    ctx.lineTo(size * 0.19 + sway, -size * 1.88);
    ctx.stroke();

    // Clearly readable katana. Wind-up pulls back; active attack sweeps forward.
    ctx.save();
    ctx.translate(size * 0.25, -size * 0.87);
    ctx.rotate(swordAngle + (attack ? Math.sin((world.tick ?? 0) * 0.8) * 0.1 : 0));
    ctx.strokeStyle = outline;
    ctx.lineWidth = size * 0.11;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 0.08, 0);
    ctx.lineTo(size * 0.19, size * 0.01);
    ctx.stroke();
    ctx.strokeStyle = gold;
    ctx.lineWidth = size * 0.045;
    ctx.beginPath();
    ctx.moveTo(size * 0.06, -size * 0.075);
    ctx.lineTo(size * 0.06, size * 0.08);
    ctx.stroke();
    ctx.strokeStyle = steel;
    ctx.lineWidth = size * 0.075;
    ctx.beginPath();
    ctx.moveTo(size * 0.16, 0);
    ctx.lineTo(size * 0.98, -size * 0.08);
    ctx.stroke();
    ctx.strokeStyle = "#f4f5f8";
    ctx.lineWidth = size * 0.022;
    ctx.beginPath();
    ctx.moveTo(size * 0.18, -size * 0.018);
    ctx.lineTo(size * 0.91, -size * 0.09);
    ctx.stroke();
    ctx.restore();

    if (attack) {
      ctx.strokeStyle = "rgba(240, 244, 255, 0.55)";
      ctx.lineWidth = size * 0.035;
      ctx.beginPath();
      ctx.arc(size * 0.15, -size * 0.92, size * 0.75, -0.7, 0.28);
      ctx.stroke();
    }

    if (snapshot.hitFlash > 0) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.94, size * 0.38, size * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
};

export const drawHitRunElite: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const snapshot = buildEntitySnapshot(world, entity, "elite", 22);
    if (!snapshot) return;
    const elapsed = (world.tick ?? 0) / 60;
    ThemeRegistry.getActiveTheme().renderEntity(ctx, snapshot, elapsed);
  }
};

export const drawHitRunBullet: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const snapshot = buildEntitySnapshot(world, entity, "bullet", 3);
    if (!snapshot) return;
    const elapsed = (world.tick ?? 0) / 60;
    ThemeRegistry.getActiveTheme().renderProjectile(ctx, snapshot, elapsed);
  }
};

export const drawHitRunRocket: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const snapshot = buildEntitySnapshot(world, entity, "rocket", 7);
    if (!snapshot) return;
    const elapsed = (world.tick ?? 0) / 60;
    ThemeRegistry.getActiveTheme().renderProjectile(ctx, snapshot, elapsed);
  }
};
