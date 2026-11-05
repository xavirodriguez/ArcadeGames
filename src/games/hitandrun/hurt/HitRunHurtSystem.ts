import {
  World,
  CoreComponentRegistry,
  Entity
} from "@tiny-aster/core";
import type { CombatHitPayload } from "../systems/HitRunFeedbackTypes";
import { applyBeltElevationKnockback } from "../belt/BeltElevationComponent";
import {
  DEFAULT_HIT_REACTION_CONFIG,
  HIT_REACTION_CONFIG_RESOURCE,
  type HitReactionComponent,
  type HitReactionConfig,
  resolveHitReactionDurations
} from "./HitReactionTypes";
import { CombatHitListenerSystem } from "../combat/CombatHitListenerSystem";

/**
 * Applies gameplay reactions to resolved combat events.
 * Damage is owned by the attack system; this system owns hitstun, stagger,
 * knockback and player invulnerability. Fully guarded and armor-only impacts
 * never masquerade as health hits.
 */
export class HitRunHurtSystem extends CombatHitListenerSystem<CombatHitPayload> {
  public enqueueHitForTest(payload: CombatHitPayload): void {
    this.pendingHits.push(payload);
  }

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config =
      world.getResource<HitReactionConfig>(HIT_REACTION_CONFIG_RESOURCE) ??
      DEFAULT_HIT_REACTION_CONFIG;

    if (this.pendingHits.length > 0) {
      this.processHits(world, config);
      this.pendingHits.length = 0;
    }

    this.tickHitstunAndBlink(world, config, deltaTime);
    this.tickInvulnerability(world, deltaTime);
  }

  private processHits(
    world: World<CoreComponentRegistry>,
    config: HitReactionConfig
  ): void {
    const len = this.pendingHits.length;
    for (let i = 0; i < len; i++) {
      const hit = this.pendingHits[i];
      if (!world.hasEntity(hit.targetEntity)) continue;

      // Guard feedback is presentation-only unless the guard actually breaks.
      // Armor-only absorption also has its own feedback and must not cause a
      // health-hit reaction when no damage reached Health.
      if (hit.blocked || (hit.amount <= 0 && !hit.guardBroken)) continue;

      const target = hit.targetEntity;
      const isPlayer = this.isPlayer(world, target);
      const { hitstunSeconds, staggerSeconds } =
        resolveHitReactionDurations(hit, isPlayer, config);
      const fallbackKnockbackX = isPlayer
        ? config.playerKnockbackX
        : config.enemyKnockbackX;
      const fallbackKnockbackY = isPlayer
        ? config.playerKnockbackY
        : config.enemyKnockbackY;

      if (isPlayer) {
        this.applyPlayerReaction(
          world, target, hit, config, hitstunSeconds, staggerSeconds,
          hit.knockbackX ?? fallbackKnockbackX,
          hit.knockbackY ?? fallbackKnockbackY
        );
      } else {
        this.applyEnemyReaction(
          world, target, hit, hitstunSeconds, staggerSeconds,
          hit.knockbackX ?? fallbackKnockbackX,
          hit.knockbackY ?? fallbackKnockbackY
        );
      }
    }
  }

  private isPlayer(world: World<CoreComponentRegistry>, entity: Entity): boolean {
    if (world.hasComponent(entity, "PlatformerInput") || world.hasComponent(entity, "BeltInput")) {
      return true;
    }
    const faction = world.getComponent(entity, "Faction") as
      | { value?: string; faction?: string }
      | undefined;
    return faction?.value === "player" || faction?.faction === "player";
  }

  private applyPlayerReaction(
    world: World<CoreComponentRegistry>,
    target: Entity,
    hit: CombatHitPayload,
    config: HitReactionConfig,
    hitstunSeconds: number,
    staggerSeconds: number,
    knockbackX: number,
    knockbackY: number
  ): void {
    const health = world.getComponent(target, "Health") as
      | { invulnerableRemaining?: number }
      | undefined;
    if (
      health &&
      health.invulnerableRemaining !== undefined &&
      health.invulnerableRemaining > 0
    ) {
      return;
    }

    this.applyKnockback(world, target, hit.sourceEntity, knockbackX, knockbackY);

    if (health && hit.amount > 0) {
      const mutH = world.getMutableComponent(target, "Health") as
        | { invulnerableRemaining?: number }
        | undefined;
      if (mutH) {
        mutH.invulnerableRemaining = config.playerInvulnSeconds;
      }
    }

    this.ensureHitReaction(world, target, hitstunSeconds, staggerSeconds);

    if (world.hasComponent(target, "Render")) {
      const render = world.getMutableComponent(target, "Render") as
        | { hitFlashFrames?: number }
        | undefined;
      if (render) {
        render.hitFlashFrames = Math.max(render.hitFlashFrames ?? 0, 6);
      }
    }
  }

  private applyEnemyReaction(
    world: World<CoreComponentRegistry>,
    target: Entity,
    hit: CombatHitPayload,
    hitstunSeconds: number,
    staggerSeconds: number,
    knockbackX: number,
    knockbackY: number
  ): void {
    this.applyKnockback(world, target, hit.sourceEntity, knockbackX, knockbackY);
    this.ensureHitReaction(world, target, hitstunSeconds, staggerSeconds);

    // Any hitstun interrupts an active enemy melee window; stagger extends the lock.
    if ((hitstunSeconds > 0 || staggerSeconds > 0) && world.hasComponent(target, "MeleeAttack")) {
      const melee = world.getMutableComponent(target, "MeleeAttack") as
        | { phase?: string; phaseElapsed?: number; hitboxEntity?: number }
        | undefined;
      if (melee) {
        if (melee.hitboxEntity !== undefined && melee.hitboxEntity >= 0 &&
          world.hasEntity(melee.hitboxEntity)) {
          world.getCommandBuffer().removeEntity(melee.hitboxEntity);
        }
        melee.hitboxEntity = -1;
        if (melee.phase === "active" || melee.phase === "startup") {
          melee.phase = "recovery";
          melee.phaseElapsed = 0;
        }
      }
    }
  }

  private applyKnockback(
    world: World<CoreComponentRegistry>,
    target: Entity,
    sourceEntity: Entity | undefined,
    knockX: number,
    knockY: number
  ): void {
    if (!world.hasComponent(target, "Velocity") && !world.hasComponent(target, "BeltElevation")) return;

    let dir = 1;
    if (sourceEntity !== undefined && world.hasEntity(sourceEntity)) {
      const t = world.getComponent(target, "Transform");
      const s = world.getComponent(sourceEntity, "Transform");
      if (t && s) {
        const tx = t.worldX ?? t.x;
        const sx = s.worldX ?? s.x;
        dir = tx >= sx ? 1 : -1;
      }
    }

    if (world.hasComponent(target, "Velocity")) {
      const vel = world.getMutableComponent(target, "Velocity") as
        | { vx: number }
        | undefined;
      if (vel) vel.vx = dir * Math.max(0, knockX);
    }

    if (knockY > 0) {
      applyBeltElevationKnockback(world, target, knockY);
    }
  }

  private ensureHitReaction(
    world: World<CoreComponentRegistry>,
    entity: Entity,
    hitstunSeconds: number,
    staggerSeconds: number
  ): void {
    if (!world.hasEntity(entity) || world.hasComponent(entity, "Dead")) return;

    if (world.hasComponent(entity, "HitReaction")) {
      const mut = world.getMutableComponent(entity, "HitReaction") as
        | HitReactionComponent
        | undefined;
      if (mut) {
        mut.hitstunRemaining = Math.max(mut.hitstunRemaining, hitstunSeconds);
        mut.staggerRemaining = Math.max(mut.staggerRemaining ?? 0, staggerSeconds);
        mut.blinkElapsed = 0;
      }
      return;
    }

    world.getCommandBuffer().addComponent(entity, {
      type: "HitReaction",
      hitstunRemaining: Math.max(0, hitstunSeconds),
      staggerRemaining: Math.max(0, staggerSeconds),
      blinkElapsed: 0
    } as HitReactionComponent);
  }

  private tickHitstunAndBlink(
    world: World<CoreComponentRegistry>,
    config: HitReactionConfig,
    dt: number
  ): void {
    const entities = world.query("HitReaction");
    const len = entities.length;
    const half = config.blinkHalfPeriod;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const reaction = world.getMutableComponent(entity, "HitReaction") as
        | HitReactionComponent
        | undefined;
      if (!reaction) continue;

      reaction.hitstunRemaining = Math.max(0, reaction.hitstunRemaining - dt);
      reaction.staggerRemaining = Math.max(0, (reaction.staggerRemaining ?? 0) - dt);
      const locked = reaction.hitstunRemaining > 0 || reaction.staggerRemaining > 0;

      if (
        locked &&
        !world.hasComponent(entity, "PlatformerInput") &&
        !world.hasComponent(entity, "BeltInput") &&
        world.hasComponent(entity, "Velocity")
      ) {
        const vel = world.getMutableComponent(entity, "Velocity") as
          | { vx: number }
          | undefined;
        if (vel) vel.vx *= 0.85;
      }

      const health = world.getComponent(entity, "Health") as
        | { invulnerableRemaining?: number }
        | undefined;
      const invuln = health?.invulnerableRemaining ?? 0;

      if (invuln > 0 && world.hasComponent(entity, "Render")) {
        reaction.blinkElapsed += dt;
        const cycle = half > 0 ? Math.floor(reaction.blinkElapsed / half) : 0;
        const visible = cycle % 2 === 0;
        const render = world.getMutableComponent(entity, "Render") as
          | { opacity?: number }
          | undefined;
        if (render) {
          const nextOpacity = visible ? 1 : 0.35;
          if (render.opacity !== nextOpacity) render.opacity = nextOpacity;
        }
      } else if (world.hasComponent(entity, "Render")) {
        const render = world.getComponent(entity, "Render") as
          | { opacity?: number }
          | undefined;
        if (render && render.opacity !== undefined && render.opacity !== 1) {
          const mut = world.getMutableComponent(entity, "Render") as
            | { opacity?: number }
            | undefined;
          if (mut) mut.opacity = 1;
        }
      }
    }
  }

  private tickInvulnerability(
    world: World<CoreComponentRegistry>,
    dt: number
  ): void {
    const entities = world.query("Health");
    const len = entities.length;
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const health = world.getComponent(entity, "Health") as
        | { invulnerableRemaining?: number }
        | undefined;
      if (!health || health.invulnerableRemaining === undefined) continue;
      if (health.invulnerableRemaining <= 0) continue;

      const next = Math.max(0, health.invulnerableRemaining - dt);
      if (next === health.invulnerableRemaining) continue;

      const mut = world.getMutableComponent(entity, "Health") as
        | { invulnerableRemaining?: number }
        | undefined;
      if (mut) mut.invulnerableRemaining = next;
    }
  }
}

export function isPlayerControlLocked(
  world: World<CoreComponentRegistry>,
  entity: Entity
): boolean {
  const reaction = world.getComponent(entity, "HitReaction") as
    | HitReactionComponent
    | undefined;
  return !!reaction &&
    (reaction.hitstunRemaining > 0 || (reaction.staggerRemaining ?? 0) > 0);
}

export function canTakeDamage(
  world: World<CoreComponentRegistry>,
  entity: Entity
): boolean {
  const health = world.getComponent(entity, "Health") as
    | { current?: number; invulnerableRemaining?: number }
    | undefined;
  if (!health) return false;
  if (health.current !== undefined && health.current <= 0) return false;
  if (
    health.invulnerableRemaining !== undefined &&
    health.invulnerableRemaining > 0
  ) {
    return false;
  }
  if (world.hasComponent(entity, "Dead")) return false;
  return true;
}
