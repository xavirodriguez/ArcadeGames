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

/** Procedural fallback used only when the bundled samurai PNG cannot load. */
export const drawHitRunSamuraiFallback: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const snapshot = buildEntitySnapshot(world, entity, "samurai", 32);
    if (!snapshot) return;
    const elapsed = (world.tick ?? 0) / 60;
    ThemeRegistry.getActiveTheme().renderEntity(ctx, snapshot, elapsed);
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
