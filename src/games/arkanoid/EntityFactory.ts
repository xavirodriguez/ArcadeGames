import { World, spawnBlueprintEntity, Entity } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry, BrickKind, BrickColorName, CapsuleType } from "./types/ArkanoidTypes";
import { ArkanoidBlueprintMap } from "./ArkanoidGame";

export class ArkanoidEntityFactory {
  public static createPaddle(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry, ArkanoidBlueprintMap>): Entity {
    return spawnBlueprintEntity(world, "paddle", {});
  }

  public static createBall(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry, ArkanoidBlueprintMap>): Entity {
    return spawnBlueprintEntity(world, "ball", {});
  }

  public static createBrick(
    world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry, ArkanoidBlueprintMap>,
    x: number,
    y: number,
    kind: BrickKind = "standard",
    color?: BrickColorName,
    hp?: number,
    points?: number,
    powerUp?: CapsuleType
  ): Entity {
    return spawnBlueprintEntity(world, "brick", { x, y, kind, color, hp, points, powerUp });
  }

  public static createGameState(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry, ArkanoidBlueprintMap>): Entity {
    return spawnBlueprintEntity(world, "state", {});
  }
}
