import { World, Entity, Component, createDeferredEntity, spawnBlueprintEntity } from "@tiny-aster/core";
import { FLAPPY_CONFIG, FlappyBirdComponentRegistry } from "./types/FlappyBirdTypes";
import { createEmitter } from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
// TODO(refactor): código duplicado detectado (bloque) con space-invaders/EntityFactory.ts:18-53. Considerar extraer a función compartida. Ref: c2ca13fe
import { Collider2DComponent, TransformComponent, VelocityComponent, RenderComponent, HealthComponent } from "@tiny-aster/core";

/**
 * Entity factory for the Flappy Bird game domain.
 *
 * Coordinates the creation of the bird, pipes, and ground.
 * Manages the spatial layout of pipes and ensures proper collision masking
 * for the "flap and avoid" gameplay.
 *
 * @packageDocumentation
 */


/**
 * Parameters for creating a bird entity.
 */
export interface CreateBirdParams {
  world: World<any>;
  x: number;
  y: number;
  /** @deprecated Currently unused — spawnBlueprintEntity always spawns immediately. */
  deferred?: boolean;
}

/**
 * Parameters for creating a pipe entity.
 */
export interface CreatePipeParams {
  world: World<any>;
  x: number;
  gapY: number;
  /** @deprecated Currently unused — spawnBlueprintEntity always spawns immediately. */
  deferred?: boolean;
}

/**
 * Creates the bird (player) entity.
 *
 * @remarks
 * Includes gravity physics, input handling, and a specialized input buffer
 * to make jump timing more forgiving.
 */
export function createBird(options: CreateBirdParams): Entity {
  return spawnBlueprintEntity(options.world, "bird", { x: options.x, y: options.y });
}

/**
 * Creates a vertical pair of pipe entities (top and bottom).
 * @param options.gapY - The vertical center of the gap between pipes.
 */
export function createPipe(options: CreatePipeParams): void {
  spawnBlueprintEntity(options.world, "pipe", { x: options.x, gapY: options.gapY });
}

/**
 * Creates the ground entity.
 * @param deferred - Currently unused; reserved parameter, ignored by this function.
 */
export function createGround(world: World<any>, deferred?: boolean): Entity {
  return spawnBlueprintEntity(world, "ground", {});
}

/**
 * Creates the global game state entity.
 * @param deferred - Currently unused; reserved parameter, ignored by this function.
 */
export function createGameState(world: World<any>, deferred?: boolean): Entity {
  return spawnBlueprintEntity(world, "state", {});
}
