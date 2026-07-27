import { World } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "./AsteroidRegistry";
import { InputState, GameStateComponent } from "./AsteroidTypes";

/** @public */
export interface IAsteroidsGame {
  getWorld(): World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  getGameState(): GameStateComponent;
  isGameOver(): boolean;
  setInputState(input: Partial<InputState>): void;
}
