import { World, EntityBuilder, ShapeType, BoxShape, CircleShape, Entity } from "@tiny-aster/core";
import { ArkanoidComponentRegistry, ArkanoidEventRegistry } from "../types/ArkanoidTypes";
import { ArkanoidBlueprintMap } from "../ArkanoidGame";

export const DOH_REQUIRED_HITS = 16;

export class DohFactory {
  public static createDoh(
    world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry, ArkanoidBlueprintMap>,
    x: number,
    y: number
  ): Entity {
    const dohEntity = EntityBuilder.create(world)
      .withTransform({ x, y, dirty: true })
      .withVelocity({ vx: 0, vy: 0 })
      .withRender({ shape: "box", size: 80, color: "#FF0055", order: 2 })
      .withCollider({
        shape: { type: ShapeType.Box, width: 80, height: 90 } as BoxShape,
        layer: 2,
        mask: 5
      })
      .withCollisionEvents()
      .build();

    world.addComponent(dohEntity, {
      type: "Health",
      current: DOH_REQUIRED_HITS,
      max: DOH_REQUIRED_HITS,
      invulnerableRemaining: 0
    });

    world.addComponent(dohEntity, {
      type: "Boss",
      state: "intro",
      hp: DOH_REQUIRED_HITS,
      maxHp: DOH_REQUIRED_HITS,
      hitsReceived: 0,
      attackTimer: 2.0,
      damagedTimer: 0,
      introTimer: 3.0
    });

    world.addComponent(dohEntity, {
      type: "Tag",
      tags: ["Boss", "Doh"]
    });

    return dohEntity;
  }

  public static createBossProjectile(
    world: World<ArkanoidComponentRegistry, ArkanoidEventRegistry, ArkanoidBlueprintMap>,
    x: number,
    y: number,
    vx: number,
    vy: number
  ): Entity {
    const projEntity = EntityBuilder.create(world)
      .withTransform({ x, y, dirty: true })
      .withVelocity({ vx, vy })
      .withRender({ shape: "circle", size: 6, color: "#FF00FF", order: 3 })
      .withCollider({
        shape: { type: ShapeType.Circle, radius: 6 } as CircleShape,
        layer: 2,
        mask: 1
      })
      .withCollisionEvents()
      .withTTL(4.0)
      .build();

    world.addComponent(projEntity, {
      type: "BossProjectile",
      speed: Math.sqrt(vx * vx + vy * vy),
      vx,
      vy
    });

    return projEntity;
  }
}
