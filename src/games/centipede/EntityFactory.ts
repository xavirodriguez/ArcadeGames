import { World, ShapeType, CircleShape, BoxShape, TransformComponent, VelocityComponent, RenderComponent, ColliderComponent, Component } from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { CentipedeConfig, DEFAULT_CENTIPEDE_CONFIG } from "./types/CentipedeConfigSchema";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "./types/CentipedeTypes";
import { gridToWorldCenter, hashCellSeed } from "./utils/CentipedeHelpers";

type CentipedeWorld = World<CentipedeComponentRegistry, CentipedeEventRegistry>;

function spawnEntity(world: CentipedeWorld): number {
  if (world.isUpdating) {
    const id = world.reserveEntityId();
    world.commands.createEntity(id);
    return id;
  }
  return world.createEntity();
}

function attachComponent<T extends Component>(
  world: CentipedeWorld,
  entity: number,
  component: T
): void {
  if (world.isUpdating) {
    world.commands.addComponent(entity, component as Component);
  } else {
    world.addComponent(entity, component as Component);
  }
}

function createTransform(x: number, y: number): TransformComponent {
  return {
    type: "Transform",
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldX: x,
    worldY: y,
    worldRotation: 0,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: true,
  };
}

function attachPhysicsAndRender(
  world: CentipedeWorld,
  entity: number,
  transform: TransformComponent,
  render: RenderComponent,
  collider: ColliderComponent,
  velocity?: VelocityComponent
): void {
  attachComponent(world, entity, transform);
  if (velocity) {
    attachComponent(world, entity, velocity);
  }
  attachComponent(world, entity, render);
  attachComponent(world, entity, collider);
  attachComponent(world, entity, {
    type: "CollisionEvents",
    collisions: [],
    activeTriggers: [],
    triggersEntered: [],
    triggersExited: [],
  });
}

export class CentipedeEntityFactory {
  public static createPlayer(world: CentipedeWorld): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const playerRow = config.GRID_ROWS - 2;
    const playerCol = Math.floor(config.GRID_COLS / 2);
    const pos = gridToWorldCenter(config, playerRow, playerCol);

    const entity = spawnEntity(world);
    const transform = createTransform(pos.x, pos.y);
    const velocity: VelocityComponent = {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    };

    const render: RenderComponent = {
      type: "Render",
      shape: "shooter",
      size: config.CELL_SIZE,
      color: "player",
      order: 10,
      visible: true,
      opacity: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    };

    const collider: ColliderComponent = {
      type: "Collider",
      shape: { type: ShapeType.Box, width: config.CELL_SIZE * 0.8, height: config.CELL_SIZE * 0.8 } as BoxShape,
      layer: CollisionLayers.PLAYER,
      mask: CollisionLayers.ENEMY,
      enabled: true,
      isTrigger: false,
    };

    attachPhysicsAndRender(world, entity, transform, render, collider, velocity);

    attachComponent(world, entity, {
      type: "Shooter",
      fireCooldownMs: 0,
    });
    attachComponent(world, entity, {
      type: "GridPos",
      row: playerRow,
      col: playerCol,
    });
    attachComponent(world, entity, { type: "Tag", tags: ["Player", "Shooter"] });
  }

  public static createDart(world: CentipedeWorld, x: number, y: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const entity = spawnEntity(world);
    const transform = createTransform(x, y);

    const velocity: VelocityComponent = {
      type: "Velocity",
      vx: 0,
      vy: -config.DART_SPEED,
      angularVelocity: 0,
    };

    const render: RenderComponent = {
      type: "Render",
      shape: "dart",
      size: config.CELL_SIZE * 0.3,
      color: "playerAccent",
      order: 12,
      visible: true,
      opacity: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    };

    const collider: ColliderComponent = {
      type: "Collider",
      shape: { type: ShapeType.Box, width: 3, height: 8 } as BoxShape,
      layer: CollisionLayers.PROJECTILE,
      mask: CollisionLayers.ENEMY,
      enabled: true,
      isTrigger: false,
    };

    attachPhysicsAndRender(world, entity, transform, render, collider, velocity);

    attachComponent(world, entity, { type: "Dart" });
    attachComponent(world, entity, { type: "Tag", tags: ["Dart"] });
  }

  public static createMushroom(world: CentipedeWorld, row: number, col: number, isPoisoned = false, hp = 4, growProgress = 0.0): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const pos = gridToWorldCenter(config, row, col);

    const seed = world.getResource<number>("RandomSeed") ?? 12345;
    const cellHash = hashCellSeed(row, col, seed);

    const entity = spawnEntity(world);
    const transform = createTransform(pos.x, pos.y);

    const render: RenderComponent = {
      type: "Render",
      shape: "mushroom",
      size: config.CELL_SIZE,
      color: isPoisoned ? "toxin" : "mushroomA",
      order: 2,
      visible: true,
      opacity: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    };

    const collider: ColliderComponent = {
      type: "Collider",
      shape: { type: ShapeType.Box, width: config.CELL_SIZE, height: config.CELL_SIZE } as BoxShape,
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PROJECTILE | CollisionLayers.PLAYER,
      enabled: true,
      isTrigger: false,
    };

    attachPhysicsAndRender(world, entity, transform, render, collider);

    attachComponent(world, entity, {
      type: "Mushroom",
      hp,
      maxHp: config.MUSHROOM_HP,
      isPoisoned,
      row,
      col,
      hashSeed: cellHash,
    });
    attachComponent(world, entity, {
      type: "MushroomVisual",
      growProgress,
      flashTimerMs: 0,
    });
    attachComponent(world, entity, {
      type: "GridPos",
      row,
      col,
    });
    attachComponent(world, entity, { type: "Tag", tags: ["Mushroom"] });
  }

  public static createCentipedeSegment(
    world: CentipedeWorld,
    chainId: string,
    segmentIndex: number,
    totalInChain: number,
    isHead: boolean,
    row: number,
    col: number,
    dirX: 1 | -1 = 1,
    dirY: 1 | -1 = 1
  ) {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const pos = gridToWorldCenter(config, row, col);

    const entity = spawnEntity(world);
    const transform = createTransform(pos.x, pos.y);

    const velocity: VelocityComponent = {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    };

    const render: RenderComponent = {
      type: "Render",
      shape: isHead ? "centipede_head" : "centipede_body",
      size: config.CELL_SIZE,
      color: isHead ? "centipedeHead" : "centipedeBody",
      order: 5,
      visible: true,
      opacity: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    };

    const collider: ColliderComponent = {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: config.CELL_SIZE * 0.45 } as CircleShape,
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PROJECTILE | CollisionLayers.PLAYER,
      enabled: true,
      isTrigger: false,
    };

    attachPhysicsAndRender(world, entity, transform, render, collider, velocity);

    attachComponent(world, entity, {
      type: "CentipedeSegment",
      chainId,
      segmentIndex,
      totalInChain,
      isHead,
      dirX,
      dirY,
      targetRow: row,
      targetCol: col,
      moveProgress: 1.0,
      isDiving: false,
    });
    attachComponent(world, entity, {
      type: "GridPos",
      row,
      col,
    });
    attachComponent(world, entity, {
      type: "SegmentVisual",
      visualX: pos.x,
      visualY: pos.y,
      vx: 0,
      vy: 0,
      popTimerMs: 0,
      angle: dirX >= 0 ? 0 : Math.PI,
    });
    attachComponent(world, entity, { type: "Tag", tags: ["CentipedeSegment", isHead ? "Head" : "Body"] });

    return entity;
  }

  public static createCentipedeChain(
    world: CentipedeWorld,
    chainId: string,
    length: number,
    startRow = 0,
    startCol = 0,
    dirX: 1 | -1 = 1
  ): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;

    for (let i = 0; i < length; i++) {
      let col = startCol - i * dirX;
      let row = startRow;
      if (col < 0) {
        col = -col;
        row = Math.min(config.GRID_ROWS - 1, row + 1);
      } else if (col >= config.GRID_COLS) {
        col = config.GRID_COLS - 1 - (col - config.GRID_COLS);
        row = Math.min(config.GRID_ROWS - 1, row + 1);
      }

      this.createCentipedeSegment(
        world,
        chainId,
        i,
        length,
        i === 0,
        row,
        col,
        dirX,
        1
      );
    }
  }

  public static createSpider(world: CentipedeWorld, x: number, y: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const entity = spawnEntity(world);
    const transform = createTransform(x, y);

    const velocity: VelocityComponent = {
      type: "Velocity",
      vx: config.SPIDER_SPEED * 0.707,
      vy: config.SPIDER_SPEED * 0.707,
      angularVelocity: 0,
    };

    const render: RenderComponent = {
      type: "Render",
      shape: "spider",
      size: config.CELL_SIZE * 1.2,
      color: "amber",
      order: 8,
      visible: true,
      opacity: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    };

    const collider: ColliderComponent = {
      type: "Collider",
      shape: { type: ShapeType.Box, width: config.CELL_SIZE, height: config.CELL_SIZE } as BoxShape,
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PROJECTILE | CollisionLayers.PLAYER,
      enabled: true,
      isTrigger: false,
    };

    attachPhysicsAndRender(world, entity, transform, render, collider, velocity);

    attachComponent(world, entity, {
      type: "Spider",
      dirX: 1,
      dirY: 1,
      changeTimer: 0,
    });
    attachComponent(world, entity, { type: "Tag", tags: ["Spider", "Enemy"] });
  }

  public static createFlea(world: CentipedeWorld, col: number): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const pos = gridToWorldCenter(config, 0, col);
    const entity = spawnEntity(world);
    const transform = createTransform(pos.x, 0);

    const velocity: VelocityComponent = {
      type: "Velocity",
      vx: 0,
      vy: config.FLEA_SPEED,
      angularVelocity: 0,
    };

    const render: RenderComponent = {
      type: "Render",
      shape: "flea",
      size: config.CELL_SIZE * 1.1,
      color: "amber",
      order: 7,
      visible: true,
      opacity: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    };

    const collider: ColliderComponent = {
      type: "Collider",
      shape: { type: ShapeType.Box, width: config.CELL_SIZE * 0.8, height: config.CELL_SIZE * 1.2 } as BoxShape,
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PROJECTILE | CollisionLayers.PLAYER,
      enabled: true,
      isTrigger: false,
    };

    attachPhysicsAndRender(world, entity, transform, render, collider, velocity);

    attachComponent(world, entity, {
      type: "Flea",
      hp: config.FLEA_HP,
      maxHp: config.FLEA_HP,
      lastMushroomRow: -1,
    });
    attachComponent(world, entity, {
      type: "GridPos",
      row: 0,
      col,
    });
    attachComponent(world, entity, { type: "Tag", tags: ["Flea", "Enemy"] });
  }

  public static createScorpion(world: CentipedeWorld, row: number, dirX: 1 | -1): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const startCol = dirX === 1 ? 0 : config.GRID_COLS - 1;
    const pos = gridToWorldCenter(config, row, startCol);

    const entity = spawnEntity(world);
    const transform = createTransform(pos.x, pos.y);

    const velocity: VelocityComponent = {
      type: "Velocity",
      vx: dirX * config.SCORPION_SPEED,
      vy: 0,
      angularVelocity: 0,
    };

    const render: RenderComponent = {
      type: "Render",
      shape: "scorpion",
      size: config.CELL_SIZE * 1.2,
      color: "toxin",
      order: 6,
      visible: true,
      opacity: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    };

    const collider: ColliderComponent = {
      type: "Collider",
      shape: { type: ShapeType.Box, width: config.CELL_SIZE * 1.2, height: config.CELL_SIZE * 0.8 } as BoxShape,
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PROJECTILE | CollisionLayers.PLAYER,
      enabled: true,
      isTrigger: false,
    };

    attachPhysicsAndRender(world, entity, transform, render, collider, velocity);

    attachComponent(world, entity, {
      type: "Scorpion",
      dirX,
    });
    attachComponent(world, entity, {
      type: "GridPos",
      row,
      col: startCol,
    });
    attachComponent(world, entity, { type: "Tag", tags: ["Scorpion", "Enemy"] });
  }

  public static createGameState(world: CentipedeWorld): void {
    const config = world.getResource<CentipedeConfig>("GameConfig") || DEFAULT_CENTIPEDE_CONFIG;
    const stateEntity = spawnEntity(world);

    attachComponent(world, stateEntity, {
      type: "CentipedeState",
      score: 0,
      lives: config.PLAYER_INITIAL_LIVES,
      level: 1,
      status: "playing",
      mushroomsRemaining: 0,
      respawnTimerMs: 0,
    });
  }
}
