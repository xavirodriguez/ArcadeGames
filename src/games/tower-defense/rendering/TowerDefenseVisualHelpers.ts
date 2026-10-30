import { World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import type {
  TowerDefenseComponentRegistry,
  TowerDefenseVisualEffects,
  GameStateComponent,
  TileGrid,
  TowerCatalog,
} from "../types/TowerDefenseTypes";
import type { TowerDefinition } from "../types/TowerDefenseConfigSchema";
import type { GridLayout } from "../../shared/grid/GridTypes";
import { TOWER_DEFENSE_VISUAL_TOKENS } from "../presentation/TowerDefenseVisualTokens";
import { createIsoConfig, worldToIso, depthOf, projectVector, type IsoConfig, type Point2D } from "./IsoProjection";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";

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
  strideOrIsoCfg: number | IsoConfig = 2,
  isoCfgOpt?: IsoConfig
): PathDirectionMarker[] {
  if (points.length < 3) return [];

  let stride = 2;
  let isoCfg: IsoConfig | undefined;

  if (typeof strideOrIsoCfg === "number") {
    stride = strideOrIsoCfg;
    isoCfg = isoCfgOpt;
  } else if (strideOrIsoCfg && typeof strideOrIsoCfg === "object") {
    isoCfg = strideOrIsoCfg;
    stride = 2;
  }

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

    const curP = isoCfg && isoCfg.enabled ? worldToIso(isoCfg, current.x, current.y) : current;
    const nextP = isoCfg && isoCfg.enabled ? worldToIso(isoCfg, next.x, next.y) : next;

    const pdx = nextP.x - curP.x;
    const pdy = nextP.y - curP.y;

    markers.push({ x: curP.x, y: curP.y, angle: Math.atan2(pdy, pdx) });
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

export function resolveCreepAnimationState(
  world: World<TowerDefenseComponentRegistry>,
  entity: number,
  type: CreepAnimationType
): CreepAnimationState {
  const elapsed = world.getResource<TowerDefenseVisualEffects>("TowerDefenseVisualEffects")?.elapsedSeconds ?? 0;
  const rate = type === "fast" ? 12 : type === "tank" ? 3.4 : type === "boss" ? 2.2 : 6.2;
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

  if (type === "grunt") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.slowed.fill, "creep_slowed")
      : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.grunt.fill, "creep_grunt", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.slowed.stroke, "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.grunt.stroke, "creep_grunt_stroke");
    return { size, slowed, fill, stroke };
  }

  if (type === "fast") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.slowed.fill, "creep_slowed")
      : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.fast.fill, "creep_fast", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.slowed.stroke, "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.fast.stroke, "creep_fast_stroke");
    return { size, slowed, fill, stroke };
  }

  if (type === "tank") {
    const fill = slowed
      ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.slowed.fill, "creep_slowed")
      : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.tank.fill, "creep_tank", "enemy");
    const stroke = slowed
      ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.slowed.stroke, "creep_slowed_stroke")
      : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.tank.stroke, "creep_tank_stroke");
    return { size, slowed, fill, stroke };
  }

  const fill = slowed
    ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.slowed.fill, "creep_slowed")
    : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.boss.fill, "creep_boss", "boss");
  const stroke = slowed
    ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.slowed.stroke, "creep_slowed_stroke")
    : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.boss.stroke, "creep_boss_stroke");
  const innerStroke = slowed
    ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.slowed.stroke, "creep_slowed_stroke")
    : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.creepRendering.boss.innerStroke, "creep_boss_inner_stroke");

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

  const gameConfig = world.getResource<TowerDefenseConfig>("GameConfig");
  const isoCfg = gameConfig ? createIsoConfig(gameConfig) : createIsoConfig({ projection: "topdown" });

  let angle = -Math.PI / 2;
  if (transform && targetTransform) {
    const origin = resolveTransformWorldPosition(transform);
    const target = resolveTransformWorldPosition(targetTransform);
    const direction = projectVector(isoCfg, target.x - origin.x, target.y - origin.y);
    angle = Math.atan2(direction.y, direction.x);
  }

  const barrelColor = type === "sniper"
    ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.weapon.sniper, "tower_sniper_barrel")
    : type === "rapid"
      ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.weapon.rapid, "tower_rapid_barrel")
      : type === "frost"
        ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.weapon.frost, "tower_frost_flake", "tower_frost_accent")
        : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.weapon.basic, "tower_basic_accent");
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
  const cx = x;
  const cy = y;
  const fill = kind === "spawn"
    ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.mapLandmarks.spawn, "map_spawn", "accent")
    : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.mapLandmarks.base, "map_base", "primary");
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
    ? resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.weapon.projectileFrost, "tower_projectile_frost")
    : resolveThemeColorWithFallback(world, TOWER_DEFENSE_VISUAL_TOKENS.towerRendering.weapon.projectile, "tower_projectile", "bullet");

  return { size, frost, color };
}

export function isPaperDuskTheme(world: World<TowerDefenseComponentRegistry>): boolean {
  const pdGround = resolveThemeColorWithFallback(world, "", "pd_ground");
  return Boolean(pdGround);
}

export interface TdProjectedBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

/** Converts a logical world position to the active presentation coordinate space. */
export function resolveTdScreenPosition(isoCfg: IsoConfig, x: number, y: number): Point2D {
  return isoCfg.enabled ? worldToIso(isoCfg, x, y) : { x, y };
}

/** Calculates the projected map bounds once for both rendering backends. */
export function resolveTdProjectedBounds(
  layout: GridLayout,
  tileGrid: TileGrid,
  isoCfg: IsoConfig
): TdProjectedBounds {
  const corners = [
    resolveTdScreenPosition(isoCfg, layout.offsetX, layout.offsetY),
    resolveTdScreenPosition(isoCfg, layout.offsetX + tileGrid.cols * layout.stepX, layout.offsetY),
    resolveTdScreenPosition(isoCfg, layout.offsetX, layout.offsetY + tileGrid.rows * layout.stepY),
    resolveTdScreenPosition(
      isoCfg,
      layout.offsetX + tileGrid.cols * layout.stepX,
      layout.offsetY + tileGrid.rows * layout.stepY
    ),
  ];
  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export interface TowerPlacementPreviewSetup {
  col: number;
  row: number;
  towerType: string;
  definition: TowerDefinition;
  center: Point2D;
  buildable: boolean;
  canAfford: boolean;
  canBuild: boolean;
}

/** Resolves all shared placement-preview/gameplay state; renderers only draw it. */
export function resolveTowerPlacementPreviewSetup(
  world: World<TowerDefenseComponentRegistry>,
  layout: GridLayout,
  tileGrid: TileGrid,
  isoCfg: IsoConfig
): TowerPlacementPreviewSetup | null {
  const playerEntity = world.query("Player")[0];
  if (playerEntity === undefined) return null;

  const input = world.getComponent(playerEntity, "Input");
  if (!input) return null;

  const catalog = world.getResource<TowerCatalog>("TowerCatalog");
  const gameState = world.getSingleton("GameState") as GameStateComponent | undefined;
  const player = world.getComponent(playerEntity, "Player");
  const towerType = player?.selectedTowerType ?? gameState?.selectedTowerType ?? "basic";
  const definition = catalog?.[towerType];
  if (!definition) return null;

  // Input cursor is already a logical world-space cell center.
  const col = Math.floor((input.cursorX - layout.offsetX) / layout.stepX);
  const row = Math.floor((input.cursorY - layout.offsetY) / layout.stepY);
  if (row < 0 || row >= tileGrid.rows || col < 0 || col >= tileGrid.cols) return null;

  const worldCenterX = layout.offsetX + (col + 0.5) * layout.stepX;
  const worldCenterY = layout.offsetY + (row + 0.5) * layout.stepY;
  const center = resolveTdScreenPosition(isoCfg, worldCenterX, worldCenterY);
  const buildable = tileGrid.tiles[row]?.[col] === "buildable";
  const occupied = world.query("Tower").some((entity) => {
    const tower = world.getComponent(entity, "Tower");
    return tower?.col === col && tower.row === row;
  });
  const canAfford = (gameState?.gold ?? 0) >= definition.cost;

  return {
    col,
    row,
    towerType,
    definition,
    center,
    buildable,
    canAfford,
    canBuild: buildable && canAfford && !occupied,
  };
}

export interface TdMapBackgroundContext {
  layout: import("../../shared/grid/GridTypes").GridLayout;
  tileGrid: import("../types/TowerDefenseTypes").TileGrid;
  isoCfg: IsoConfig;
}

export function resolveTdMapBackgroundContext(
  world: World<TowerDefenseComponentRegistry>
): TdMapBackgroundContext | null {
  const layout = world.getResource<import("../../shared/grid/GridTypes").GridLayout>("GridLayout");
  const tileGrid = world.getResource<import("../types/TowerDefenseTypes").TileGrid>("TileGrid");
  const gameConfig = world.getResource<TowerDefenseConfig>("GameConfig");
  if (!layout || !tileGrid || !gameConfig) return null;

  const isoCfg = createIsoConfig(gameConfig);
  return { layout, tileGrid, isoCfg };
}

/**
 * Iterates through tile grid cells.
 * Passes the projected cell center (x, y) to the callback in isometric mode,
 * or top-left (x, y) in top-down mode.
 */
export function forEachTileGridCell(
  bgCtx: TdMapBackgroundContext,
  callback: (tile: any, x: number, y: number, row: number, col: number) => void
): void {
  const { layout, tileGrid, isoCfg } = bgCtx;
  for (let row = 0; row < tileGrid.rows; row++) {
    for (let col = 0; col < tileGrid.cols; col++) {
      const tile = tileGrid.tiles[row]?.[col];
      const cellCenterX = layout.offsetX + (col + 0.5) * layout.stepX;
      const cellCenterY = layout.offsetY + (row + 0.5) * layout.stepY;

      if (isoCfg.enabled) {
        const isoPoint = worldToIso(isoCfg, cellCenterX, cellCenterY);
        callback(tile, isoPoint.x, isoPoint.y, row, col);
      } else {
        const topLeftX = layout.offsetX + col * layout.stepX;
        const topLeftY = layout.offsetY + row * layout.stepY;
        callback(tile, topLeftX, topLeftY, row, col);
      }
    }
  }
}

/** Returns entity visual height in pixels (e.g. 22px for towers, 8px for creeps). */
export function getEntityVisualHeight(type?: string): number {
  if (type === "tower") return 22;
  if (type === "creep") return 8;
  return 0;
}

/** Resolves the authoritative world-space position used by render planning and projection. */
export function resolveTransformWorldPosition(
  transform: { x: number; y: number; worldX?: number; worldY?: number } | undefined
): Point2D {
  if (!transform) return { x: 0, y: 0 };
  return {
    x: transform.worldX ?? transform.x,
    y: transform.worldY ?? transform.y,
  };
}

/** Returns the isometric screen position and visual height offset for an entity. */
export function resolveEntityIsometricOffset(
  world: World<TowerDefenseComponentRegistry>,
  entity: number,
  type: "tower" | "creep" | "projectile"
): {
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  drawY: number;
  isoCfg: IsoConfig;
} {
  const worldPosition = resolveTransformWorldPosition(world.getComponent(entity, "Transform"));
  const gameConfig = world.getResource<TowerDefenseConfig>("GameConfig");
  const isoCfg = gameConfig ? createIsoConfig(gameConfig) : createIsoConfig({ projection: "topdown" });

  if (isoCfg.enabled) {
    const screenPosition = worldToIso(isoCfg, worldPosition.x, worldPosition.y);
    const heightPx = getEntityVisualHeight(type);
    return {
      worldX: worldPosition.x,
      worldY: worldPosition.y,
      screenX: screenPosition.x,
      screenY: screenPosition.y,
      drawY: screenPosition.y - heightPx,
      isoCfg,
    };
  }

  return {
    worldX: worldPosition.x,
    worldY: worldPosition.y,
    screenX: worldPosition.x,
    screenY: worldPosition.y,
    drawY: worldPosition.y,
    isoCfg,
  };
}
