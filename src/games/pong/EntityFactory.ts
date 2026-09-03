import { World } from "@tiny-aster/core";
import { PongConfig, DEFAULT_PONG_CONFIG } from "./types/PongConfigSchema";
import { TransformComponent, VelocityComponent, ColliderComponent } from "@tiny-aster/core";

import { CollisionLayers } from "../shared/types/CollisionLayers";

// TODO(refactor): código duplicado detectado (bloque) con flappybird/EntityFactory.ts:64-89. Considerar extraer a función compartida. Ref: c53d5ed5
import { BlueprintRegistry } from "@tiny-aster/core";

function spawnEntity(world: World<any, any, any>, blueprintId: string, args: any): number {
  if (world.isUpdating) {
    const entity = world.reserveEntityId();
    world.commands.spawnFromBlueprintForEntity(entity, blueprintId, args);
    return entity;
  }

  const entity = world.createEntity();
  const registry = world.getResource<BlueprintRegistry<any, any, any>>("BlueprintRegistry");
  const blueprint = registry?.get(blueprintId);
  if (blueprint) {
    blueprint.spawn(world, entity, args);
  }
  return entity;
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
