import { World, spawnBlueprintEntity } from "@tiny-aster/core";
import { PongConfig, DEFAULT_PONG_CONFIG } from "./types/PongConfigSchema";
import { TransformComponent, VelocityComponent, ColliderComponent } from "@tiny-aster/core";

import { CollisionLayers } from "@tiny-aster/gameplay-kit";

/**
 * Entity factory for the Pong game domain.
 *
 * @responsibility Instantiate the ball, paddles, and global state with the
 * correct components.
 *
 * @remarks
 * Encapsulates screen dimensions, initial velocities, and collision
 * layers/masks needed for Pong's characteristic bounce behavior. All three
 * methods are thin wrappers around blueprints registered elsewhere — see the
 * "ball"/"paddle"/"state" blueprint definitions for actual component setup.
 * @packageDocumentation
 */
export const PongEntityFactory = {
  /**
   * Creates the ball entity at the center of the screen.
   * @remarks Uses `world.gameplayRandom` to determine initial vertical
   * direction — this must stay on gameplayRandom, not Math.random, to
   * preserve replay/rollback determinism.
   */
  createBall(world: World<any>) {
    return spawnBlueprintEntity(world, "ball", {});
  },

  /**
   * Creates a paddle entity for either the left or right side.
   * @param world - ECS World.
   * @param side - Which side of the screen the paddle belongs to.
   */
  createPaddle(world: World<any>, side: "left" | "right") {
    return spawnBlueprintEntity(world, "paddle", { side });
  },

  /** Creates the global Pong game-state singleton entity. */
  createGameState(world: World<any>) {
    return spawnBlueprintEntity(world, "state", {});
  }
};
