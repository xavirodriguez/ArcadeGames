import { World, Entity, ShapeType, EntityBuilder } from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { GalaxianComponentRegistry, GalaxianEnemyComponent, EnemyType } from "./types/GalaxianTypes";
import { GalaxianConfig } from "./types/GalaxianConfigSchema";

export class EnemyFactory {
  public static createEnemy(
    world: World<GalaxianComponentRegistry>,
    enemyType: EnemyType,
    x: number,
    y: number,
    row: number,
    col: number,
    slotId: string,
    pointsFormation: number,
    pointsDive: number,
    bonusEscorted: number,
    entityOverride?: Entity
  ): Entity {
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const slotSpacing = config?.formation.slotSpacingX ?? 32;
    const enemyRadius = (slotSpacing * 0.75) / 2;

    const builder = entityOverride !== undefined
      ? EntityBuilder.fromEntity(world, entityOverride)
      : EntityBuilder.create(world);

    const entity = builder
      .withTransform({ x, y, rotation: Math.PI })
      .withVelocity()
      .withRender({
        shape: `enemy_${enemyType}`,
        size: enemyRadius * 2,
        color: "#8CC4FF",
        order: 5,
      })
      .withCollider({
        shape: { type: ShapeType.Circle, radius: enemyRadius },
        layer: CollisionLayers.ENEMY,
        mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
      })
      .withCollisionEvents()
      .build();

    world.addComponent(entity, {
      type: "GalaxianEnemy",
      enemyType,
      row,
      col,
      slotId,
      pointsFormation,
      pointsDive,
      bonusEscorted,
      state: "in_slot",
      windupTimer: 0,
      shotsFiredInDive: 0,
      hitsRemaining: enemyType === "flagship" ? 2 : 1,
    } as GalaxianEnemyComponent);

    world.addComponent(entity, {
      type: "VisualPose",
      rotation: Math.PI,
      scaleX: 1.0,
      scaleY: 1.0,
      visualOffsetX: 0,
      visualOffsetY: 0,
    });

    world.addComponent(entity, {
      type: "DiveTrail",
      history: [],
      maxHistory: config?.visual.trailLength ?? 24,
    });

    return entity;
  }
}
