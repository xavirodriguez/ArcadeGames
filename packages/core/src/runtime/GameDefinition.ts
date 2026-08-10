import { Simulation } from "./Simulation";

/**
 * Representation of asset requirements for a game.
 * @public
 */
export interface AssetManifest {
  sprites?: { id: string; path: string }[];
  sounds?: { id: string; path: string }[];
}

/**
 * Declares the logical actions and axes of a game's input scheme.
 * @public
 */
export interface InputSchema {
  actions: string[];
  axes?: string[];
}

/**
 * Standard interface for declaring a game completely decoupled from presentation.
 * @public
 */
export interface GameDefinition {
  /**
   * Unique name of the game (e.g. "asteroids").
   */
  readonly name: string;

  /**
   * Factory method to create a new simulation instance with the given seed.
   */
  createSimulation(seed: number): Simulation;

  /**
   * Declared input schema for the game.
   */
  readonly inputSchema: InputSchema;

  /**
   * Required assets manifest for loading.
   */
  readonly assets: AssetManifest;
}
