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

    const isDeferred = world.isUpdating && entityOverride === undefined;
    let entity: Entity;
    if (entityOverride !== undefined) {
      entity = entityOverride;
    } else if (isDeferred) {
      entity = world.reserveEntityId();
    } else {
      entity = world.createEntity();
    }

    const transformComponent = {
      type: "Transform" as const,
      x,
      y,
      rotation: Math.PI,
      scaleX: 1,
      scaleY: 1,
      worldX: x,
      worldY: y,
      worldRotation: Math.PI,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    };
    const velocityComponent = { type: "Velocity" as const, vx: 0, vy: 0, angularVelocity: 0 };
    const renderComponent = {
      type: "Render" as const,
      shape: `enemy_${enemyType}`,
      size: enemyRadius * 2,
      color: "#8CC4FF",
      visible: true,
      opacity: 1,
      order: 5,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
    };
    const colliderComponent = {
      type: "Collider" as const,
      shape: { type: ShapeType.Circle, radius: enemyRadius },
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
      enabled: true,
      isTrigger: false,
    };
    const collisionEventsComponent = {
      type: "CollisionEvents" as const,
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: [],
    };
    const galaxianEnemyComponent = {
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
    } as GalaxianEnemyComponent;
    const visualPoseComponent = {
      type: "VisualPose",
      rotation: Math.PI,
      scaleX: 1.0,
      scaleY: 1.0,
      visualOffsetX: 0,
      visualOffsetY: 0,
      previousX: x,
      previousY: y,
      hasPreviousPosition: false,
    };
    const diveTrailComponent = {
      type: "DiveTrail",
      history: [],
      maxHistory: config?.visual.trailLength ?? 24,
    };

    const attach = (component: any) => {
      if (isDeferred) {
        world.commands.addComponent(entity, component);
      } else {
        world.addComponent(entity, component);
      }
    };

    if (isDeferred) {
      world.commands.createEntity(entity);
    }

    attach(transformComponent);
    attach(velocityComponent);
    attach(renderComponent);
    attach(colliderComponent);
    attach(collisionEventsComponent);
    attach(galaxianEnemyComponent);
    attach(visualPoseComponent);
    attach(diveTrailComponent);

    return entity;
  }
}
