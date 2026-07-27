import { Entity, WorldSnapshot, IEntityPool } from "@tiny-aster/core";

export type { Entity, WorldSnapshot, IEntityPool };

/**
 * Hub for re-exporting types for backward compatibility and centralized access.
 * Note: Game-specific types are increasingly located in their respective game folders.
 */

// Re-export Asteroids types for backward compatibility from local games directory
export { INITIAL_GAME_STATE } from "../games/asteroids/types/AsteroidTypes";
export type { GameStateComponent, InputState, ShipComponent, BulletComponent, UfoComponent, InputComponent } from "../games/asteroids/types/AsteroidTypes";
