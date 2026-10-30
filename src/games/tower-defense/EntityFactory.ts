import { World, EntityBuilder, ShapeType, CircleShape, BoundaryComponent, TTLComponent, HealthComponent } from "@tiny-aster/core";
import { CollisionLayers, FactionComponent, DamageComponent } from "@tiny-aster/gameplay-kit";
import type {
  TowerDefenseComponentRegistry,
  InputComponent,
  PlayerComponent,
  CreepComponent,
  TowerComponent,
  TowerProjectileComponent,
} from "./types/TowerDefenseTypes";
import type { TowerDefenseConfig, CreepDefinition, TowerDefinition } from "./types/TowerDefenseConfigSchema";
import { cellCenter } from "./MapUtils";
import type { GridLayout } from "../shared/grid/GridTypes";
import { attachEnemyDefaults } from "../shared/enemyHelpers";
import { TOWER_DEFENSE_VISUAL_TOKENS } from "./presentation/TowerDefenseVisualTokens";

export function createInputComponent(): InputComponent {
  return {
    type: "Input",
    cursorX: 0,
    cursorY: 0,
    build: false,
    sell: false,
    upgrade: false,
    startWave: false,
    selectCell: false,
    actions: [],
    axes: {},
  };
}

export function createPlayerComponent(selectedTowerType: string | null = "basic"): PlayerComponent {
  return {
    type: "Player",
    selectedTowerType,
    selectedCell: null,
  };
}

const CREEP_MIN_RENDER_SIZES: Readonly<Record<string, number>> = {
  grunt: 28,
  fast: 26,
  tank: 34,
  boss: 44,
};

const CREEP_MAX_RENDER_SIZES: Readonly<Record<string, number>> = {
  grunt: 34,
  fast: 32,
  tank: 40,
  boss: 52,
};

/** Keeps enemies readable on a 40px path tile without inflating their colliders. */
export function getCreepRenderSize(creepType: string, configuredSize: number): number {
  const minimum = CREEP_MIN_RENDER_SIZES[creepType] ?? 28;
  const maximum = CREEP_MAX_RENDER_SIZES[creepType] ?? 36;
  // Stronger scale so creeps stay visible on dark path + space debris.
  const scaledSize = Number.isFinite(configuredSize) && configuredSize > 0
    ? configuredSize * 2.15
    : minimum;
  return Math.min(maximum, Math.max(minimum, scaledSize));
}

export function populateCreep(
  world: World<TowerDefenseComponentRegistry>,
  entity: number,
  def: CreepDefinition,
  x: number,
  y: number
): number {
  // High order + saturated color so creeps paint above path/debris.
  // Redeploy tip: TowerDefenseGame must include safeCanvasCreep (not RESTORE_FROM_MASTER_PLEASE).
  const renderSize = getCreepRenderSize(def.id, def.size);
  EntityBuilder.fromEntity(world, entity)
    .withTransform({ x, y })
    .withVelocity({ vx: 0, vy: 0 })
    .withRender({
      shape: `creep_${def.id}`,
      size: renderSize,
      color: TOWER_DEFENSE_VISUAL_TOKENS.entityDefaults.creep,
      order: 50,
      visible: true,
      opacity: 1,
    })
    .withCollider({
      shape: { type: ShapeType.Circle, radius: Math.max(8, def.size * 0.75) } as CircleShape,
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PROJECTILE,
    })
    .withCollisionEvents();

  world.addComponent(entity, {
    type: "Creep",
    creepType: def.id,
    speed: def.speed,
    baseSpeed: def.speed,
    reward: def.reward,
    waypointIndex: 0,
    pathProgress: 0,
    slowRemainingMs: 0,
    slowFactor: 1,
  } as CreepComponent);

  attachEnemyDefaults(world, entity, {
    currentHp: def.hp,
    maxHp: def.hp,
    faction: "enemy",
    includeLootTable: false
  });

  return entity;
}

export function spawnCreep(
  world: World<TowerDefenseComponentRegistry>,
  def: CreepDefinition,
  x: number,
  y: number
): number {
  const entity = world.createEntity();
  return populateCreep(world, entity, def, x, y);
}

export function populateTower(
  world: World<TowerDefenseComponentRegistry>,
  entity: number,
  def: TowerDefinition,
  col: number,
  row: number,
  layout: GridLayout
): number {
  const pos = cellCenter(col, row, layout);
  EntityBuilder.fromEntity(world, entity)
    .withTransform({ x: pos.x, y: pos.y })
    .withRender({ shape: `tower_${def.id}`, size: layout.stepX * 0.7, color: TOWER_DEFENSE_VISUAL_TOKENS.entityDefaults.tower, order: 8 })
    .withCollider({
      shape: { type: ShapeType.Circle, radius: layout.stepX * 0.3 } as CircleShape,
      layer: CollisionLayers.PLAYER,
      mask: 0,
    });

  world.addComponent(entity, {
    type: "Tower",
    towerType: def.id,
    range: def.range,
    damage: def.damage,
    fireRate: def.fireRate,
    projectileSpeed: def.projectileSpeed,
    level: 1,
    maxLevel: def.maxLevel ?? 3,
    cost: def.cost,
    cooldownRemaining: 0,
    targetEntity: null,
    col,
    row,
  } as TowerComponent);

  world.addComponent(entity, {
    type: "Faction",
    faction: "player",
  } as FactionComponent);

  return entity;
}

export function spawnTower(
  world: World<TowerDefenseComponentRegistry>,
  def: TowerDefinition,
  col: number,
  row: number,
  layout: GridLayout
): number {
  const entity = world.createEntity();
  return populateTower(world, entity, def, col, row, layout);
}

export function populateTowerProjectile(
  world: World<TowerDefenseComponentRegistry>,
  entity: number,
  config: TowerDefenseConfig,
  x: number,
  y: number,
  targetEntity: number | null,
  damage: number,
  speed: number,
  slow?: { factor: number; durationMs: number }
): number {
  EntityBuilder.fromEntity(world, entity)
    .withTransform({ x, y })
    .withVelocity({ vx: 0, vy: 0 })
    .withRender({
      shape: "tower_projectile",
      size: config.PROJECTILE_SIZE,
      color: "yellow",
      order: 10,
    })
    .withCollider({
      shape: { type: ShapeType.Circle, radius: config.PROJECTILE_SIZE * 2 } as CircleShape,
      layer: CollisionLayers.PROJECTILE,
      mask: CollisionLayers.ENEMY,
      isTrigger: true,
    })
    .withCollisionEvents()
    .withTTL(config.PROJECTILE_TTL / 1000);

  world.addComponent(entity, {
    type: "Boundary",
    width: config.worldWidth,
    height: config.worldHeight,
    mode: "destroy",
  } as BoundaryComponent);

  world.addComponent(entity, {
    type: "TowerProjectile",
    targetEntity,
    speed,
    slowFactor: slow?.factor,
    slowDurationMs: slow?.durationMs,
  } as TowerProjectileComponent);

  world.addComponent(entity, {
    type: "Damage",
    amount: damage,
    category: "tower_projectile",
    friendlyFire: false,
    consumption: "destroy-entity",
  } as DamageComponent);

  world.addComponent(entity, {
    type: "Faction",
    faction: "player",
  } as FactionComponent);

  return entity;
}

export function spawnTowerProjectile(
  world: World<TowerDefenseComponentRegistry>,
  config: TowerDefenseConfig,
  x: number,
  y: number,
  targetEntity: number | null,
  damage: number,
  speed: number,
  slow?: { factor: number; durationMs: number }
): number {
  const entity = world.createEntity();
  return populateTowerProjectile(world, entity, config, x, y, targetEntity, damage, speed, slow);
}
