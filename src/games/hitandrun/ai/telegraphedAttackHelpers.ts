import type { World, CoreComponentRegistry } from "@tiny-aster/core";
import type { EnemyAttackTypeConfig } from "./EnemyAttackConfig";
import { canTakeDamage } from "../hurt/HitRunHurtSystem";
import type { MeleeAttackComponent } from "../melee/MeleeAttackTypes";
import type { HitReactionComponent } from "../hurt/HitReactionTypes";

export function zeroVx(world: World<CoreComponentRegistry>, entity: number): void {
  const vel = world.getComponent(entity, "Velocity");
  if (vel && vel.vx !== 0) {
    const m = world.getMutableComponent(entity, "Velocity");
    if (m) m.vx = 0;
  }
}

export function dirToPlayer(world: World<CoreComponentRegistry>, entity: number): number {
  const sensor = world.getComponent(entity, "PlayerSensor") as
    | { detectedPlayerEntity?: number }
    | undefined;
  const self = world.getComponent(entity, "Transform");
  if (!sensor?.detectedPlayerEntity || !self) return 1;
  const pt = world.getComponent(sensor.detectedPlayerEntity, "Transform");
  if (!pt) return 1;
  return pt.x >= self.x ? 1 : -1;
}

export function playerDetected(
  sensor: { detectedPlayerEntity?: number } | undefined
): boolean {
  return sensor?.detectedPlayerEntity !== undefined;
}

export function isEnemyInHitstun(
  world: World<CoreComponentRegistry>,
  entity: number
): boolean {
  if (world.hasComponent(entity, "Dead")) return true;
  const reaction = world.getComponent(entity, "HitReaction") as
    | HitReactionComponent
    | undefined;
  return !!reaction && reaction.hitstunRemaining > 0;
}

export function restoreEnemyColor(
  world: World<CoreComponentRegistry>,
  entity: number,
  data: Record<string, unknown>
): void {
  if (data.baseColor && world.hasComponent(entity, "Render")) {
    const render = world.getMutableComponent(entity, "Render") as
      | { color?: string }
      | undefined;
    if (render) {
      render.color = data.baseColor as string;
    }
    data.baseColor = undefined;
  }
}

export function facePlayer(world: World<CoreComponentRegistry>, entity: number): void {
  const dir = dirToPlayer(world, entity);
  const tr = world.getComponent(entity, "Transform");
  if (!tr) return;
  const desired = dir >= 0 ? 1 : -1;
  if (tr.scaleX !== desired) {
    const m = world.getMutableComponent(entity, "Transform");
    if (m) {
      m.scaleX = desired;
      m.dirty = true;
    }
  }
}

export function shouldStartTelegraphedAttack(
  world: World<CoreComponentRegistry>,
  entity: number,
  data: Record<string, unknown>,
  cfg: EnemyAttackTypeConfig
): boolean {
  const sensor = world.getComponent(entity, "PlayerSensor") as
    | { detectedPlayerEntity?: number }
    | undefined;
  if (!playerDetected(sensor) || sensor?.detectedPlayerEntity === undefined) {
    return false;
  }

  const playerEntity = sensor.detectedPlayerEntity;
  if (
    isEnemyInHitstun(world, entity) ||
    !canTakeDamage(world, playerEntity) ||
    ((data.attackCooldownRemaining as number) ?? 0) > 0
  ) {
    return false;
  }

  const selfTr = world.getComponent(entity, "Transform");
  const playerTr = world.getComponent(playerEntity, "Transform");
  if (!selfTr || !playerTr) return false;

  const sx = selfTr.worldX ?? selfTr.x;
  const px = playerTr.worldX ?? playerTr.x;
  return Math.abs(px - sx) <= cfg.attackRange;
}

export function enterAnticipationState(
  world: World<CoreComponentRegistry>,
  entity: number,
  data: Record<string, unknown>,
  warningColor: string
): void {
  zeroVx(world, entity);
  facePlayer(world, entity);

  const render = world.getMutableComponent(entity, "Render") as
    | { color?: string }
    | undefined;
  if (render) {
    if (!data.baseColor) {
      data.baseColor = render.color ?? "#ffffff";
    }
    render.color = warningColor;
  }
}

export function updateAnticipationState(
  world: World<CoreComponentRegistry>,
  entity: number,
  data: Record<string, unknown>,
  elapsed: number,
  anticipationSeconds: number,
  nextState: string
): string | void {
  zeroVx(world, entity);
  const sensor = world.getComponent(entity, "PlayerSensor") as
    | { detectedPlayerEntity?: number }
    | undefined;

  if (
    isEnemyInHitstun(world, entity) ||
    !sensor?.detectedPlayerEntity ||
    !canTakeDamage(world, sensor.detectedPlayerEntity)
  ) {
    restoreEnemyColor(world, entity, data);
    return "Recovery";
  }

  if (elapsed >= anticipationSeconds) {
    restoreEnemyColor(world, entity, data);
    facePlayer(world, entity);
    return nextState;
  }
}

export function enterActiveMeleeAttack(
  world: World<CoreComponentRegistry>,
  entity: number,
  facingDir: number,
  cfg: EnemyAttackTypeConfig,
  damageCategory: string
): void {
  if (!world.hasComponent(entity, "MeleeAttack")) {
    world.addComponent(entity, {
      type: "MeleeAttack",
      phase: "startup",
      phaseElapsed: cfg.anticipationSeconds,
      hitboxEntity: -1,
      hitCount: 0,
      hitEntityIds: [-1, -1, -1, -1, -1, -1, -1, -1],
      facing: facingDir,
      customConfig: {
        startupSeconds: 0,
        activeSeconds: cfg.activeSeconds,
        recoverySeconds: cfg.recoverySeconds,
        damage: cfg.damage,
        hitboxWidth: cfg.hitboxWidth,
        hitboxHeight: cfg.hitboxHeight,
        hitboxOffsetX: cfg.hitboxOffsetX,
        hitboxOffsetY: cfg.hitboxOffsetY,
        knockbackX: cfg.knockbackX,
        knockbackY: cfg.knockbackY,
        damageCategory
      },
      ownerFaction: "enemy"
    } as MeleeAttackComponent);
  } else {
    const melee = world.getMutableComponent(entity, "MeleeAttack") as MeleeAttackComponent;
    melee.phase = "startup";
    melee.phaseElapsed = cfg.anticipationSeconds;
    melee.hitboxEntity = -1;
    melee.hitCount = 0;
    if (!melee.hitEntityIds) melee.hitEntityIds = new Array(8).fill(-1);
    else for (let i = 0; i < 8; i++) melee.hitEntityIds[i] = -1;
    melee.facing = facingDir;
    melee.ownerFaction = "enemy";
  }
}

export function enterTelegraphedRecovery(
  world: World<CoreComponentRegistry>,
  entity: number,
  data: Record<string, unknown>
): void {
  zeroVx(world, entity);
  restoreEnemyColor(world, entity, data);

  const melee = world.getMutableComponent(entity, "MeleeAttack") as MeleeAttackComponent | undefined;
  if (melee) {
    melee.phase = "idle";
    if (melee.hitboxEntity >= 0 && world.hasEntity(melee.hitboxEntity)) {
      world.getCommandBuffer().removeEntity(melee.hitboxEntity);
      melee.hitboxEntity = -1;
    }
  }
}
