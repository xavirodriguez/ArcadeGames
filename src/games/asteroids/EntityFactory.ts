import {
  World,
  getForwardVector,
  ShapeType,
  BlueprintRegistry,
  CircleShape,
  Theme,
  resolveThemeColor,
  createEntityBuilder,
  spawnViaBlueprint
} from "@tiny-aster/core";
import { CollisionLayers } from "../shared/types/CollisionLayers";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "./types/AsteroidRegistry";
import { AsteroidConfig } from "./types/AsteroidConfigSchema";

function getPowerUpColor(lootType: string): string {
  if (lootType === "shield") return "#00f0ff";
  if (lootType === "speed_boost") return "#ff5d00";
  return "#ffd700";
}

/**
 * Registers ship, bullet, and asteroid blueprints.
 * Keeping them in a single place allows unifying test world runs with game runs.
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

      const hasComboHeadStart = w.getResource("HasComboHeadStart") === true;
      const initialCombo = hasComboHeadStart ? 5 : 0;
      const initialMultiplier = hasComboHeadStart ? 2 : 1;
      const initialTimerRemaining = hasComboHeadStart ? (gameConfig?.COMBO_TIMEOUT ?? 2000) / 1000 : 0;

      const builder = createEntityBuilder(w, entity)
        .withTransform({ x: args.x, y: args.y })
        .withVelocity()
        .withRender({ shape: useSprites ? "sprite" : "player_ship", size: 15, color: tint, order: 1 })
        .withHealth(3, 3)
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 15 } as CircleShape,
          layer: CollisionLayers.PLAYER,
          mask: CollisionLayers.ENEMY
        })
        .withCollisionEvents()
        .withBoundary({ width: screen.width, height: screen.height, mode: "wrap" })
        .withFaction("player")
        .withComponent({
          type: "Ship",
          sessionId: "",
          shootCooldownRemaining: 0
        } as any)
        .withComponent({
          type: "Combo",
          combo: initialCombo,
          multiplier: initialMultiplier,
          timerRemaining: initialTimerRemaining,
          timerDuration: (gameConfig?.COMBO_TIMEOUT ?? 2000) / 1000
        } as any);

      if (useSprites) {
        builder.withSprite({ assetKey, anchor: { x: 0.5, y: 0.5 } });
      }
      builder.commit();
    }
  });

  registry.register("bullet", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number; vx: number; vy: number; rotation?: number; ownerId?: string; ttl?: number }) => {
      const tint = resolveThemeColor(w, "bullet", "player-bullet");
      const gameConfig = w.getResource<any>("GameConfig");

      const builder = createEntityBuilder(w, entity)
        .withTransform({ x: args.x, y: args.y, rotation: args.rotation ?? 0 })
        .withVelocity({ vx: args.vx, vy: args.vy })
        .withRender({ shape: "bullet", size: 2, color: tint, order: 2, rotation: args.rotation ?? 0 })
        .withTTL(args.ttl ?? 2.0)
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 2 } as CircleShape,
          layer: CollisionLayers.PROJECTILE,
          mask: CollisionLayers.ENEMY
        })
        .withCollisionEvents()
        .withFaction("player")
        .withComponent({ type: "Bullet", ownerId: args.ownerId } as any)
        .withComponent({
          type: "Damage",
          amount: 1,
          category: "player_bullet",
          friendlyFire: false,
          consumption: "destroy-entity"
        } as any);

      if (gameConfig?.BULLET_BOUNDARY_BEHAVIOR === "bounce") {
        const screen = w.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
        builder.withBoundary({ width: screen.width, height: screen.height, mode: "bounce" });
      }
      builder.commit();
    }
  });

  registry.register("asteroid", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number; size: string; vx?: number; vy?: number; angularVelocity?: number }) => {
      const screen = w.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };

      const randVx = (w.gameplayRandom.next() - 0.5) * 100;
      const randVy = (w.gameplayRandom.next() - 0.5) * 100;
      const randAng = (w.gameplayRandom.next() - 0.5) * 2;

      let radius = 40;
      if (args.size === "medium") radius = 20;
      else if (args.size === "small") radius = 10;

      const logicalRole = args.size === "large" ? "asteroid-large" : args.size === "medium" ? "asteroid-medium" : "asteroid-small";
      const tint = resolveThemeColor(w, logicalRole, "asteroid", "enemy");

      createEntityBuilder(w, entity)
        .withTransform({ x: args.x, y: args.y })
        .withVelocity({
          vx: args.vx !== undefined ? args.vx : randVx,
          vy: args.vy !== undefined ? args.vy : randVy,
          angularVelocity: args.angularVelocity !== undefined ? args.angularVelocity : randAng
        })
        .withRender({ shape: "asteroid", size: radius * 2, color: tint, order: 0 })
        .withCollider({
          shape: { type: ShapeType.Circle, radius } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE
        })
        .withCollisionEvents()
        .withBoundary({ width: screen.width, height: screen.height, mode: "wrap" })
        .withHealth(1, 1)
        .withFaction("enemy")
        .withComponent({ type: "Asteroid", size: args.size } as any)
        .withComponent({ type: "LootTable", tableId: "default" } as any)
        .withComponent({
          type: "Collectible",
          kind: "story_fragment",
          value: 1,
          persistent: true,
          collectOnce: true,
          id: `asteroid_fragment_${args.size}_${args.x}_${args.y}`
        } as any)
        .commit();
    }
  });

  registry.register("powerup", {
    spawn: (w: World<any, any, any>, entity: number, args: { x: number; y: number; lootType: string }) => {
      createEntityBuilder(w, entity)
        .withTransform({ x: args.x, y: args.y })
        .withRender({ shape: "shield_bubble", size: 15, color: getPowerUpColor(args.lootType), order: 5, angularVelocity: 1.0 })
        .withCollider({
          shape: { type: ShapeType.Circle, radius: 15 } as CircleShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER,
          isTrigger: true
        })
        .withCollisionEvents()
        .withPowerUp(args.lootType)
        .withTTL(10.0)
        .commit();
    }
  });

  world.setResource("BlueprintRegistry", registry);
}

function spawnEntity(world: World<any, any, any>, blueprintId: string, args: any): number {
  return spawnViaBlueprint(world, blueprintId, args);
}

/** @public */
export const createPowerUp = (config: {
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  x: number;
  y: number;
  lootType: string;
}): number => {
  return spawnEntity(config.world, "powerup", {
    x: config.x,
    y: config.y,
    lootType: config.lootType
  });
};

/** @public */
export const createShip = (config: { world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, x: number, y: number }): number => {
    return spawnEntity(config.world, "ship", { x: config.x, y: config.y });
};

/**
 * Factory function to create and initialize a Bullet entity in the Asteroids game.
 * Sets up components: Transform, Velocity, Render, Bullet (with ownerId), TTL (timeLeft & remaining), Collider, CollisionEvents.
 * Note: Forward vectors and rotation conventions follow `ForwardVector.ts`.
 * @public
 */
export function createBullet(
  worldOrConfig: World<AsteroidsComponentRegistry, AsteroidsEventRegistry> | {
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    rotation?: number;
    speed?: number;
    ownerId?: string;
    ttl?: number;
  },
  x?: number,
  y?: number,
  rotation?: number,
  speed?: number,
  ownerId?: string,
  ttl?: number
): number {
  let world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  let posX: number;
  let posY: number;
  let vxVal: number;
  let vyVal: number;
  let owner: string | undefined;
  let life: number;

  let rotVal = 0;

  if (worldOrConfig instanceof World) {
    world = worldOrConfig;
    posX = x!;
    posY = y!;
    const rot = rotation!;
    rotVal = rot;
    const spd = speed!;
    const forward = getForwardVector(rot);
    vxVal = forward.x * spd;
    vyVal = forward.y * spd;
    owner = ownerId;
    life = ttl ?? 2.0;
  } else {
    world = worldOrConfig.world;
    posX = worldOrConfig.x;
    posY = worldOrConfig.y;
    owner = worldOrConfig.ownerId;

    if (worldOrConfig.vx !== undefined && worldOrConfig.vy !== undefined) {
      vxVal = worldOrConfig.vx;
      vyVal = worldOrConfig.vy;
      rotVal = worldOrConfig.rotation ?? Math.atan2(vyVal, vxVal);
    } else {
      const rot = worldOrConfig.rotation ?? 0;
      rotVal = rot;
      const spd = worldOrConfig.speed ?? 0;
      const forward = getForwardVector(rot);
      vxVal = forward.x * spd;
      vyVal = forward.y * spd;
    }
    const gameConfig = world.getResource<AsteroidConfig>("GameConfig");
    const bulletTtl = gameConfig?.BULLET_TTL ?? 2.0;
    life = worldOrConfig.ttl ?? bulletTtl;
  }

  return spawnEntity(world, "bullet", {
    x: posX,
    y: posY,
    vx: vxVal,
    vy: vyVal,
    rotation: rotVal,
    ownerId: owner,
    ttl: life
  });
}

/** @public */
export const createAsteroid = (config: {
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
    x: number;
    y: number;
    size: string;
    vx?: number;
    vy?: number;
    angularVelocity?: number;
}): number => {
    return spawnEntity(config.world, "asteroid", {
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
        // Create 2 children in opposite directions (+Math.PI angle offset)
        // Use gameplayRandom for determinism
        const rand = world.gameplayRandom;
        const angle1 = rand.next() * Math.PI * 2;
        const angle2 = angle1 + Math.PI; // opposite directions

        const speed = 80; // speed of fragmentation impulse

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

/** @public */
export const spawnAsteroidWave = (world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, level: number): void => {
    const config = world.getResource<AsteroidConfig>("GameConfig") || {
        SCREEN_WIDTH: 800,
        SCREEN_HEIGHT: 600,
        INITIAL_ASTEROID_COUNT: 5
    };
    const count = (config.INITIAL_ASTEROID_COUNT ?? 5) + (level - 1);
    const screen = world.getResource<{ width: number, height: number }>("ScreenConfig") || {
        width: config.SCREEN_WIDTH ?? 800,
        height: config.SCREEN_HEIGHT ?? 600
    };

    const rand = world.gameplayRandom;

    for (let i = 0; i < count; i++) {
        // Spawn asteroids away from the center (to avoid spawning on top of the player at the beginning of a wave)
        let x = rand.next() * screen.width;
        let y = rand.next() * screen.height;

        // Ensure it's at least 150px away from the center (where the ship starts)
        const centerX = screen.width / 2;
        const centerY = screen.height / 2;
        while (Math.hypot(x - centerX, y - centerY) < 150) {
            x = rand.next() * screen.width;
            y = rand.next() * screen.height;
        }

        createAsteroid({
            world,
            x,
            y,
            size: "large"
        });
    }
};
