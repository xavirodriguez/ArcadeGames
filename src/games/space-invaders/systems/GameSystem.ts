import { System, World } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry, SpaceInvadersEventRegistry } from "../types/SpaceInvadersTypes";
import { SpaceInvadersConfig } from "../types/SpaceInvadersConfigSchema";
import { isIntermissionOrPaused } from "../utils/SpaceInvadersUpdateUtils";

/**
 * Base abstract system for Space Invaders gameplay systems.
 * Provides standard lazy config resolution and intermission/pause update gating.
 */
export abstract class GameSystem extends System<SpaceInvadersComponentRegistry, SpaceInvadersEventRegistry> {
  protected config: SpaceInvadersConfig | null = null;

  /**
   * Retrieves or caches the SpaceInvadersConfig resource from the world.
   */
  protected getGameConfig(world: World<SpaceInvadersComponentRegistry>): SpaceInvadersConfig {
    if (!this.config) {
      this.config = world.getResource<SpaceInvadersConfig>("GameConfig")!;
    }
    return this.config;
  }

  /**
   * Determines whether the system should run its update loop for the current tick.
   */
  protected shouldUpdate(world: World<SpaceInvadersComponentRegistry>): boolean {
    const gameState = world.getSingleton("GameState");
    return !isIntermissionOrPaused(world, gameState);
  }
}
