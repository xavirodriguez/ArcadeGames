import { Simulation } from "./Simulation";

/**
 * Canonical game identifier union for registered minigames.
 * @public
 */
export type GameId =
  | "asteroids"
  | "echorunner"
  | "space-invaders"
  | "flappybird"
  | "pong"
  | "geometrywars"
  | "platformer";

/**
 * Declares the asset requirements for a game definition prior to simulation startup.
 * @public
 */
export interface AssetManifest {
  /** Sprite image descriptors required by the game's rendering systems. */
  sprites?: { id: string; path: string }[];
  /** Audio clip descriptors required by the game's sound systems. */
  sounds?: { id: string; path: string }[];
}

/**
 * Declares the logical input action names and directional axes of a game's control scheme.
 * @public
 */
export interface InputSchema {
  /** Discrete action trigger names (e.g., `["shoot", "hyperspace", "pause"]`). */
  actions: string[];
  /** Continuous or directional input axis names (e.g., `["moveX", "moveY"]`). */
  axes?: string[];
}

/**
 * Standard contract for defining a game decoupled from presentation and engine adapters.
 *
 * @remarks
 * A `GameDefinition` provides metadata, input configuration, asset requirements, and a factory method
 * (`createSimulation`) for instantiating pure simulation instances.
 *
 * @public
 */
export interface GameDefinition {
  /**
   * Unique name of the game (e.g., `"asteroids"`).
   */
  readonly name: GameId | string;

  /**
   * Factory method to instantiate a new, deterministic simulation instance initialized with the given seed.
   *
   * @param seed - The random seed used to initialize deterministic simulation behavior.
   * @returns A fresh `Simulation` instance.
   */
  createSimulation(seed: number): Simulation;

  /**
   * Declared input schema for the game's logical inputs.
   */
  readonly inputSchema: InputSchema;

  /**
   * Required assets manifest for preloading.
   */
  readonly assets: AssetManifest;
}
