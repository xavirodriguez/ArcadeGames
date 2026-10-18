import {
  World,
  Entity,
  CoreComponentRegistry
} from "@tiny-aster/core";
import { ArcadeEntityBuilder } from "@tiny-aster/gameplay-kit";
import { getEnemyArchetype } from "./HitRunEnemyArchetypes";
import type {
  HitRunEnemySpawnParams,
  IHitRunEnemyPool
} from "./HitRunWaveTypes";
import { ENEMY_POOL_RESOURCE } from "./HitRunWaveTypes";
import { attachEnemyAI } from "../ai/attachEnemyAI";
import {
  BELT_CAMERA_STATE_RESOURCE,
  type BeltCameraState
} from "../belt/BeltCameraTypes";
import {
  BELT_MOVEMENT_CONFIG_RESOURCE,
  DEFAULT_BELT_MOVEMENT_CONFIG,
  type BeltMovementConfig
} from "../belt/BeltMovementTypes";

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

    const size = arch?.size ?? 12;
    const color = arch?.color ?? "#ef4444";
    const shape = arch?.shape ?? "enemy";
    const health = arch?.health ?? 1;
    const faction = arch?.faction ?? "enemy";
    const behaviorTags = [
      ...(params.tags ?? []),
      ...(arch?.behaviorTags ?? [])
    ];

    // Belt depth axis is Transform.y — keep spawns inside the playable band
    const moveCfg =
      world.getResource<BeltMovementConfig>(BELT_MOVEMENT_CONFIG_RESOURCE) ??
      DEFAULT_BELT_MOVEMENT_CONFIG;
    const depthMin = moveCfg.depthMin ?? 280;
    const depthMax = moveCfg.depthMax ?? 520;
    const spawnY = Math.min(depthMax, Math.max(depthMin, params.y));

    const builder = world.isUpdating
      ? ArcadeEntityBuilder.createDeferred(world)
      : ArcadeEntityBuilder.create(world);

    const entity = builder
      .withTransform({ x: params.x, y: spawnY, worldX: params.x, worldY: spawnY })
      .withVelocity()
      .withCollider2D({
        shape: { type: "aabb", halfWidth: size * 0.5, halfHeight: size * 0.5 },
        layer: HIT_RUN_ENEMY_LAYER,
        mask: 0xffff,
        isTrigger: false
      })
      .withCollisionEvents()
      .withRender({
        shape,
        size,
        color,
        visible: true,
        opacity: 1,
        order: 2,
        depthSort: true
      })
      .build();

    const addComp = (comp: unknown) => {
      if (world.isUpdating) {
        world.getCommandBuffer().addComponent(entity, comp as never);
      } else {
        world.addComponent(entity, comp as never);
      }
    };

    addComp({
      type: "Tag",
      tags: ["Enemy", params.archetypeId, ...(params.tags ?? []), ...(arch?.behaviorTags ?? [])]
    });
    addComp({
      type: "BeltElevation",
      z: 0,
      vz: 0,
      grounded: true
    });
    addComp({
      type: "Health",
      current: health,
      max: health
    });
    addComp({
      type: "Faction",
      value: faction
    });
    addComp({
      type: "Hurtbox"
    });

    // Gate camera until this section's enemies are cleared
    const camState = world.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
    const sectionIndex = camState?.currentSectionIndex ?? 0;
    addComp({
      type: "BeltSectionEnemy",
      sectionIndex
    });

    const enemyKind = (params.archetypeId === "charger" ? "charger" : "patrol") as "patrol" | "jumper" | "charger";
    addComp({
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
