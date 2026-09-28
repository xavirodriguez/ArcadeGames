import { World, Entity, spawnBlueprintEntity } from "@tiny-aster/core";
import { getScenarioConfig, samplePipeFromRecipe } from "./ScenarioDefinitions";

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
  visualVariant?: "standard" | "damaged" | "rusted";
  movementType?: "static" | "oscillating" | "laser_gate";
  oscillationSpeed?: number;
  oscillationAmplitude?: number;
  isNarrowGap?: boolean;
  /** @deprecated Currently unused — spawnBlueprintEntity always spawns immediately. */
  deferred?: boolean;
}

/**
 * Creates the bird (player) entity.
 */
export function createBird(options: CreateBirdParams): Entity {
  return spawnBlueprintEntity(options.world, "bird", { x: options.x, y: options.y });
}

/**
 * Creates a vertical pair of pipe entities (top and bottom).
 * Reads the active scenario recipe to sample properties if explicit options are omitted.
 */
export function createPipe(options: CreatePipeParams): void {
  const gameState = options.world.getSingleton("FlappyState");
  const scenarioConfig = getScenarioConfig(gameState?.currentScenario ?? "open_space");

  let visualVariant = options.visualVariant;
  let movementType = options.movementType;
  let oscillationSpeed = options.oscillationSpeed;
  let oscillationAmplitude = options.oscillationAmplitude;
  let isNarrowGap = options.isNarrowGap;

  if (movementType === undefined && visualVariant === undefined) {
    const sampled = samplePipeFromRecipe(scenarioConfig.pipeRecipe, options.world.gameplayRandom);
    visualVariant = sampled.visualVariant;
    movementType = sampled.movementType;
    oscillationSpeed = sampled.oscillationSpeed;
    oscillationAmplitude = sampled.oscillationAmplitude;
    if (isNarrowGap === undefined) {
      isNarrowGap = sampled.isNarrowGap;
    }
  }

  spawnBlueprintEntity(options.world, "pipe", {
    x: options.x,
    gapY: options.gapY,
    visualVariant,
    movementType,
    oscillationSpeed,
    oscillationAmplitude,
    isNarrowGap,
  });
}

/**
 * Creates the ground entity.
 */
export function createGround(world: World<any>, deferred?: boolean): Entity {
  return spawnBlueprintEntity(world, "ground", {});
}

/**
 * Creates the global game state entity.
 */
export function createGameState(world: World<any>, deferred?: boolean): Entity {
  return spawnBlueprintEntity(world, "state", {});
}
