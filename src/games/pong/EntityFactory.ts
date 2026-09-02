import { World, spawnViaBlueprint } from "@tiny-aster/core";
import { PongConfig, DEFAULT_PONG_CONFIG } from "./types/PongConfigSchema";
import { TransformComponent, VelocityComponent, ColliderComponent } from "@tiny-aster/core";

import { CollisionLayers } from "../shared/types/CollisionLayers";

function spawnEntity(world: World<any, any, any>, blueprintId: string, args: any): number {
  return spawnViaBlueprint(world, blueprintId, args);
}

/**
 * Factoría para la creación de entidades de Pong.
 *
 * @responsibility Instanciar la bola, las paletas y el estado global con los componentes correctos.
 *
 * @remarks
 * Encapsula la configuración de dimensiones, velocidades iniciales y máscaras de colisión
 * necesarias para el comportamiento de rebote característico de Pong.
 */
export const PongEntityFactory = {
  /**
   * Creates the ball entity at the center of the screen.
   * Uses `gameplayRandom` to determine initial vertical direction.
   */
  createBall(world: World<any>) {
    return spawnEntity(world, "ball", {});
  },

  /**
   * Creates a paddle entity for either the left or right side.
   * @param world - ECS World.
   * @param side - Which side of the screen the paddle belongs to.
   */
  createPaddle(world: World<any>, side: "left" | "right") {
    return spawnEntity(world, "paddle", { side });
  },

  createGameState(world: World<any>) {
    return spawnEntity(world, "state", {});
  }
};
