import { World, spawnBlueprintEntity, Entity } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry, BrickKind } from "./types/ArkanoidTypes";
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
    kind: BrickKind = "standard"
  ): Entity {
    return spawnBlueprintEntity(world, "brick", { x, y, kind });
  }

  public static createGameState(world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry, ArkanoidBlueprintMap>): Entity {
    return spawnBlueprintEntity(world, "state", {});
  }
}
