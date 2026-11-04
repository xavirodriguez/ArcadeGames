import { World, Entity, ShapeType, EntityBuilder } from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { GalaxianComponentRegistry, GalaxianInputComponent, FormationComponent, GalaxianStateComponent, EnemyType } from "./types/GalaxianTypes";
import { GalaxianConfig } from "./types/GalaxianConfigSchema";
import { EnemyFactory } from "./EnemyFactory";
import { getWaveDiveIntervalSeconds } from "./WaveDifficulty";

export function createGalaxianInputComponent(): GalaxianInputComponent {
  return {
    type: "Input",
    moveLeft: false,
    moveRight: false,
    shoot: false,
    shootCooldownRemaining: 0,
    actions: [],
    axes: {},
  };
}

export function createPlayer(world: World<GalaxianComponentRegistry>, x: number, y: number): Entity {
  const config = world.getResource<GalaxianConfig>("GameConfig");
  const renderWidth = config?.PLAYER_RENDER_WIDTH ?? 32;
  const colliderRadius = config?.PLAYER_COLLIDER_RADIUS ?? 12;

  const entity = EntityBuilder.create(world)
    .withTransform({ x, y, rotation: 0 })
    .withVelocity()
    .withRender({
      shape: "player_ship",
      size: renderWidth,
      color: "#FFF6E5",
      order: 10,
    })
    .withCollider({
      shape: { type: ShapeType.Circle, radius: colliderRadius },
      layer: CollisionLayers.PLAYER,
      mask: CollisionLayers.ENEMY | CollisionLayers.PROJECTILE,
    })
    .withCollisionEvents()
    .build();

  world.addComponent(entity, createGalaxianInputComponent());
  world.addComponent(entity, { type: "Player" });
  world.addComponent(entity, {
    type: "VisualPose",
    rotation: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    visualOffsetX: 0,
    visualOffsetY: 0,
    previousX: x,
    previousY: y,
    hasPreviousPosition: false,
  });

  return entity;
}

export function createGameState(world: World<GalaxianComponentRegistry>): Entity {
  const config = world.getResource<GalaxianConfig>("GameConfig");
  const entity = world.createEntity();
  world.addComponent(entity, {
    type: "GameState",
    lives: config?.PLAYER_INITIAL_LIVES ?? 3,
    score: 0,
    level: 1,
    enemiesRemaining: 0,
    isGameOver: false,
    highScore: 0,
    screenShake: null,
    diveTimer: config ? getWaveDiveIntervalSeconds(config, 1) : 2.2,
    activeDivesCount: 0,
    waveTransitionRemaining: 0,
  } as GalaxianStateComponent);
  return entity;
}

export function createFormationController(world: World<GalaxianComponentRegistry>): Entity {
  const config = world.getResource<GalaxianConfig>("GameConfig");
  const startX = config?.formation.startX ?? 240;
  const startY = config?.formation.startY ?? 100;

  const entity = world.createEntity();
  world.addComponent(entity, {
    type: "Formation",
    originX: startX,
    originY: startY,
    currentOscillationX: 0,
    elapsed: 0,
    direction: 1,
    totalEnemies: 0,
    slots: {},
  } as FormationComponent);
  return entity;
}

export function spawnEnemyWave(world: World<GalaxianComponentRegistry>): boolean {
  const config = world.getResource<GalaxianConfig>("GameConfig");
  if (!config || config.formation.grid.length === 0) return false;
  if (world.query("GalaxianEnemy").length > 0) return false;

  const formationEntities = world.query("Formation");
  if (formationEntities.length === 0) return false;
  const formationEntity = formationEntities[0];
  const formation = world.getMutableComponent(formationEntity, "Formation");
  if (!formation) return false;

  const stateEntities = world.query("GameState");
  if (stateEntities.length === 0) return false;
  const state = world.getMutableComponent(stateEntities[0], "GameState");
  if (!state) return false;

  const grid = config.formation.grid;
  if (!grid.some((rowConfig) => rowConfig.count > 0)) return false;

  const layoutIndex = (Math.max(1, Math.floor(state.level)) - 1) % config.formation.layoutVariants.length;
  const layoutVariant = config.formation.layoutVariants[layoutIndex] ?? "classic";

  formation.slots = {};
  let totalEnemiesCount = 0;

  const slotSpacingX = config.formation.slotSpacingX;
  const slotSpacingY = config.formation.slotSpacingY;

  grid.forEach((rowConfig, rowIndex) => {
    const row = rowConfig.row;
    const count = rowConfig.count;
    const startXOffset = -((count - 1) * slotSpacingX) / 2;
    const rowOffsetX =
      layoutVariant === "staggered"
        ? (rowIndex % 2 === 1 ? slotSpacingX / 2 : 0)
        : layoutVariant === "chevron"
          ? (rowIndex - (grid.length - 1) / 2) * slotSpacingX * 0.25
          : 0;

    for (let col = 0; col < count; col++) {
      const slotId = `${row}_${col}`;
      const relX = startXOffset + col * slotSpacingX + rowOffsetX;
      const relY = row * slotSpacingY;
      const absX = formation.originX + relX;
      const absY = formation.originY + relY;

      const enemyEntity = EnemyFactory.createEnemy(
        world,
        rowConfig.type as EnemyType,
        absX,
        absY,
        row,
        col,
        slotId,
        rowConfig.pointsFormation,
        rowConfig.pointsDive,
        rowConfig.bonusEscorted
      );

      formation.slots[slotId] = {
        x: relX,
        y: relY,
        entity: enemyEntity,
      };

      totalEnemiesCount++;
    }
  });

  if (totalEnemiesCount === 0) return false;

  formation.totalEnemies = totalEnemiesCount;
  state.enemiesRemaining = totalEnemiesCount;
  state.activeDivesCount = 0;
  state.diveTimer = getWaveDiveIntervalSeconds(config, state.level);

  return true;
}
