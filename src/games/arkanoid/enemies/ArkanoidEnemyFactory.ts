import { World, EntityBuilder, ShapeType, BoxShape, CircleShape, Entity } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry } from "../types/ArkanoidTypes";
import { ArkanoidBlueprintMap } from "../ArkanoidGame";

export class ArkanoidEnemyFactory {
  public static createEnemy(
    world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry, ArkanoidBlueprintMap>,
    x: number,
    y: number,
    pattern: "horizontal" | "sine" | "arc" | "swoop" = "sine"
  ): Entity {
    const enemyEntity = EntityBuilder.createDeferred(world)
      .withTransform({ x, y, dirty: true })
      .withVelocity({ vx: 0, vy: 40 })
      .withRender({ shape: "box", size: 20, color: "#00FF66", order: 2 })
      .withCollider({
        shape: { type: ShapeType.Box, width: 20, height: 20 } as BoxShape,
        layer: 2,
        mask: 5
      })
      .withCollisionEvents()
      .build();

    world.getCommandBuffer().addComponent(enemyEntity, {
      type: "Health",
      current: 1,
      max: 1,
      invulnerableRemaining: 0
    });

    world.getCommandBuffer().addComponent(enemyEntity, {
      type: "Enemy",
      kind: "patrol",
      enemyType: "sphere",
      pattern,
      timer: 0,
      startX: x,
      startY: y,
      hp: 1,
      points: 100
    });

    world.getCommandBuffer().addComponent(enemyEntity, {
      type: "Tag",
      tags: ["Enemy"]
    });

    return enemyEntity;
  }
}
