import { World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry } from "../types/TowerDefenseTypes";
import { colors } from "../../../theme/colors";

export interface CreepVisualState {
  size: number;
  slowed: boolean;
  fill: string;
  stroke: string;
  innerStroke?: string;
}

export function resolveCreepVisualState(
  world: World<TowerDefenseComponentRegistry>,
  entity: number,
  defaultSize: number,
  type: "grunt" | "fast" | "tank" | "boss"
): CreepVisualState {
  const render = world.getComponent(entity, "Render");
  const creep = world.getComponent(entity, "Creep");
  const size = render?.size ?? defaultSize;
  const slowed = (creep?.slowRemainingMs ?? 0) > 0;

  if (type === "grunt") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, colors.cyan, "creep_slowed")
      : resolveThemeColorWithFallback(world, colors.orange, "creep_grunt", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, colors.cyan, "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, colors.amber, "creep_grunt_stroke");
    return { size, slowed, fill, stroke };
  }

  if (type === "fast") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, colors.cyan, "creep_slowed")
      : resolveThemeColorWithFallback(world, colors.blue, "creep_fast", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, colors.cyan, "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, colors.blueLight, "creep_fast_stroke");
    return { size, slowed, fill, stroke };
  }

  if (type === "tank") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, colors.cyan, "creep_slowed")
      : resolveThemeColorWithFallback(world, colors.slate, "creep_tank", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, colors.cyan, "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, colors.neutral, "creep_tank_stroke");
    return { size, slowed, fill, stroke };
  }

  // Boss
  const fill = slowed
    ? resolveThemeColorWithFallback(world, colors.cyan, "creep_slowed")
    : resolveThemeColorWithFallback(world, colors.red, "creep_boss", "boss");
  const stroke = slowed
    ? resolveThemeColorWithFallback(world, colors.cyan, "creep_slowed_stroke")
    : resolveThemeColorWithFallback(world, colors.danger, "creep_boss_stroke");
  const innerStroke = slowed
    ? resolveThemeColorWithFallback(world, colors.cyan, "creep_slowed_stroke")
    : resolveThemeColorWithFallback(world, colors.pink, "creep_boss_inner_stroke");

  return { size, slowed, fill, stroke, innerStroke };
}

export interface TowerProjectileDrawSetup {
  size: number;
  frost: boolean;
  color: string;
}

export function resolveTowerProjectileDrawSetup(
  world: World<TowerDefenseComponentRegistry>,
  entity: number
): TowerProjectileDrawSetup {
  const render = world.getComponent(entity, "Render");
  const proj = world.getComponent(entity, "TowerProjectile");
  const size = render?.size ?? 4;
  const frost = !!(proj?.slowFactor && proj.slowFactor < 1);
  const color = frost
    ? resolveThemeColorWithFallback(world, colors.cyan, "tower_projectile_frost")
    : resolveThemeColorWithFallback(world, colors.yellow, "tower_projectile", "bullet");

  return { size, frost, color };
}

export function isPaperDuskTheme(world: World<TowerDefenseComponentRegistry>): boolean {
  const pdGround = resolveThemeColorWithFallback(world, "", "pd_ground");
  return Boolean(pdGround);
}

export interface TdMapBackgroundContext {
  layout: import("../../shared/grid/GridTypes").GridLayout;
  tileGrid: import("../types/TowerDefenseTypes").TileGrid;
}

export function resolveTdMapBackgroundContext(
  world: World<TowerDefenseComponentRegistry>
): TdMapBackgroundContext | null {
  const layout = world.getResource<import("../../shared/grid/GridTypes").GridLayout>("GridLayout");
  const tileGrid = world.getResource<import("../types/TowerDefenseTypes").TileGrid>("TileGrid");
  if (!layout || !tileGrid) return null;
  return { layout, tileGrid };
}

export function forEachTileGridCell(
  bgCtx: TdMapBackgroundContext,
  callback: (tile: any, x: number, y: number, row: number, col: number) => void
): void {
  const { layout, tileGrid } = bgCtx;
  for (let row = 0; row < tileGrid.rows; row++) {
    for (let col = 0; col < tileGrid.cols; col++) {
      const tile = tileGrid.tiles[row]?.[col];
      const x = layout.offsetX + col * layout.stepX;
      const y = layout.offsetY + row * layout.stepY;
      callback(tile, x, y, row, col);
    }
  }
}
