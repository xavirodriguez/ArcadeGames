import {
  World,
  Entity,
  CoreComponentRegistry
} from "@tiny-aster/core";
import { getEnemyArchetype } from "./HitRunEnemyArchetypes";
import type {
  HitRunEnemySpawnParams,
  IHitRunEnemyPool
} from "./HitRunWaveTypes";
import { ENEMY_POOL_RESOURCE } from "./HitRunWaveTypes";
import { attachEnemyAI } from "../ai/attachEnemyAI";

/**
 * Pool / factory de enemigos para Hit&Run.
 * Tras spawnear componentes base, adjunta AI según behaviorTags.
 */
export class HitRunEnemyPool implements IHitRunEnemyPool {
  public acquireEnemy(
    world: World<CoreComponentRegistry>,
    params: HitRunEnemySpawnParams
  ): Entity {
    const arch = getEnemyArchetype(params.archetypeId);
    const entity = world.createEntity();

    const size = arch?.size ?? 12;
    const color = arch?.color ?? "#ef4444";
    const shape = arch?.shape ?? "enemy";
    const health = arch?.health ?? 1;
    const faction = arch?.faction ?? "enemy";
    const behaviorTags = [
      ...(params.tags ?? []),
      ...(arch?.behaviorTags ?? [])
    ];

    world.addComponent(entity, {
      type: "Transform",
      x: params.x,
      y: params.y,
      worldX: params.x,
      worldY: params.y,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });

    world.addComponent(entity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });

    world.addComponent(entity, {
      type: "Health",
      current: health,
      max: health
    });

    world.addComponent(entity, {
      type: "Faction",
      value: faction
    });

    world.addComponent(entity, {
      type: "Hurtbox"
    });

    world.addComponent(entity, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: size * 0.5, halfHeight: size * 0.5 },
      layer: 1 << 4,
      mask: 0xffff,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    });

    world.addComponent(entity, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    world.addComponent(entity, {
      type: "Render",
      shape,
      size,
      color,
      visible: true,
      opacity: 1,
      order: 3,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    });

    world.addComponent(entity, {
      type: "Tag",
      tags: ["Enemy", params.archetypeId, ...(params.tags ?? []), ...(arch?.behaviorTags ?? [])]
    });

    world.addComponent(entity, {
      type: "Enemy",
      kind: params.archetypeId as "patrol" | "jumper" | "charger",
      archetypeId: params.archetypeId,
      indexInGroup: params.indexInGroup ?? 0,
      groupSize: params.groupSize ?? 1
    });

    // AI data-driven por behaviorTags
    attachEnemyAI(world, entity, {
      archetypeId: params.archetypeId,
      tags: behaviorTags
    });

    return entity;
  }
}

export function registerHitRunEnemyPool(
  world: World<CoreComponentRegistry>
): HitRunEnemyPool {
  const existing = world.getResource<HitRunEnemyPool>(ENEMY_POOL_RESOURCE);
  if (existing) return existing;
  const pool = new HitRunEnemyPool();
  world.setResource(ENEMY_POOL_RESOURCE, pool);
  return pool;
}
