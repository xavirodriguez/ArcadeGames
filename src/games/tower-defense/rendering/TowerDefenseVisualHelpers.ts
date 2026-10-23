import { World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, TowerDefenseVisualEffects } from "../types/TowerDefenseTypes";
import { colors } from "../../../theme/colors";

export interface PathDirectionMarker {
  x: number;
  y: number;
  angle: number;
}

/**
 * Places subtle directional chevrons along the enemy route.
 * Excludes the spawn and base endpoints and ignores invalid or duplicate points.
 */
export function createPathDirectionMarkers(
  points: ReadonlyArray<{ x: number; y: number }>,
  stride = 2
): PathDirectionMarker[] {
  if (points.length < 3) return [];

  const interval = Number.isFinite(stride) ? Math.max(1, Math.floor(stride)) : 2;
  const markers: PathDirectionMarker[] = [];

  for (let index = interval; index < points.length - 1; index += interval) {
    const current = points[index];
    const next = points[index + 1];
    if (!current || !next) continue;
    if (
      !Number.isFinite(current.x) ||
      !Number.isFinite(current.y) ||
      !Number.isFinite(next.x) ||
      !Number.isFinite(next.y)
    ) {
      continue;
    }

    const dx = next.x - current.x;
    const dy = next.y - current.y;
    if (dx === 0 && dy === 0) continue;

    markers.push({ x: current.x, y: current.y, angle: Math.atan2(dy, dx) });
  }

  return markers;
}
export type CreepAnimationType = "grunt" | "fast" | "tank" | "boss";

export interface CreepAnimationState {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

/**
 * Small deterministic presentation animation shared by Canvas and Skia.
 * It only reads the visual clock and never modifies movement or hitboxes.
 */
export function resolveCreepAnimationState(
  world: World<TowerDefenseComponentRegistry>,
  entity: number,
  type: CreepAnimationType
): CreepAnimationState {
  const elapsed = world.getResource<TowerDefenseVisualEffects>("TowerDefenseVisualEffects")?.elapsedSeconds ?? 0;
  const rate = type === "fast" ? 12 : type === "tank" ? 3.4 : type === "boss" ? 2.2 : 6.2;
  // Slightly stronger bob so motion reads clearly even on busy backgrounds.
  const amplitude = type === "tank" ? 0.9 : type === "boss" ? 1.6 : type === "fast" ? 2.0 : 1.35;
  const phase = elapsed * rate + entity * 0.73;
  const bob = Math.sin(phase);
  return {
    offsetX: type === "fast" ? Math.cos(phase) * 0.9 : 0,
    offsetY: bob * amplitude,
    scaleX: 1 + Math.sin(phase * 0.7) * (type === "boss" ? 0.04 : 0.028),
    scaleY: 1 - Math.sin(phase * 0.7) * (type === "boss" ? 0.04 : 0.028),
    rotation: type === "fast" ? bob * 0.04 : type === "boss" ? Math.sin(elapsed * 1.6 + entity) * 0.028 : 0,
  };
}
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

  // High-contrast fallbacks so creeps never blend into the dark path / space debris.
  if (type === "grunt") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, "#5eead4", "creep_slowed")
      : resolveThemeColorWithFallback(world, "#ff8a3d", "creep_grunt", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, "#99f6e4", "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, "#ffe566", "creep_grunt_stroke");
    return { size, slowed, fill, stroke };
  }

  if (type === "fast") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, "#5eead4", "creep_slowed")
      : resolveThemeColorWithFallback(world, "#4fc3f7", "creep_fast", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, "#99f6e4", "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, "#e0f7fa", "creep_fast_stroke");
    return { size, slowed, fill, stroke };
  }

  if (type === "tank") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, "#5eead4", "creep_slowed")
      : resolveThemeColorWithFallback(world, "#94a3b8", "creep_tank", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, "#99f6e4", "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, "#f1f5f9", "creep_tank_stroke");
    return { size, slowed, fill, stroke };
  }

  // Boss
  const fill = slowed
    ? resolveThemeColorWithFallback(world, "#5eead4", "creep_slowed")
    : resolveThemeColorWithFallback(world, "#ef4444", "creep_boss", "boss");
  const stroke = slowed
    ? resolveThemeColorWithFallback(world, "#99f6e4", "creep_slowed_stroke")
    : resolveThemeColorWithFallback(world, "#fecaca", "creep_boss_stroke");
  const innerStroke = slowed
    ? resolveThemeColorWithFallback(world, "#99f6e4", "creep_slowed_stroke")
    : resolveThemeColorWithFallback(world, "#f9a8d4", "creep_boss_inner_stroke");

  return { size, slowed, fill, stroke, innerStroke };
}

export interface TowerWeaponDrawSetup {
  angle: number;
  barrelColor: string;
  inkColor: string;
  barrelLength: number;
  barrelWidth: number;
  firing: boolean;
  pulse: number;
}

export function resolveTowerWeaponDrawSetup(
  world: World<TowerDefenseComponentRegistry>,
  entity: number,
  size: number,
  type: "basic" | "sniper" | "rapid" | "frost"
): TowerWeaponDrawSetup {
  const tower = world.getComponent(entity, "Tower");
  const transform = world.getComponent(entity, "Transform");
  const targetTransform = tower && tower.targetEntity !== null
    ? world.getComponent(tower.targetEntity, "Transform")
    : undefined;
  const angle = transform && targetTransform
    ? Math.atan2(targetTransform.y - transform.y, targetTransform.x - transform.x)
    : -Math.PI / 2;

  const barrelColor = type === "sniper"
    ? resolveThemeColorWithFallback(world, colors.violet, "tower_sniper_barrel")
    : type === "rapid"
      ? resolveThemeColorWithFallback(world, colors.green, "tower_rapid_barrel")
      : type === "frost"
        ? resolveThemeColorWithFallback(world, "#e0f7fa", "tower_frost_flake", "tower_frost_accent")
        : resolveThemeColorWithFallback(world, colors.blueLight, "tower_basic_accent");
  const inkColor = isPaperDuskTheme(world)
    ? resolveThemeColorWithFallback(world, "#14161B", "pd_ink")
    : "#101827";
  const barrelLength = size * (type === "sniper" ? 0.62 : type === "rapid" ? 0.5 : 0.54);
  const barrelWidth = Math.max(3, size * (type === "sniper" ? 0.15 : 0.12));
  const cooldownDuration = tower && tower.fireRate > 0 ? 1 / tower.fireRate : 0;
  const firing = Boolean(
    tower &&
    cooldownDuration > 0 &&
    tower.cooldownRemaining > 0 &&
    tower.cooldownRemaining >= cooldownDuration * 0.9
  );

  const elapsedSeconds = world.getResource<TowerDefenseVisualEffects>("TowerDefenseVisualEffects")?.elapsedSeconds ?? 0;
  const pulse = 0.5 + 0.5 * Math.sin(elapsedSeconds * 4.8 + entity * 0.17);

  return {
    angle,
    barrelColor,
    inkColor,
    barrelLength,
    barrelWidth,
    firing,
    pulse,
  };
}

export interface TdLandmarkSetup {
  cx: number;
  cy: number;
  fill: string;
  outline: string;
  pulse: number;
}

export function resolveTdLandmarkSetup(
  world: World<TowerDefenseComponentRegistry>,
  x: number,
  y: number,
  size: number,
  kind: "spawn" | "base",
  isPaperDusk: boolean
): TdLandmarkSetup {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const fill = kind === "spawn"
    ? resolveThemeColorWithFallback(world, "#ef5350", "map_spawn", "accent")
    : resolveThemeColorWithFallback(world, "#43a047", "map_base", "primary");
  const outline = isPaperDusk
    ? resolveThemeColorWithFallback(world, "#14161B", "pd_ink")
    : "#101827";

  const elapsedSeconds = world.getResource<TowerDefenseVisualEffects>("TowerDefenseVisualEffects")?.elapsedSeconds ?? 0;
  const pulse = 0.5 + 0.5 * Math.sin(elapsedSeconds * 3.4 + (kind === "base" ? 0 : 1.8));

  return { cx, cy, fill, outline, pulse };
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
