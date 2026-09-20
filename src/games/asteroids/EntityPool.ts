import {
  World,
  Entity,
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  Collider2DComponent,
  CircleShape,
  ShapeType,
  ReclaimableComponent,
  BoundaryComponent,
  HealthComponent,
  CollisionEventsComponent,
  resolveThemeColor,
  ProjectilePool,
  ProjectileParams,
  PrefabPool,
  PrefabConfig,
  Component
} from "@tiny-aster/core";
import { CollisionLayers, createProjectilePoolConfig, SharedParticlePool, FactionComponent, LootTableComponent } from "@tiny-aster/gameplay-kit";
import { AsteroidsComponentRegistry } from "./types/AsteroidRegistry";

/**
 * Parameters for acquiring an Asteroids bullet from the pool.
 * Extends ProjectileParams to remain fully compatible with ProjectilePool.
 * @public
 */
export interface AsteroidsBulletParams extends ProjectileParams {
  vx: number;
  vy: number;
  rotation?: number;
  ownerId?: string;
}

function createAsteroidsBulletPoolConfig() {
  const base = createProjectilePoolConfig<AsteroidsBulletParams>({
    shape: "bullet",
    layer: CollisionLayers.PROJECTILE,
    mask: CollisionLayers.ENEMY,
    poolId: "BulletPool",
    damageCategory: "player_bullet",
    faction: "player",
    order: 2,
    extraComponents: (data: any, p: AsteroidsBulletParams, world: World, entity: Entity) => {
      const tint = resolveThemeColor(world, "bullet", "player-bullet");
      const gameConfig = world.getResource<any>("GameConfig");

      data.position.rotation = p.rotation ?? 0;
      data.render.color = p.color || tint;
      data.render.rotation = p.rotation ?? 0;
      data.bullet.ownerId = p.ownerId;

      const ttlVal = p.ttl ?? gameConfig?.BULLET_TTL ?? 2.0;
      data.ttl.remaining = ttlVal;
      data.ttl.timeLeft = ttlVal;

      if (gameConfig?.BULLET_BOUNDARY_BEHAVIOR === "bounce") {
        const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
        world.addComponent(entity, {
          type: "Boundary",
          width: screen.width,
          height: screen.height,
          mode: "bounce"
        } as BoundaryComponent);
      }
    }
  });

  const baseFactory = base.factory;
  const baseReset = base.reset;

  return {
    ...base,
    factory: () => {
      const obj = baseFactory() as any;
      obj.bullet = { type: "Bullet", ownerId: undefined };
      (obj.collider.shape as CircleShape).radius = 2;
      obj.render.size = 2;
      return obj;
    },
    reset: (data: any) => {
      baseReset(data);
      if (data.bullet) {
        data.bullet.ownerId = undefined;
      }
    }
  };
}

/**
 * Standardized Bullet Pool for Asteroids.
 * Extends ProjectilePool from @tiny-aster/core.
 * @public
 */
export class BulletPool extends ProjectilePool<any, AsteroidsBulletParams> {
  constructor() {
    super(createAsteroidsBulletPoolConfig());
  }

  public acquireBullet(world: World, params: AsteroidsBulletParams): Entity {
    return this.acquire(world, params);
  }
}

/**
 * Standardized, zero-allocation Particle Pool for Asteroids.
 * Extends SharedParticlePool for cross-game consistency.
 * @public
 */
export class ParticlePool extends SharedParticlePool {
  constructor() {
    super({
      poolId: "ParticlePool",
      shape: "particle",
      order: 10,
      isTrigger: true
    });
  }
}

/**
 * Component set required for pooled Asteroid entities.
 * @public
 */
export interface AsteroidComponents extends Record<string, Component> {
  position: TransformComponent;
  velocity: VelocityComponent;
  render: RenderComponent;
  collider: Collider2DComponent;
  collisionEvents: CollisionEventsComponent;
  asteroid: AsteroidsComponentRegistry["Asteroid"];
  boundary: BoundaryComponent;
  health: HealthComponent;
  faction: FactionComponent;
  lootTable: LootTableComponent;
  reclaimable: ReclaimableComponent;
}

/**
 * Parameters for acquiring an Asteroid from the pool.
 * @public
 */
export interface AsteroidParams {
  x: number;
  y: number;
  size: string;
  vx?: number;
  vy?: number;
  angularVelocity?: number;
}

function createAsteroidsPoolConfig(): PrefabConfig<AsteroidComponents, AsteroidParams> {
  return {
    factory: () => {
      return {
        position: { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: true },
        velocity: { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 },
        render: { type: "Render", shape: "asteroid", size: 80, color: "", visible: true, opacity: 1, order: 0, rotation: 0, angularVelocity: 0, hitFlashFrames: 0 },
        collider: {
          type: "Collider2D",
          shape: { type: "circle", radius: 40 },
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        },
        collisionEvents: {
          type: "CollisionEvents",
          collisions: [],
          activeTriggers: [],
          triggersEntered: [],
          triggersExited: []
        },
        asteroid: { type: "Asteroid", size: "large" },
        boundary: { type: "Boundary", width: 800, height: 600, mode: "wrap" },
        health: { type: "Health", current: 1, max: 1 },
        faction: { type: "Faction", faction: "enemy", value: "enemy" },
        lootTable: { type: "LootTable", tableId: "default" },
        reclaimable: { type: "Reclaimable", poolId: "AsteroidPool", poolName: "AsteroidPool" }
      };
    },
    reset: (data: AsteroidComponents) => {
      data.position.x = 0;
      data.position.y = 0;
      data.position.rotation = 0;
      data.position.dirty = true;
      data.velocity.vx = 0;
      data.velocity.vy = 0;
      data.velocity.angularVelocity = 0;
      data.render.color = "";
      data.health.current = 1;
      data.health.max = 1;
      if (data.collisionEvents) {
        data.collisionEvents.collisions.length = 0;
        data.collisionEvents.activeTriggers.length = 0;
        data.collisionEvents.triggersEntered.length = 0;
        data.collisionEvents.triggersExited.length = 0;
      }
    },
    initializer: (data: AsteroidComponents, p: AsteroidParams, world: World, entity: Entity) => {
      const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
      const randVx = (world.gameplayRandom.next() - 0.5) * 100;
      const randVy = (world.gameplayRandom.next() - 0.5) * 100;
      const randAng = (world.gameplayRandom.next() - 0.5) * 2;

      let radius = 40;
      if (p.size === "medium") radius = 20;
      else if (p.size === "small") radius = 10;

      const logicalRole = p.size === "large" ? "asteroid-large" : p.size === "medium" ? "asteroid-medium" : "asteroid-small";
      const tint = resolveThemeColor(world, logicalRole, "asteroid", "enemy") || "";

      data.position.x = p.x;
      data.position.y = p.y;
      data.velocity.vx = p.vx !== undefined ? p.vx : randVx;
      data.velocity.vy = p.vy !== undefined ? p.vy : randVy;
      data.velocity.angularVelocity = p.angularVelocity !== undefined ? p.angularVelocity : randAng;

      data.render.size = radius * 2;
      data.render.color = tint;

      const shape = data.collider.shape;
      if (shape && shape.type === "circle") {
        shape.radius = radius;
      } else {
        data.collider.shape = { type: "circle", radius };
      }
      data.asteroid.size = p.size;

      data.boundary.width = screen.width;
      data.boundary.height = screen.height;

      data.health.current = 1;
      data.health.max = 1;

      const gameState = world.getSingleton("GameState") as import("./types/AsteroidTypes").GameStateComponent | undefined;
      const isStory = gameState?.mode === "story" || world.getResource("StoryRuntime") !== undefined;
      if (isStory) {
        const collectibleComp = {
          type: "Collectible",
          kind: "story_fragment",
          value: 1,
          persistent: true,
          collectOnce: true,
          id: `asteroid_fragment_${p.size}_${p.x}_${p.y}`
        };
        if (world.isUpdating) {
          world.getCommandBuffer().addComponent(entity, collectibleComp as Component);
        } else {
          world.addComponent(entity, collectibleComp as Component);
        }
      } else if (world.hasComponent(entity, "Collectible")) {
        if (world.isUpdating) {
          world.getCommandBuffer().removeComponent(entity, "Collectible");
        } else {
          world.removeComponent(entity, "Collectible");
        }
      }
    }
  };
}

/**
 * Standardized Asteroid Pool for Asteroids.
 * Extends PrefabPool from @tiny-aster/core.
 * @public
 */
export class AsteroidPool extends PrefabPool<AsteroidComponents, AsteroidParams> {
  constructor() {
    super(createAsteroidsPoolConfig());
  }

  public acquireAsteroid(world: World, params: AsteroidParams): Entity {
    return this.acquire(world, params);
  }
}
