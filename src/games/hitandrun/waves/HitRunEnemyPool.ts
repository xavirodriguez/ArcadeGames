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

/**
 * Pool / factory de enemigos para Hit&Run.
 *
 * Implementación inicial: createEntity + componentes data-driven del arquetipo.
 * Cuando exista PrefabPool por tipo, acquireEnemy delegará al pool concreto
 * sin cambiar WaveSystem.
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
    } as any);

    world.addComponent(entity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    } as any);

    world.addComponent(entity, {
      type: "Health",
      current: health,
      max: health
    } as any);

    world.addComponent(entity, {
      type: "Faction",
      faction,
      value: faction
    } as any);

    world.addComponent(entity, {
      type: "Hurtbox"
    } as any);

    world.addComponent(entity, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: size * 0.5, halfHeight: size * 0.5 },
      layer: 1 << 4,
      mask: 0xffff,
      isTrigger: false,
      enabled: true
    } as any);

    world.addComponent(entity, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    } as any);

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
    } as any);

    world.addComponent(entity, {
      type: "Tag",
      tags: ["Enemy", params.archetypeId, ...(params.tags ?? []), ...(arch?.behaviorTags ?? [])]
    } as any);

    // Marcador de arquetipo para AI / sistemas
    world.addComponent(entity, {
      type: "Enemy",
      archetypeId: params.archetypeId,
      indexInGroup: params.indexInGroup ?? 0,
      groupSize: params.groupSize ?? 1
    } as any);

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
