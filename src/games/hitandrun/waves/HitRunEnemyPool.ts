import {
  World,
  Entity,
  CoreComponentRegistry,
  createDeferredEntity
} from "@tiny-aster/core";
import { getEnemyArchetype } from "./HitRunEnemyArchetypes";
import type {
  HitRunEnemySpawnParams,
  IHitRunEnemyPool
} from "./HitRunWaveTypes";
import { ENEMY_POOL_RESOURCE } from "./HitRunWaveTypes";
import { attachEnemyAI } from "../ai/attachEnemyAI";

/** Layer bit matching HitRunBulletPool mask (1 << 4). */
export const HIT_RUN_ENEMY_LAYER = 1 << 4;

/**
 * Pool / factory de enemigos para Hit&Run.
 * Faction uses both `faction` and `value` so CombatSystem friendly-fire checks work.
 */
export class HitRunEnemyPool implements IHitRunEnemyPool {
  public acquireEnemy(
    world: World<CoreComponentRegistry>,
    params: HitRunEnemySpawnParams
  ): Entity {
    const arch = getEnemyArchetype(params.archetypeId);
    const { entity, add } = createDeferredEntity(world);

    const size = arch?.size ?? 12;
    const color = arch?.color ?? "#ef4444";
    const shape = arch?.shape ?? "enemy";
    const health = arch?.health ?? 1;
    const faction = arch?.faction ?? "enemy";
    const behaviorTags = [
      ...(params.tags ?? []),
      ...(arch?.behaviorTags ?? [])
    ];

    add({
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

    add({
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });

    add({
      type: "BeltElevation",
      z: 0,
      vz: 0,
      grounded: true
    });

    add({
      type: "Health",
      current: health,
      max: health
    });

    add({
      type: "Faction",
      value: faction
    });

    add({
      type: "Hurtbox"
    });

    add({
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: size * 0.5, halfHeight: size * 0.5 },
      layer: HIT_RUN_ENEMY_LAYER,
      mask: 0xffff,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    });

    add({
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    add({
      type: "Render",
      shape,
      size,
      color,
      visible: true,
      opacity: 1,
      order: 2,
      depthSort: true,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    });

    add({
      type: "Tag",
      tags: ["Enemy", params.archetypeId, ...(params.tags ?? []), ...(arch?.behaviorTags ?? [])]
    });

    const enemyKind = (params.archetypeId === "charger" ? "charger" : "patrol") as "patrol" | "jumper" | "charger";
    add({
      type: "Enemy",
      kind: enemyKind,
      archetypeId: params.archetypeId,
      indexInGroup: params.indexInGroup ?? 0,
      groupSize: params.groupSize ?? 1
    } as CoreComponentRegistry["Enemy"] & { archetypeId?: string; indexInGroup?: number; groupSize?: number });

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
