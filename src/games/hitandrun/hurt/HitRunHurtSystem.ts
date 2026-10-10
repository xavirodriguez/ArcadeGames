import {
  System,
  World,
  CoreComponentRegistry,
  Entity
} from "@tiny-aster/core";
import type { EventBus } from "@tiny-aster/core";
import type { CombatHitPayload } from "../systems/HitRunFeedbackTypes";
import {
  DEFAULT_HIT_REACTION_CONFIG,
  HIT_REACTION_CONFIG_RESOURCE,
  type HitReactionComponent,
  type HitReactionConfig
} from "./HitReactionTypes";

/**
 * HitRunHurtSystem — Paso C.
 *
 * Listens combat:hit (from melee, CombatSystem, etc.):
 * - Knockback on target (direction away from source).
 * - Player only: invulnerability (Health.invulnerableRemaining) + hitstun.
 * - Enemies: knockback + hitstun.
 *
 * Ticks hitstun and invuln blink on HitReaction + Render.opacity.
 * Does not apply damage (already applied by the source system).
 */
export class HitRunHurtSystem extends System<CoreComponentRegistry> {
  private subscribed = false;
  private pendingHits: CombatHitPayload[] = [];

    // TODO(refactor): código duplicado detectado (método) con hitandrun/weapons/HitRunExplosionSystem.ts:42-49. Considerar extraer a función compartida. Ref: cefe2a6c
public subscribe(eventBus: EventBus): void {
    if (this.subscribed) return;
    this.subscribed = true;
    eventBus.on("combat:hit", (payload: unknown) => {
      this.pendingHits.push(payload as CombatHitPayload);
    });
  }

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
      const target = hit.targetEntity;
      if (!world.hasEntity(target)) continue;

      if (this.isPlayer(world, target)) {
        this.applyPlayerReaction(world, target, hit, config);
      } else {
        this.applyEnemyReaction(world, target, hit, config);
      }
    }
  }

  private isPlayer(world: World<CoreComponentRegistry>, entity: Entity): boolean {
    if (world.hasComponent(entity, "PlatformerInput")) return true;
    const faction = world.getComponent(entity, "Faction") as
      | { value?: string; faction?: string }
      | undefined;
    return faction?.value === "player" || faction?.faction === "player";
  }

  private applyPlayerReaction(
    world: World<CoreComponentRegistry>,
    target: Entity,
    hit: CombatHitPayload,
    config: HitReactionConfig
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

    this.applyKnockback(
      world,
      target,
      hit.sourceEntity,
      config.playerKnockbackX,
      config.playerKnockbackY
    );

    if (health) {
      const mutH = world.getMutableComponent(target, "Health") as
        | { invulnerableRemaining?: number }
        | undefined;
      if (mutH) {
        mutH.invulnerableRemaining = config.playerInvulnSeconds;
      }
    }

    this.ensureHitReaction(world, target, config.playerHitstunSeconds);

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
    config: HitReactionConfig
  ): void {
    this.applyKnockback(
      world,
      target,
      hit.sourceEntity,
      config.enemyKnockbackX,
      config.enemyKnockbackY
    );
    this.ensureHitReaction(world, target, config.playerHitstunSeconds);
  }

  private applyKnockback(
    world: World<CoreComponentRegistry>,
    target: Entity,
    sourceEntity: Entity | undefined,
    knockX: number,
    knockY: number
  ): void {
    if (!world.hasComponent(target, "Velocity")) return;

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

    const vel = world.getMutableComponent(target, "Velocity") as
      | { vx: number; vy: number }
      | undefined;
    if (vel) {
      vel.vx = dir * knockX;
      vel.vy = -Math.abs(knockY);
    }
  }

  private ensureHitReaction(
    world: World<CoreComponentRegistry>,
    entity: Entity,
    hitstunSeconds: number
  ): void {
    if (world.hasComponent(entity, "HitReaction")) {
      const mut = world.getMutableComponent(entity, "HitReaction") as
        | HitReactionComponent
        | undefined;
      if (mut) {
        mut.hitstunRemaining = Math.max(mut.hitstunRemaining, hitstunSeconds);
        mut.blinkElapsed = 0;
      }
      return;
    }

    world.getCommandBuffer().addComponent(entity, {
      type: "HitReaction",
      hitstunRemaining: hitstunSeconds,
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

      if (reaction.hitstunRemaining > 0) {
        reaction.hitstunRemaining = Math.max(0, reaction.hitstunRemaining - dt);
        // Zero horizontal input-like velocity damping while stunned (enemies)
        if (
          reaction.hitstunRemaining > 0 &&
          !world.hasComponent(entity, "PlatformerInput") &&
          world.hasComponent(entity, "Velocity")
        ) {
          const vel = world.getMutableComponent(entity, "Velocity") as
            | { vx: number }
            | undefined;
          if (vel) vel.vx *= 0.85;
        }
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
          if (render.opacity !== nextOpacity) {
            render.opacity = nextOpacity;
          }
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
  return !!reaction && reaction.hitstunRemaining > 0;
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
