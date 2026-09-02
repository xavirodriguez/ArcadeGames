import { World, spawnViaBlueprint } from "@tiny-aster/core";
import { Entity, Component } from "@tiny-aster/core";
import { FLAPPY_CONFIG, FlappyBirdComponentRegistry } from "./types/FlappyBirdTypes";
import { createEmitter } from "@tiny-aster/core";
import { CollisionLayers } from "../shared/types/CollisionLayers";
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
  deferred?: boolean;
}

/**
 * Parameters for creating a pipe entity.
 */
export interface CreatePipeParams {
  world: World<any>;
  x: number;
  gapY: number;
  deferred?: boolean;
}

function spawnEntity(world: World<any, any, any>, blueprintId: string, args: any): number {
  return spawnViaBlueprint(world, blueprintId, args);
}

/**
 * Crea la entidad del pájaro (jugador).
 *
 * @remarks
 * Incluye física de gravedad, manejo de entrada y un buffer de entrada especializado
 * para facilitar el timing del salto (jump timing).
 */
export function createBird(options: CreateBirdParams): Entity {
  return spawnEntity(options.world, "bird", { x: options.x, y: options.y });
}

/**
 * Creates a vertical pair of pipe entities (top and bottom).
 * @param options.gapY - The vertical center of the gap between pipes.
 */
export function createPipe(options: CreatePipeParams): void {
  spawnEntity(options.world, "pipe", { x: options.x, gapY: options.gapY });
}

/**
 * Creates the ground entity.
 */
export function createGround(world: World<any>, deferred?: boolean): Entity {
  return spawnEntity(world, "ground", {});
}

/**
 * Creates the global game state entity.
 */
export function createGameState(world: World<any>, deferred?: boolean): Entity {
  return spawnEntity(world, "state", {});
}
