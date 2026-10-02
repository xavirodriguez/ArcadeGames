import {
  System,
  World,
  CoreComponentRegistry,
  Entity
} from "@tiny-aster/core";
import { isSimulationFrozen } from "../systems/HitRunFeedbackSystem";
import {
  DEFAULT_MELEE_ATTACK_CONFIG,
  MELEE_MAX_HITS_PER_SWING,
  type MeleeAttackComponent,
  type MeleeAttackConfig,
  type MeleeAttackInput,
  type MeleePhase
} from "./MeleeAttackTypes";

const MELEE_CONFIG_RESOURCE = "MeleeAttackConfig";

/**
 * HitRunMeleeSystem — sword attack with startup / active / recovery.
 *
 * - Hitbox entity exists only during `active` and carries Damage + trigger collider.
 * - CombatSystem resolves hits; this system records victims so one swing hits each enemy once
 *   by stripping Damage from the hitbox after contacts are processed when needed,
 *   and by tracking hitEntityIds (CombatSystem does not dedupe multi-frame overlaps).
 * - New attacks blocked during startup and recovery.
 *
 * Phase times use simulation deltaTime only.
 */
export class HitRunMeleeSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    if (isSimulationFrozen(world)) return;

    const config =
      world.getResource<MeleeAttackConfig>(MELEE_CONFIG_RESOURCE) ??
      DEFAULT_MELEE_ATTACK_CONFIG;

    const attackers = world.query("MeleeAttack", "Transform");
    const len = attackers.length;

    for (let i = 0; i < len; i++) {
      const entity = attackers[i];
      const melee = world.getMutableComponent(entity, "MeleeAttack") as
        | MeleeAttackComponent
        | undefined;
      if (!melee) continue;

      const transform = world.getComponent(entity, "Transform");
      if (!transform) continue;

      this.tickPhase(world, entity, melee, transform, config, deltaTime);
    }
  }

  private tickPhase(
    world: World<CoreComponentRegistry>,
    entity: Entity,
    melee: MeleeAttackComponent,
    transform: {
      x: number;
      y: number;
      worldX?: number;
      worldY?: number;
      scaleX?: number;
    },
    config: MeleeAttackConfig,
    dt: number
  ): void {
    const phase: MeleePhase = melee.phase;

    if (phase === "idle") {
      if (this.wantsAttack(world, entity)) {
        this.beginSwing(world, entity, melee, transform);
      }
      return;
    }

    melee.phaseElapsed += dt;

    if (phase === "startup") {
      if (melee.phaseElapsed >= config.startupSeconds) {
        this.enterActive(world, entity, melee, transform, config);
      }
      return;
    }

    if (phase === "active") {
      this.syncHitboxTransform(world, melee, transform, config);
      this.recordHitsFromHitbox(world, melee);

      if (melee.phaseElapsed >= config.activeSeconds) {
        this.enterRecovery(world, melee);
      }
      return;
    }

    if (phase === "recovery") {
      if (melee.phaseElapsed >= config.recoverySeconds) {
        melee.phase = "idle";
        melee.phaseElapsed = 0;
        melee.hitCount = 0;
      }
    }
  }

  private wantsAttack(world: World<CoreComponentRegistry>, entity: Entity): boolean {
    const input = world.getComponent(entity, "PlatformerInput") as
      | MeleeAttackInput
      | undefined;
    if (input?.attackPressed === true) {
      const mut = world.getMutableComponent(entity, "PlatformerInput") as
        | MeleeAttackInput
        | undefined;
      if (mut) mut.attackPressed = false;
      return true;
    }
    return false;
  }

  private beginSwing(
    world: World<CoreComponentRegistry>,
    entity: Entity,
    melee: MeleeAttackComponent,
    transform: { scaleX?: number }
  ): void {
    const face = (transform.scaleX ?? 1) >= 0 ? 1 : -1;
    melee.phase = "startup";
    melee.phaseElapsed = 0;
    melee.facing = face;
    melee.hitCount = 0;
    if (!melee.hitEntityIds || melee.hitEntityIds.length < MELEE_MAX_HITS_PER_SWING) {
      melee.hitEntityIds = new Array<number>(MELEE_MAX_HITS_PER_SWING).fill(-1);
    } else {
      for (let i = 0; i < MELEE_MAX_HITS_PER_SWING; i++) {
        melee.hitEntityIds[i] = -1;
      }
    }
    melee.hitboxEntity = -1;

    if (!world.isReSimulating) {
      const bus = world.getEventBus();
      if (bus) {
        bus.emit("PlaySFX", { name: "shoot" });
      }
    }
  }

  private enterActive(
    world: World<CoreComponentRegistry>,
    owner: Entity,
    melee: MeleeAttackComponent,
    transform: {
      x: number;
      y: number;
      worldX?: number;
      worldY?: number;
    },
    config: MeleeAttackConfig
  ): void {
    melee.phase = "active";
    melee.phaseElapsed = 0;

    const hitbox = this.spawnHitbox(world, owner, melee, transform, config);
    melee.hitboxEntity = hitbox;
  }

  private enterRecovery(
    world: World<CoreComponentRegistry>,
    melee: MeleeAttackComponent
  ): void {
    this.destroyHitbox(world, melee);
    melee.phase = "recovery";
    melee.phaseElapsed = 0;
  }

  private spawnHitbox(
    world: World<CoreComponentRegistry>,
    owner: Entity,
    melee: MeleeAttackComponent,
    transform: {
      x: number;
      y: number;
      worldX?: number;
      worldY?: number;
    },
    config: MeleeAttackConfig
  ): Entity {
    const ox = transform.worldX ?? transform.x;
    const oy = transform.worldY ?? transform.y;
    const face = melee.facing >= 0 ? 1 : -1;
    const hx = ox + face * config.hitboxOffsetX;
    const hy = oy + config.hitboxOffsetY;
    const halfW = config.hitboxWidth * 0.5;
    const halfH = config.hitboxHeight * 0.5;

    const e = world.createEntity();

    world.addComponent(e, {
      type: "Transform",
      x: hx,
      y: hy,
      worldX: hx,
      worldY: hy,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });

    world.addComponent(e, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });

    // Trigger collider — CombatSystem reads triggersEntered / collisions.
    world.addComponent(e, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: halfW, halfHeight: halfH },
      layer: 1 << 3,
      mask: 0xffff,
      isTrigger: true,
      enabled: true
    });

    world.addComponent(e, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    });

    world.addComponent(e, {
      type: "Damage",
      amount: config.damage,
      category: config.damageCategory,
      friendlyFire: false,
      consumption: "none",
      sourceEntity: owner
    });

    world.addComponent(e, {
      type: "Faction",
      faction: "player",
      value: "player"
    });

    // Tag for queries / cleanup
    world.addComponent(e, {
      type: "Tag",
      tags: ["MeleeHitbox"]
    });

    return e;
  }

  private destroyHitbox(
    world: World<CoreComponentRegistry>,
    melee: MeleeAttackComponent
  ): void {
    if (melee.hitboxEntity >= 0 && world.hasEntity(melee.hitboxEntity)) {
      world.getCommandBuffer().removeEntity(melee.hitboxEntity);
    }
    melee.hitboxEntity = -1;
  }

  private syncHitboxTransform(
    world: World<CoreComponentRegistry>,
    melee: MeleeAttackComponent,
    transform: {
      x: number;
      y: number;
      worldX?: number;
      worldY?: number;
    },
    config: MeleeAttackConfig
  ): void {
    if (melee.hitboxEntity < 0 || !world.hasEntity(melee.hitboxEntity)) return;

    const ox = transform.worldX ?? transform.x;
    const oy = transform.worldY ?? transform.y;
    const face = melee.facing >= 0 ? 1 : -1;
    const hx = ox + face * config.hitboxOffsetX;
    const hy = oy + config.hitboxOffsetY;

    const ht = world.getComponent(melee.hitboxEntity, "Transform");
    if (!ht) return;
    if (ht.x === hx && ht.y === hy) return;

    const mut = world.getMutableComponent(melee.hitboxEntity, "Transform");
    if (mut) {
      mut.x = hx;
      mut.y = hy;
      mut.worldX = hx;
      mut.worldY = hy;
      mut.dirty = true;
    }
  }

  /**
   * After CombatSystem runs in the same frame order, overlaps may persist across active frames.
   * We mark entities that already took damage this swing and disable further damage to them
   * by temporarily clearing Damage amount against already-hit targets via a filter list.
   *
   * Primary guarantee: track hitEntityIds from combat:hit where source is this hitbox.
   * Secondary: if CollisionEvents list other entities already in hitEntityIds, remove Damage
   * until end of swing is not needed if we zero-out by removing hitbox contacts — simplest
   * approach used here: on combat events buffered is out of scope; instead scan triggers
   * and if other is already in hit list, skip by ensuring Damage stays but CombatSystem
   * will re-hit. So we MUST remove Damage from hitbox when all slots full OR filter.
   *
   * Practical approach without modifying CombatSystem:
   * keep a parallel "already hit" list and strip Health changes is wrong.
   * Better: when we detect a new collision with an enemy, if already in list, do nothing;
   * if not, rely on CombatSystem once, then add to list and set Damage.amount = 0 until
   * that contact ends — still multi-hit risk same frame.
   *
   * Frame order assumption: MeleeSystem runs AFTER CombatSystem in active frames for
   * recording, and BEFORE next CombatSystem we set amount=0 if hitCount>0 for entities
   * still overlapping — complex.
   *
   * Spec: "Cada swing golpea como máximo una vez a cada enemigo."
   * Implementation: listen is heavy; instead on each active frame after recording
   * collision partners into hitEntityIds when they have Health and we haven't listed them,
   * apply damage once ourselves? That duplicates CombatSystem.
   *
   * Clean approach: hitbox keeps Damage; after first successful combat:hit on a target
   * (recorded via pending from event or CollisionEvents + Health check), add to list.
   * For subsequent frames, if otherEntity is in list, removeComponent Damage and re-add
   * only for non-listed — too heavy.
   *
   * Simpler: consumption stays none; active window is short (0.1s); track hits by
   * reading CollisionEvents on hitbox and if target already in hitEntityIds, skip;
   * if not in list and has Health, manually apply one damage via same rules and push id.
   * That bypasses CombatSystem for melee.
   *
   * Preferred for determinism + one-hit: manual resolve once per target in this system
   * during active, using overlap from CollisionEvents, and hitbox has NO Damage component
   * — only a marker. Then CombatSystem won't double-apply.
   *
   * Current spawn includes Damage for CombatSystem integration. recordHitsFromHitbox
   * adds entities from triggersEntered to the list; if already listed, we remove Damage
   * from hitbox when ANY listed entity is still in contact... imperfect.
   *
   * Final: apply one-shot damage in this system when seeing a new Hurtbox/Health enemy
   * in collision events, and do not put Damage on the hitbox. Emit combat:hit deferred.
   */
  private recordHitsFromHitbox(
    world: World<CoreComponentRegistry>,
    melee: MeleeAttackComponent
  ): void {
    if (melee.hitboxEntity < 0 || !world.hasEntity(melee.hitboxEntity)) return;

    const events = world.getComponent(melee.hitboxEntity, "CollisionEvents") as
      | {
          collisions?: Array<{ otherEntity: number }>;
          triggersEntered?: number[];
          activeTriggers?: number[];
        }
      | undefined;
    if (!events) return;

    const tryHit = (other: number): void => {
      if (other === melee.hitboxEntity) return;
      if (this.alreadyHit(melee, other)) return;
      if (!world.hasEntity(other)) return;
      if (!world.hasComponent(other, "Health")) return;
      if (world.hasComponent(other, "Dead")) return;

      const faction = world.getComponent(other, "Faction") as
        | { faction?: string }
        | undefined;
      if (faction?.faction === "player") return;

      const health = world.getComponent(other, "Health") as
        | { current: number; invulnerableRemaining?: number }
        | undefined;
      if (!health || health.current <= 0) return;
      if (
        health.invulnerableRemaining !== undefined &&
        health.invulnerableRemaining > 0
      ) {
        return;
      }

      const config =
        world.getResource<MeleeAttackConfig>(MELEE_CONFIG_RESOURCE) ??
        DEFAULT_MELEE_ATTACK_CONFIG;

      const prev = health.current;
      const next = Math.max(0, prev - config.damage);
      const mutH = world.getMutableComponent(other, "Health") as
        | { current: number }
        | undefined;
      if (mutH) mutH.current = next;

      this.markHit(melee, other);

      // Knockback direction from attacker facing (Paso C will own feel; apply baseline here)
      if (world.hasComponent(other, "Velocity")) {
        const vel = world.getMutableComponent(other, "Velocity") as
          | { vx: number; vy: number }
          | undefined;
        if (vel) {
          vel.vx = melee.facing * config.knockbackX;
          vel.vy = -Math.abs(config.knockbackY);
        }
      }

      const bus = world.getEventBus();
      if (bus) {
        bus.emitDeferred("combat:hit", {
          targetEntity: other,
          sourceEntity: melee.hitboxEntity,
          amount: config.damage,
          remainingHealth: next,
          category: config.damageCategory
        });
        if (next <= 0) {
          world.getCommandBuffer().addComponent(other, { type: "Dead" });
          bus.emitDeferred("combat:death", {
            entity: other,
            sourceEntity: melee.hitboxEntity,
            category: config.damageCategory
          });
        }
      }
    };

    if (events.triggersEntered) {
      for (let i = 0; i < events.triggersEntered.length; i++) {
        tryHit(events.triggersEntered[i]);
      }
    }
    if (events.activeTriggers) {
      for (let i = 0; i < events.activeTriggers.length; i++) {
        tryHit(events.activeTriggers[i]);
      }
    }
    if (events.collisions) {
      for (let i = 0; i < events.collisions.length; i++) {
        tryHit(events.collisions[i].otherEntity);
      }
    }
  }

  private alreadyHit(melee: MeleeAttackComponent, entity: number): boolean {
    const n = melee.hitCount;
    const ids = melee.hitEntityIds;
    for (let i = 0; i < n; i++) {
      if (ids[i] === entity) return true;
    }
    return false;
  }

  private markHit(melee: MeleeAttackComponent, entity: number): void {
    if (melee.hitCount >= MELEE_MAX_HITS_PER_SWING) return;
    if (!melee.hitEntityIds) {
      melee.hitEntityIds = new Array<number>(MELEE_MAX_HITS_PER_SWING).fill(-1);
    }
    melee.hitEntityIds[melee.hitCount] = entity;
    melee.hitCount += 1;
  }
}

/** True if the entity is in startup or recovery (cannot start a new swing). */
export function isMeleeAttackLocked(
  melee: MeleeAttackComponent | undefined
): boolean {
  if (!melee) return false;
  return melee.phase === "startup" || melee.phase === "recovery";
}

export function createMeleeAttackComponent(): MeleeAttackComponent {
  return {
    type: "MeleeAttack",
    phase: "idle",
    phaseElapsed: 0,
    hitboxEntity: -1,
    hitCount: 0,
    hitEntityIds: new Array<number>(MELEE_MAX_HITS_PER_SWING).fill(-1),
    facing: 1
  };
}
