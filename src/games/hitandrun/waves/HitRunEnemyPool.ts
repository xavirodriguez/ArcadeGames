import {
  World,
  Entity,
  CoreComponentRegistry
} from "@tiny-aster/core";
import type { SpriteComponent } from "@tiny-aster/core";
import { createSpriteAnimator } from "../../shared/sprites/SpriteAnimator";
import {
  SAMURAI_ASSET_KEY,
  SAMURAI_CELL_SIZE,
  SAMURAI_SPRITE_ANCHOR,
  SAMURAI_SPRITE_READY_RESOURCE,
  getSamuraiFrameRect,
  SUMI_E_THEME_RESOURCE
} from "../presentation/ThemeAssetIds";
import { getEnemyArchetype } from "./HitRunEnemyArchetypes";
import { recordHitRunDebugAllocation } from "../debug/HitRunDebugMetrics";
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
export const HIT_RUN_ENEMY_POOL_FREE_LIST = "HitRunEnemyPoolFreeList";

/**
 * Pool / factory de enemigos para Hit&Run con reciclaje real.
 * Faction uses both `faction` and `value` so CombatSystem friendly-fire checks work.
 */
export class HitRunEnemyPool implements IHitRunEnemyPool {
  private getFreeList(world: World<CoreComponentRegistry>): number[] {
    let freeList = world.getResource<number[]>(HIT_RUN_ENEMY_POOL_FREE_LIST);
    if (!freeList) {
      freeList = [];
      world.setResource(HIT_RUN_ENEMY_POOL_FREE_LIST, freeList);
    }
    return freeList;
  }

  public prewarm(world: World<CoreComponentRegistry>, count = 16): void {
    const freeList = this.getFreeList(world);
    for (let i = 0; i < count; i++) {
      const entity = world.createEntity();
      this.deactivateEntity(world, entity);
      freeList.push(entity);
    }
  }

  public release(ctx: { world: World<CoreComponentRegistry>; entity: Entity }): void {
    this.releaseEnemy(ctx.world, ctx.entity);
  }

  public releaseEnemy(world: World<CoreComponentRegistry>, entity: Entity): void {
    if (!world.hasEntity(entity)) return;
    this.deactivateEntity(world, entity);
    const freeList = this.getFreeList(world);
    if (!freeList.includes(entity)) {
      freeList.push(entity);
    }
  }

  private deactivateEntity(world: World<CoreComponentRegistry>, entity: Entity): void {
    const isUpdating = world.isUpdating;
    const cmd = world.getCommandBuffer();

    if (world.hasComponent(entity, "Render")) {
      world.mutateComponent(entity, "Render", (r) => {
        r.visible = false;
        r.opacity = 0;
      });
    }
    if (world.hasComponent(entity, "Collider2D")) {
      world.mutateComponent(entity, "Collider2D", (c) => {
        c.enabled = false;
      });
    }
    if (world.hasComponent(entity, "Velocity")) {
      world.mutateComponent(entity, "Velocity", (v) => {
        v.vx = 0;
        v.vy = 0;
      });
    }

    if (isUpdating) {
      cmd.removeComponent(entity, "Hurtbox");
      cmd.removeComponent(entity, "Dead");
      cmd.removeComponent(entity, "HitReaction");
      cmd.removeComponent(entity, "EnemyDeathState");
    } else {
      if (world.hasComponent(entity, "Hurtbox")) world.removeComponent(entity, "Hurtbox");
      if (world.hasComponent(entity, "Dead")) world.removeComponent(entity, "Dead");
      if (world.hasComponent(entity, "HitReaction")) world.removeComponent(entity, "HitReaction");
      if (world.hasComponent(entity, "EnemyDeathState")) world.removeComponent(entity, "EnemyDeathState");
    }
  }

  public acquireEnemy(
    world: World<CoreComponentRegistry>,
    params: HitRunEnemySpawnParams
  ): Entity {
    const arch = getEnemyArchetype(params.archetypeId);

    const size = arch?.size ?? 12;
    const color = arch?.color ?? "#ef4444";
    const samuraiSpriteReady =
      world.getResource<boolean>(SAMURAI_SPRITE_READY_RESOURCE) === true;
    const shape =
      params.archetypeId === "samurai" && samuraiSpriteReady
        ? "sprite"
        : (arch?.shape ?? "enemy");
    const health = arch?.health ?? 1;
    const faction = arch?.faction ?? "enemy";
    const behaviorTags = [
      ...(params.tags ?? []),
      ...(arch?.behaviorTags ?? [])
    ];

    const moveCfg =
      world.getResource<BeltMovementConfig>(BELT_MOVEMENT_CONFIG_RESOURCE) ??
      DEFAULT_BELT_MOVEMENT_CONFIG;
    const depthMin = moveCfg.depthMin ?? 280;
    const depthMax = moveCfg.depthMax ?? 520;
    const spawnY = Math.min(depthMax, Math.max(depthMin, params.y));

    const freeList = this.getFreeList(world);
    let entity: Entity;
    let isRecycled = false;

    if (freeList.length > 0) {
      entity = freeList.pop()!;
      isRecycled = true;
    } else {
      entity = world.createEntity();
    }
    recordHitRunDebugAllocation(world, "enemy");

    const isUpdating = world.isUpdating;
    const cmd = world.getCommandBuffer();

    const setOrAddComp = <K extends Extract<keyof CoreComponentRegistry, string>>(type: K, comp: CoreComponentRegistry[K] & { type: K }) => {
      if (isRecycled && world.hasComponent(entity, type)) {
        world.mutateComponent(entity, type, (c) => {
          Object.assign(c, comp);
        });
      } else {
        if (isUpdating) {
          cmd.addComponent(entity, comp as never);
        } else {
          world.addComponent(entity, comp as never);
        }
      }
    };

    setOrAddComp("Transform", {
      type: "Transform",
      x: params.x,
      y: spawnY,
      worldX: params.x,
      worldY: spawnY,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });

    setOrAddComp("Velocity", {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });

    setOrAddComp("Collider2D", {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: size * 0.5, halfHeight: size * 0.5 },
      layer: HIT_RUN_ENEMY_LAYER,
      mask: 0xffff,
      offsetX: 0,
      offsetY: 0,
      enabled: true,
      isTrigger: false
    });

    setOrAddComp("CollisionEvents", {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    setOrAddComp("Render", {
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

    if (params.archetypeId === "samurai" && samuraiSpriteReady) {
      const sprite: SpriteComponent = {
        type: "Sprite",
        assetKey: SAMURAI_ASSET_KEY,
        anchor: { ...SAMURAI_SPRITE_ANCHOR },
        srcRect: getSamuraiFrameRect(0),
        scale: size / SAMURAI_CELL_SIZE,
        flipX: false,
        flipY: false
      };
      setOrAddComp("Sprite", sprite);

      const sheetId = world.getResource<boolean>(SUMI_E_THEME_RESOURCE) === true
        ? "hitrun_sumi_e_samurai"
        : SAMURAI_ASSET_KEY;
      setOrAddComp("SpriteAnimator", createSpriteAnimator(sheetId, "idle"));
    } else {
      // A pooled samurai must not leave its image/animator attached to another archetype.
      for (const component of ["Sprite", "Animator", "SpriteAnimator"] as const) {
        if (!world.hasComponent(entity, component)) continue;
        if (isUpdating) {
          cmd.removeComponent(entity, component);
        } else {
          world.removeComponent(entity, component);
        }
      }
    }

    setOrAddComp("Tag", {
      type: "Tag",
      tags: ["Enemy", params.archetypeId, ...(params.tags ?? []), ...(arch?.behaviorTags ?? [])]
    });

    setOrAddComp("BeltElevation", {
      type: "BeltElevation",
      z: 0,
      vz: 0,
      grounded: true
    });

    setOrAddComp("Health", {
      type: "Health",
      current: health,
      max: health,
      invulnerableRemaining: 0
    });

    setOrAddComp("Faction", {
      type: "Faction",
      value: faction
    });

    if (!world.hasComponent(entity, "Hurtbox")) {
      if (isUpdating) {
        cmd.addComponent(entity, { type: "Hurtbox" } as never);
      } else {
        world.addComponent(entity, { type: "Hurtbox" });
      }
    }

    const camState = world.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
    const sectionIndex = camState?.currentSectionIndex ?? 0;
    setOrAddComp("BeltSectionEnemy", {
      type: "BeltSectionEnemy",
      sectionIndex
    } as never);

    const enemyKind = (params.archetypeId === "charger" ? "charger" : "patrol") as "patrol" | "jumper" | "charger";
    setOrAddComp("Enemy", {
      type: "Enemy",
      kind: enemyKind,
      archetypeId: params.archetypeId,
      indexInGroup: params.indexInGroup ?? 0,
      groupSize: params.groupSize ?? 1
    } as never);

    setOrAddComp("Reclaimable", {
      type: "Reclaimable",
      poolName: "EnemyPool",
      poolId: ENEMY_POOL_RESOURCE
    });

    if (isUpdating) {
      cmd.removeComponent(entity, "Dead");
      cmd.removeComponent(entity, "HitReaction");
    } else {
      if (world.hasComponent(entity, "Dead")) world.removeComponent(entity, "Dead");
      if (world.hasComponent(entity, "HitReaction")) world.removeComponent(entity, "HitReaction");
    }

    attachEnemyAI(world, entity, {
      archetypeId: params.archetypeId,
      tags: behaviorTags
    });

    return entity;
  }
}

export function registerHitRunEnemyPool(
  world: World<CoreComponentRegistry>,
  initialSize = 16
): HitRunEnemyPool {
  const existing = world.getResource<HitRunEnemyPool>(ENEMY_POOL_RESOURCE);
  if (existing) return existing;
  const pool = new HitRunEnemyPool();
  world.setResource(ENEMY_POOL_RESOURCE, pool);
  pool.prewarm(world, initialSize);
  return pool;
}
