import {
  System,
  World,
  CoreComponentRegistry,
  Entity
} from "@tiny-aster/core";
import { isSimulationFrozen } from "../systems/HitRunFeedbackSystem";
import { isPlayerControlLocked } from "../hurt/HitRunHurtSystem";
import {
  DEFAULT_MELEE_ATTACK_CONFIG,
  MELEE_MAX_HITS_PER_SWING,
  type MeleeAttackComponent,
  type MeleeAttackConfig,
  type MeleeAttackInput,
  type MeleePhase
} from "./MeleeAttackTypes";

const MELEE_CONFIG_RESOURCE = "MeleeAttackConfig";

export class HitRunMeleeSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    if (isSimulationFrozen(world)) return;

    const defaultConfig =
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

      const config = melee.customConfig ?? defaultConfig;
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
        this.beginSwing(world, melee, transform);
      }
      return;
    }

    melee.phaseElapsed += dt;

    if (phase === "startup") {
      this.applyWarningColor(world, entity, melee);
      if (melee.phaseElapsed >= config.startupSeconds) {
        this.enterActive(world, entity, melee, transform, config);
      }
      return;
    }

    if (phase === "active") {
      this.syncHitboxTransform(world, melee, transform, config);
      this.recordHitsFromHitbox(world, entity, melee, config);

      if (melee.phaseElapsed >= config.activeSeconds) {
        this.enterRecovery(world, entity, melee);
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
    if (isPlayerControlLocked(world, entity)) return false;

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

  private applyWarningColor(
    world: World<CoreComponentRegistry>,
    entity: Entity,
    melee: MeleeAttackComponent
  ): void {
    if (melee.warningColor && world.hasComponent(entity, "Render")) {
      const render = world.getMutableComponent(entity, "Render") as
        | { color?: string }
        | undefined;
      if (render) {
        if (melee.baseColor === undefined && render.color !== undefined) {
          melee.baseColor = render.color;
        }
        render.color = melee.warningColor;
      }
    }
  }

  private restoreRenderColor(
    world: World<CoreComponentRegistry>,
    entity: Entity,
    melee: MeleeAttackComponent
  ): void {
    if (melee.baseColor !== undefined && world.hasComponent(entity, "Render")) {
      const render = world.getMutableComponent(entity, "Render") as
        | { color?: string }
        | undefined;
      if (render) {
        render.color = melee.baseColor;
      }
      melee.baseColor = undefined;
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
    this.restoreRenderColor(world, owner, melee);
    melee.phase = "active";
    melee.phaseElapsed = 0;
    melee.hitboxEntity = this.spawnHitbox(world, owner, melee, transform, config);
  }

  private enterRecovery(
    world: World<CoreComponentRegistry>,
    owner: Entity,
    melee: MeleeAttackComponent
  ): void {
    this.restoreRenderColor(world, owner, melee);
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

    const ownerFaction =
      melee.ownerFaction ??
      (world.getComponent(owner, "Faction") as { value?: string } | undefined)?.value ??
      "player";

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

    world.addComponent(e, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: halfW, halfHeight: halfH },
      layer: ownerFaction === "player" ? 1 << 3 : 1 << 4,
      mask: 0xffff,
      offsetX: 0,
      offsetY: 0,
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
      type: "Faction",
      value: ownerFaction
    });

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
    if (!ht || (ht.x === hx && ht.y === hy)) return;

    const mut = world.getMutableComponent(melee.hitboxEntity, "Transform");
    if (mut) {
      mut.x = hx;
      mut.y = hy;
      mut.worldX = hx;
      mut.worldY = hy;
      mut.dirty = true;
    }
  }

  private recordHitsFromHitbox(
    world: World<CoreComponentRegistry>,
    owner: Entity,
    melee: MeleeAttackComponent,
    config: MeleeAttackConfig
  ): void {
    if (melee.hitboxEntity < 0 || !world.hasEntity(melee.hitboxEntity)) return;

    const ownerFactionVal =
      melee.ownerFaction ??
      (world.getComponent(owner, "Faction") as { value?: string } | undefined)?.value ??
      "player";

    const events = world.getComponent(melee.hitboxEntity, "CollisionEvents") as
      | {
          collisions?: Array<{ otherEntity: number }>;
          triggersEntered?: number[];
          activeTriggers?: number[];
        }
      | undefined;
    if (!events) return;

    const tryHit = (other: number): void => {
      if (other === melee.hitboxEntity || other === owner) return;
      if (this.alreadyHit(melee, other)) return;
      if (!world.hasEntity(other)) return;
      if (!world.hasComponent(other, "Health")) return;
      if (world.hasComponent(other, "Dead")) return;

      const targetFaction = world.getComponent(other, "Faction") as
        | { value?: string }
        | undefined;
      if (targetFaction && targetFaction.value === ownerFactionVal) return;

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

      const prev = health.current;
      const next = Math.max(0, prev - config.damage);
      const mutH = world.getMutableComponent(other, "Health") as
        | { current: number }
        | undefined;
      if (mutH) mutH.current = next;

      this.markHit(melee, other);

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
          sourceEntity: owner,
          amount: config.damage,
          remainingHealth: next,
          category: config.damageCategory
        });
        if (next <= 0) {
          world.getCommandBuffer().addComponent(other, { type: "Dead" });
          bus.emitDeferred("combat:death", {
            entity: other,
            sourceEntity: owner,
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
