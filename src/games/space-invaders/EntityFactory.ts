import { World } from "@tiny-aster/core";
import { Entity, Component } from "@tiny-aster/core";
import { SpaceInvadersConfig } from "./types/SpaceInvadersConfigSchema";
import { GAME_CONFIG, SpaceInvadersComponentRegistry } from "./types/SpaceInvadersTypes";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "./EntityPool";
import { createEmitter } from "@tiny-aster/core";
import { CollisionLayers } from "../shared/types/CollisionLayers";
import { Collider2DComponent, BoundaryComponent, TransformComponent, VelocityComponent, RenderComponent, HealthComponent } from "@tiny-aster/core";
import { LootTableComponent } from "../shared/arcade";
import {
  InputComponent,
  PlayerComponent,
  InvaderComponent,
  ShieldComponent,
  GameStateComponent,
  FormationComponent,
} from "./types/SpaceInvadersTypes";
import { EnemyFactory } from "./EnemyFactory";

/**
 * Entity factory for the Space Invaders game domain.
 *
 * Coordinates the creation of players, invaders, shields, and formation controllers.
 * Ensures proper collision layer and mask assignment for the classic shooter mechanics.
 *
 * @packageDocumentation
 */

/**
 * Helper to handle deferred or immediate entity creation and component attachment.
 */
const createBaseEntity = (world: World<any>, deferred?: boolean): { entity: Entity, add: (comp: any) => void } => {
    const isUpdating = world.isUpdating;
    const isDeferred = !!(deferred || isUpdating);
    const commands = world.getCommandBuffer();

    if (isDeferred) {
        const entity = world.reserveEntityId();
        commands.createEntity(entity);
        return {
            entity,
            add: (comp: any) => {
                commands.addComponent(entity, comp);
            }
        };
    }

    const entity = world.createEntity();
    return {
        entity,
        add: (comp: any) => world.addComponent(entity, comp)
    };
};

import { BlueprintRegistry } from "@tiny-aster/core";

function spawnEntity(world: World<any, any, any>, blueprintId: string, args: any): number {
  if (world.isUpdating) {
    const entity = world.reserveEntityId();
    world.commands.spawnFromBlueprintForEntity(entity, blueprintId, args);
    return entity;
  }

  const entity = world.createEntity();
  const registry = world.getResource<BlueprintRegistry<any, any, any>>("BlueprintRegistry");
  const blueprint = registry?.get(blueprintId);
  if (blueprint) {
    blueprint.spawn(world, entity, args);
  }
  return entity;
}

/**
 * Creates the player ship entity.
 * Includes input handling, health, and boundary constraints.
 */
export function createPlayer(world: World<any>, x: number, y: number, deferred?: boolean): Entity {
  return spawnEntity(world, "player", { x, y });
}

/**
 * Creates a single invader entity using the Data-Driven EnemyFactory.
 * Points are assigned based on the row (classic Space Invaders scoring).
 */
export function createInvader(world: World<any>, x: number, y: number, row: number, col: number, deferred?: boolean): Entity {
  return spawnEntity(world, "invader", { x, y, row, col });
}

/**
 * Creates a player bullet using the pool.
 */
export function createPlayerBullet(world: World<any>, x: number, y: number, pool: PlayerBulletPool): Entity {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  return pool.acquire(
    world,
    {
        x,
        y,
        dx: 0,
        dy: -config.PLAYER_BULLET_SPEED,
        size: config.PLAYER_BULLET_SIZE,
        color: "#00FF00",
        ttl: config.PLAYER_BULLET_TTL
    }
  );
}

/**
 * Creates an enemy bullet using the pool.
 */
export function createEnemyBullet(world: World<any>, x: number, y: number, pool: EnemyBulletPool): Entity {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  return pool.acquire(
    world,
    {
        x,
        y,
        dx: 0,
        dy: config.ENEMY_BULLET_SPEED,
        size: config.ENEMY_BULLET_SIZE,
        color: "#FF0000",
        ttl: config.ENEMY_BULLET_TTL
    }
  );
}

/**
 * Creates a single destructible block of a shield/bunker.
 */
export function createShieldSegment(world: World<any>, x: number, y: number, row: number, col: number, deferred?: boolean): Entity {
  return spawnEntity(world, "shield", { x, y, row, col });
}

/**
 * Creates the global game state entity.
 */
export function createGameState(world: World<any>, deferred?: boolean): Entity {
  return spawnEntity(world, "state", {});
}

/**
 * Creates the singleton entity that coordinates the invader grid movement.
 */
export function createFormationController(world: World<any>, deferred?: boolean): Entity {
  return spawnEntity(world, "formation", {});
}

/**
 * Procedurally spawns a grid of invaders based on GAME_CONFIG spacing.
 */
export function spawnInvaderWave(world: World<any>, _level: number, deferred?: boolean): void {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  const startX = config.INVADER_START_X;
  const startY = config.INVADER_START_Y;
  const spacingX = config.INVADER_SPACING_X;
  const spacingY = config.INVADER_SPACING_Y;
  const rows = config.INVADER_ROWS;
  const cols = config.INVADER_COLS;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      createInvader(
        world,
        startX + col * spacingX,
        startY + row * spacingY,
        row,
        col,
        deferred
      );
    }
  }
}

/**
 * Spawns multiple composite bunkers made of individual shield segments.
 */
export function spawnShields(world: World<any>, deferred?: boolean): void {
  const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
  const count = config.SHIELD_COUNT;
  const segmentsX = config.SHIELD_SEGMENTS_X;
  const segmentsY = config.SHIELD_SEGMENTS_Y;
  const startY = config.SHIELD_START_Y;
  const spacing = config.SHIELD_SPACING;

  for (let i = 0; i < count; i++) {
    const bunkerX = config.SHIELD_START_X + i * spacing;
    for (let row = 0; row < segmentsY; row++) {
      for (let col = 0; col < segmentsX; col++) {
        // Simple rectangular bunker shape
        createShieldSegment(
          world,
          bunkerX + col * config.SHIELD_SEGMENT_SIZE,
          startY + row * config.SHIELD_SEGMENT_SIZE,
          row,
          col,
          deferred
        );
      }
    }
  }
}
