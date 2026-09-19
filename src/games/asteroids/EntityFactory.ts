import {
  World,
  getForwardVector,
  ShapeType,
  BlueprintRegistry,
  CircleShape,
  Theme,
  resolveThemeColor,
  EntityBuilder,
  HealthComponent,
  BoundaryComponent,
  SpriteComponent,
  createDeferredEntity,
  spawnBlueprintEntity
} from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "./types/AsteroidRegistry";
import { AsteroidConfig } from "./types/AsteroidConfigSchema";
import { DamageComponent, FactionComponent } from "@tiny-aster/gameplay-kit";
import { attachEnemyDefaults } from "../shared/enemyHelpers";
import { PowerUpComponent } from "@tiny-aster/gameplay-kit";
import { BulletPool, AsteroidPool } from "./EntityPool";
import { colors } from "../../theme/colors";

/**
 * @param lootType - Loot/power-up identifier (e.g. "shield", "speed_boost").
 * @param world - Optional World instance to resolve theme tokens.
 * @returns The hex color used to tint the power-up's visual bubble.
 */
function getPowerUpColor(lootType: string, world?: World<any, any, any>): string {
  if (world) {
    const resolved = resolveThemeColor(world, `powerup-${lootType}`);
    if (resolved) return resolved;
  }
  if (lootType === "shield") return colors.cyan;
  if (lootType === "speed_boost") return colors.orange;
  return colors.gold;
}

/**
 * Registers ship, bullet, asteroid, and powerup blueprints.
 * Keeping them in a single place allows unifying test world runs with game runs.
 *
 * @remarks
 * The "ship" blueprint's initial Combo values are conditioned on the
 * "HasComboHeadStart" resource — used by story/tutorial modes to start
 * players with a pre-built combo. If that resource is absent, combo starts at 0.
 * @public
 */
export function registerAsteroidsBlueprints(
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry, any>,
  customRegistry?: BlueprintRegistry<AsteroidsComponentRegistry, AsteroidsEventRegistry, any>
): void {
  const registry = customRegistry || world.getResource<BlueprintRegistry<AsteroidsComponentRegistry, AsteroidsEventRegistry, any>>("BlueprintRegistry") || new BlueprintRegistry<AsteroidsComponentRegistry, AsteroidsEventRegistry, any>();

  registry.register("ship", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number }) => {
      const screen = w.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
      const gameConfig = w.getResource<any>("GameConfig");
      const theme = w.getResource<Theme>("Theme");
      const useSprites = gameConfig?.USE_SPRITES !== false;

      const assetKey = theme?.spriteMap["player-ship"] ?? theme?.spriteMap["player"] ?? "ship_sprite";
      const tint = resolveThemeColor(w, "ship", "player-ship", "player");

      EntityBuilder.fromEntity(w, entity)
        .withTransform({
          x: args.x,
          y: args.y,
          dirty: true
        })
        .withVelocity()
        .withRender({
          shape: useSprites ? "sprite" : "player_ship",
          size: 15,
          color: tint,
          order: 1
        })
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 15 } as CircleShape,
          layer: CollisionLayers.PLAYER,
          mask: CollisionLayers.ENEMY
        })
        .withCollisionEvents();

      if (useSprites) {
        w.addComponent(entity, {
          type: "Sprite",
          assetKey,
          anchor: { x: 0.5, y: 0.5 }
        } as SpriteComponent);
      }

      w.addComponent(entity, {
        type: "Health",
        current: 3,
        max: 3
      } as HealthComponent);
      w.addComponent(entity, {
        type: "Boundary",
        width: screen.width,
        height: screen.height,
        mode: "wrap"
      } as BoundaryComponent);
      w.addComponent(entity, {
        type: "Ship",
        sessionId: "",
        shootCooldownRemaining: 0
      } as AsteroidsComponentRegistry["Ship"]);

      const hasComboHeadStart = w.getResource("HasComboHeadStart") === true;
      const initialCombo = hasComboHeadStart ? 5 : 0;
      const initialMultiplier = hasComboHeadStart ? 2 : 1;
      const initialTimerRemaining = hasComboHeadStart ? (gameConfig?.COMBO_TIMEOUT ?? 2000) / 1000 : 0;

      w.addComponent(entity, {
        type: "Combo",
        combo: initialCombo,
        multiplier: initialMultiplier,
        timerRemaining: initialTimerRemaining,
        timerDuration: (gameConfig?.COMBO_TIMEOUT ?? 2000) / 1000
      } as AsteroidsComponentRegistry["Combo"]);
    }
  });

  registry.register("bullet", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number; vx: number; vy: number; rotation?: number; ownerId?: string; ttl?: number }) => {
      const tint = resolveThemeColor(w, "bullet", "player-bullet");
      const gameConfig = w.getResource<any>("GameConfig");

      EntityBuilder.fromEntity(w, entity)
        .withTransform({
          x: args.x,
          y: args.y,
          rotation: args.rotation ?? 0,
          dirty: true
        })
        .withVelocity({
          vx: args.vx,
          vy: args.vy
        })
        .withRender({
          shape: "bullet",
          size: 2,
          color: tint,
          order: 2,
          rotation: args.rotation ?? 0
        })
        .withTTL(args.ttl ?? 2.0)
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 2 } as CircleShape,
          layer: CollisionLayers.PROJECTILE,
          mask: CollisionLayers.ENEMY
        })
        .withCollisionEvents();

      w.addComponent(entity, {
        type: "Bullet",
        ownerId: args.ownerId
      } as AsteroidsComponentRegistry["Bullet"]);
      w.addComponent(entity, {
        type: "Damage",
        amount: 1,
        category: "player_bullet",
        friendlyFire: false,
        consumption: "destroy-entity"
      } as DamageComponent);
      w.addComponent(entity, {
        type: "Faction",
        faction: "player",
        value: "player"
      } as FactionComponent);

      if (gameConfig?.BULLET_BOUNDARY_BEHAVIOR === "bounce") {
        const screen = w.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
        w.addComponent(entity, {
          type: "Boundary",
          width: screen.width,
          height: screen.height,
          mode: "bounce"
        } as BoundaryComponent);
      }
    }
  });

  registry.register("asteroid", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number; size: string; vx?: number; vy?: number; angularVelocity?: number }) => {
      const screen = w.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
      const randVx = (w.gameplayRandom.next() - 0.5) * 100;
      const randVy = (w.gameplayRandom.next() - 0.5) * 100;
      const randAng = (w.gameplayRandom.next() - 0.5) * 2;

      // Radius by size tier — also drives collision shape and render size.
      // large=40, medium=20, small=10 (halved on each fragmentation step; see fragmentAsteroid).
      let radius = 40;
      if (args.size === "medium") radius = 20;
      else if (args.size === "small") radius = 10;

      const logicalRole = args.size === "large" ? "asteroid-large" : args.size === "medium" ? "asteroid-medium" : "asteroid-small";
      const tint = resolveThemeColor(w, logicalRole, "asteroid", "enemy");

      EntityBuilder.fromEntity(w, entity)
        .withTransform({
          x: args.x,
          y: args.y,
          dirty: true
        })
        .withVelocity({
          vx: args.vx !== undefined ? args.vx : randVx,
          vy: args.vy !== undefined ? args.vy : randVy,
          angularVelocity: args.angularVelocity !== undefined ? args.angularVelocity : randAng
        })
        .withRender({
          shape: "asteroid",
          size: radius * 2,
          color: tint
        })
        .withCollider({
          shape: { type: ShapeType.Circle, radius } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE
        })
        .withCollisionEvents();

      w.addComponent(entity, {
        type: "Asteroid",
        size: args.size
      } as AsteroidsComponentRegistry["Asteroid"]);
      w.addComponent(entity, {
        type: "Boundary",
        width: screen.width,
        height: screen.height,
        mode: "wrap"
      } as BoundaryComponent);
      attachEnemyDefaults(w, entity, {
        currentHp: 1,
        maxHp: 1,
        faction: "enemy",
        tableId: "default"
      });
      // AST-004 & AST-005: Decouple story Collectible from deathmatch asteroids
      const gameState = w.getSingleton("GameState");
      const isStory = gameState?.mode === "story" || w.getResource("StoryRuntime") !== undefined;
      if (isStory) {
        w.addComponent(entity, {
          type: "Collectible",
          kind: "story_fragment",
          value: 1,
          persistent: true,
          collectOnce: true,
          id: `asteroid_fragment_${args.size}_${args.x}_${args.y}`
        } as any);
      }
    }
  });

  registry.register("powerup", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number; lootType: string }) => {
      EntityBuilder.fromEntity(w, entity)
        .withTransform({
          x: args.x,
          y: args.y,
          dirty: true
        })
        .withRender({
          shape: "shield_bubble",
          size: 15,
          color: getPowerUpColor(args.lootType, w),
          order: 5,
          angularVelocity: 1.0
        })
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 15 } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER,
          isTrigger: true
        })
        .withCollisionEvents()
        .withTTL(10.0);

      w.addComponent(entity, {
        type: "PowerUp",
        powerUpType: args.lootType
      } as PowerUpComponent);
    }
  });

  registry.register("ufo", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number; size?: "large" | "small"; vx?: number; vy?: number }) => {
      const screen = w.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
      const tint = resolveThemeColor(w, "ufo", "enemy") || "#ff0055";
      const ufoSize = args.size ?? "large";
      const radius = ufoSize === "large" ? 18 : 10;
      const speed = ufoSize === "large" ? 100 : 160;

      EntityBuilder.fromEntity(w, entity)
        .withTransform({
          x: args.x,
          y: args.y,
          dirty: true
        })
        .withVelocity({
          vx: args.vx ?? (w.gameplayRandom.next() > 0.5 ? speed : -speed),
          vy: args.vy ?? (w.gameplayRandom.next() - 0.5) * (speed * 0.5)
        })
        .withRender({
          shape: "ufo",
          size: radius * 2,
          color: tint,
          order: 3
        })
        .withCollider({
          shape: { type: ShapeType.Circle, radius } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE
        })
        .withCollisionEvents();

      w.addComponent(entity, {
        type: "Ufo",
        size: ufoSize
      } as AsteroidsComponentRegistry["Ufo"]);

      w.addComponent(entity, {
        type: "Boundary",
        width: screen.width,
        height: screen.height,
        mode: "wrap"
      } as BoundaryComponent);

      attachEnemyDefaults(w, entity, {
        currentHp: ufoSize === "large" ? 2 : 1,
        maxHp: ufoSize === "large" ? 2 : 1,
        faction: "enemy",
        tableId: "ufo"
      });

      const eventBus = w.getEventBus();
      if (eventBus) {
        eventBus.emitDeferred("ufo:spawned", { entity });
      }
    }
  });

  world.setResource("BlueprintRegistry", registry);
}

/**
 * @public
 * @remarks Thin wrapper around the "powerup" blueprint. Prefer calling this over
 * `spawnBlueprintEntity(world, "powerup", ...)` directly so call sites stay
 * typed against the blueprint's real argument shape.
 */
export const createPowerUp = (config: {
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  x: number;
  y: number;
  lootType: string;
}): number => {
  return spawnBlueprintEntity(config.world, "powerup", {
    x: config.x,
    y: config.y,
    lootType: config.lootType
  });
};

/**
 * @public
 * @remarks Thin wrapper around the "ship" blueprint — see registerAsteroidsBlueprints
 * for the actual component setup (Health, Boundary, Combo, etc.).
 */
export const createShip = (config: { world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, x: number, y: number }): number => {
    return spawnBlueprintEntity(config.world, "ship", { x: config.x, y: config.y });
};

/**
 * Factory function to create and initialize a Bullet entity in the Asteroids game.
 * Sets up components: Transform, Velocity, Render, Bullet (with ownerId), TTL, Collider, CollisionEvents.
 *
 * @remarks
 * If a "BulletPool" resource is registered, bullets are acquired from the pool
 * instead of spawned fresh — this is transparent to callers.
 *
 * Note: Forward vectors and rotation conventions follow `ForwardVector.ts`.
 * @public
 */
export function createBullet(config: {
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  rotation?: number;
  speed?: number;
  ownerId?: string;
  ttl?: number;
}): number {
  const world = config.world;
  const posX = config.x;
  const posY = config.y;
  const owner = config.ownerId;

  let vxVal: number;
  let vyVal: number;
  let rotVal: number;

  if (config.vx !== undefined && config.vy !== undefined) {
    vxVal = config.vx;
    vyVal = config.vy;
    rotVal = config.rotation ?? Math.atan2(vyVal, vxVal);
  } else {
    rotVal = config.rotation ?? 0;
    const spd = config.speed ?? 0;
    const forward = getForwardVector(rotVal);
    vxVal = forward.x * spd;
    vyVal = forward.y * spd;
  }

  const gameConfig = world.getResource<AsteroidConfig>("GameConfig");
  const bulletTtl = gameConfig?.BULLET_TTL ?? 2.0;
  const life = config.ttl ?? bulletTtl;

  const bulletParams = {
    x: posX,
    y: posY,
    dx: vxVal,
    dy: vyVal,
    vx: vxVal,
    vy: vyVal,
    size: 2,
    color: "",
    rotation: rotVal,
    ownerId: owner,
    ttl: life
  };

  const pool = world.getResource<BulletPool>("BulletPool");
  if (pool) {
    return pool.acquire(world, bulletParams);
  }

  return spawnBlueprintEntity(world, "bullet", bulletParams);
}

/**
 * Factory function to spawn a UFO entity.
 * Emits "ufo:spawned" on eventBus upon spawn.
 * @public
 */
export const createUfo = (config: {
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  x: number;
  y: number;
  size?: "large" | "small";
  vx?: number;
  vy?: number;
}): number => {
  return spawnBlueprintEntity(config.world, "ufo", {
    x: config.x,
    y: config.y,
    size: config.size,
    vx: config.vx,
    vy: config.vy
  });
};

/** @public
 * @remarks Thin wrapper around the "asteroid" blueprint.
 */
export const createAsteroid = (config: {
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
    x: number;
    y: number;
    size: string;
    vx?: number;
    vy?: number;
    angularVelocity?: number;
}): number => {
    const pool = config.world.getResource<AsteroidPool>("AsteroidPool");
    if (pool) {
      return pool.acquireAsteroid(config.world, config);
    }
    return spawnBlueprintEntity(config.world, "asteroid", {
        x: config.x,
        y: config.y,
        size: config.size,
        vx: config.vx,
        vy: config.vy,
        angularVelocity: config.angularVelocity
    });
};

/**
 * Splits a destroyed asteroid into two smaller asteroids.
 *
 * @remarks
 * The two child asteroids are projected in exactly opposite directions (180 degrees apart)
 * relative to each other, using a deterministic angle calculated via world.gameplayRandom.
 *
 * @public
 */
export const fragmentAsteroid = (world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, parentAsteroid: number): void => {
    const asteroid = world.getComponent(parentAsteroid, "Asteroid");
    const transform = world.getComponent(parentAsteroid, "Transform");
    const velocity = world.getComponent(parentAsteroid, "Velocity");
    if (!asteroid || !transform) return;

    let nextSize: string | null = null;
    if (asteroid.size === "large") nextSize = "medium";
    else if (asteroid.size === "medium") nextSize = "small";

    if (nextSize) {
        const config = world.getResource<AsteroidConfig>("GameConfig");
        const maxAsteroids = config?.MAX_ASTEROIDS ?? 50;
        const currentAsteroidsCount = world.query("Asteroid").length;
        if (currentAsteroidsCount >= maxAsteroids) {
            return;
        }

        // Create 2 children in opposite directions (+Math.PI angle offset)
        // Use gameplayRandom for determinism
        const rand = world.gameplayRandom;
        const angle1 = rand.next() * Math.PI * 2;
        const angle2 = angle1 + Math.PI; // opposite directions

        const speed = config?.FRAGMENT_IMPULSE_SPEED ?? 80;

        for (const angle of [angle1, angle2]) {
            const vx = (velocity ? velocity.vx : 0) + Math.cos(angle) * speed;
            const vy = (velocity ? velocity.vy : 0) + Math.sin(angle) * speed;

            createAsteroid({
                world,
                x: transform.x,
                y: transform.y,
                size: nextSize,
                vx,
                vy
            });
        }
    }
};

/**
 * Spawns a wave of `large` asteroids scaled by level.
 * @remarks Count = INITIAL_ASTEROID_COUNT + (level - 1); each spawn point is
 * rejection-sampled to stay at least 150px from screen center (where the ship
 * starts), using `world.gameplayRandom` for determinism.
 * @public
 */
export const spawnAsteroidWave = (world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, level: number): void => {
    const config = world.getResource<AsteroidConfig>("GameConfig") || {
        worldWidth: 800,
        worldHeight: 600,
        INITIAL_ASTEROID_COUNT: 5
    };
    const count = (config.INITIAL_ASTEROID_COUNT ?? 5) + (level - 1);
    const screen = world.getResource<{ width: number, height: number }>("ScreenConfig") || {
        width: config.worldWidth ?? 800,
        height: config.worldHeight ?? 600
    };

    const rand = world.gameplayRandom;
    const MAX_SPAWN_ATTEMPTS = 20;

    for (let i = 0; i < count; i++) {
        let x = rand.next() * screen.width;
        let y = rand.next() * screen.height;

        const centerX = screen.width / 2;
        const centerY = screen.height / 2;
        let attempts = 0;
        while (Math.hypot(x - centerX, y - centerY) < 150 && attempts < MAX_SPAWN_ATTEMPTS) {
            x = rand.next() * screen.width;
            y = rand.next() * screen.height;
            attempts++;
        }

        createAsteroid({
            world,
            x,
            y,
            size: "large"
        });
    }
};
