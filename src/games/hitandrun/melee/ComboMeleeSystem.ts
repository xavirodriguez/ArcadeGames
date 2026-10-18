/**
 * ComboMeleeSystem — jab chain + throw + special on top of HitRunMeleeSystem.
 * Runs just before melee so customConfig is set when the swing starts.
 */

import {
  System,
  World,
  CoreComponentRegistry,
  Entity
} from "@tiny-aster/core";
import { isSimulationFrozen } from "../systems/HitRunFeedbackSystem";
import { isPlayerControlLocked } from "../hurt/HitRunHurtSystem";
import { depthZOverlap } from "../combat/HitVolume";
import { applyBeltElevationKnockback } from "../belt/BeltElevationComponent";
import type { BeltInputComponent } from "../belt/BeltMovementTypes";
import type { MeleeAttackComponent } from "./MeleeAttackTypes";
import {
  COMBO_MELEE_CONFIG_RESOURCE,
  DEFAULT_COMBO_MELEE_CONFIG,
  type ComboMeleeComponent,
  type ComboMeleeConfig,
  type ComboStep
} from "./ComboMeleeTypes";

export class ComboMeleeSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    if (isSimulationFrozen(world)) return;

    const config =
      world.getResource<ComboMeleeConfig>(COMBO_MELEE_CONFIG_RESOURCE) ??
      DEFAULT_COMBO_MELEE_CONFIG;

    const entities = world.query("ComboMelee", "MeleeAttack", "Transform");
    for (let i = 0; i < entities.length; i++) {
      this.tickEntity(world, entities[i], config, deltaTime);
    }
  }

  private tickEntity(
    world: World<CoreComponentRegistry>,
    entity: Entity,
    config: ComboMeleeConfig,
    dt: number
  ): void {
    const combo = world.getMutableComponent(entity, "ComboMelee") as
      | ComboMeleeComponent
      | undefined;
    const melee = world.getMutableComponent(entity, "MeleeAttack") as
      | MeleeAttackComponent
      | undefined;
    if (!combo || !melee) return;

    if (combo.chainTimer > 0) {
      combo.chainTimer = Math.max(0, combo.chainTimer - dt);
    }
    if (combo.chainTimer <= 0 && melee.phase === "idle") {
      combo.chainStep = 0;
      combo.activeStep = "idle";
    }

    if (isPlayerControlLocked(world, entity)) return;

    const input = world.getMutableComponent(entity, "BeltInput") as
      | (BeltInputComponent & { specialPressed?: boolean; attackPressed?: boolean })
      | undefined;
    if (!input) return;

    // Special (arcane burst) — independent of melee phase if idle-ish
    if (input.specialPressed) {
      input.specialPressed = false;
      this.doSpecial(world, entity, config);
      combo.activeStep = "special";
      combo.chainStep = 0;
      combo.chainTimer = 0;
      return;
    }

    if (melee.phase !== "idle") return;
    if (!input.attackPressed) return;

    // Prefer throw when a target is in grab range
    if (this.tryThrow(world, entity, config)) {
      input.attackPressed = false;
      combo.activeStep = "throw";
      combo.chainStep = 0;
      combo.chainTimer = 0;
      return;
    }

    const step = this.resolveChainStep(combo);
    const stepConfig =
      step === "jab1"
        ? config.jab1
        : step === "jab2"
          ? config.jab2
          : config.finisher;

    melee.customConfig = stepConfig;
    combo.activeStep = step;
    combo.chainStep = step === "finisher" ? 0 : combo.chainStep + 1;
    combo.chainTimer = config.chainWindowSeconds;
    // attackPressed left true so HitRunMeleeSystem starts the swing
  }

  private resolveChainStep(combo: ComboMeleeComponent): ComboStep {
    if (combo.chainTimer <= 0 || combo.chainStep <= 0) return "jab1";
    if (combo.chainStep === 1) return "jab2";
    return "finisher";
  }

  private tryThrow(
    world: World<CoreComponentRegistry>,
    entity: Entity,
    config: ComboMeleeConfig
  ): boolean {
    const transform = world.getComponent(entity, "Transform") as
      | { x: number; y: number; worldX?: number; worldY?: number; scaleX?: number }
      | undefined;
    if (!transform) return false;

    const ox = transform.worldX ?? transform.x;
    const oy = transform.worldY ?? transform.y;
    const face = (transform.scaleX ?? 1) >= 0 ? 1 : -1;

    const enemies = world.query("Enemy", "Health", "Transform");
    let best: Entity | undefined;
    let bestDist = config.throwRange;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (world.hasComponent(e, "Dead")) continue;
      if (!depthZOverlap(entity, e, world, { halfDepth: 22 })) continue;

      const t = world.getComponent(e, "Transform") as
        | { x: number; y: number; worldX?: number; worldY?: number }
        | undefined;
      if (!t) continue;
      const tx = t.worldX ?? t.x;
      const dx = tx - ox;
      // Prefer targets in front
      if (face > 0 && dx < -4) continue;
      if (face < 0 && dx > 4) continue;
      const dist = Math.abs(dx);
      if (dist > bestDist) continue;
      bestDist = dist;
      best = e;
    }

    if (best === undefined) return false;

    const health = world.getMutableComponent(best, "Health") as
      | { current: number }
      | undefined;
    if (!health || health.current <= 0) return false;

    const next = Math.max(0, health.current - config.throwDamage);
    health.current = next;

    if (world.hasComponent(best, "Velocity")) {
      const vel = world.getMutableComponent(best, "Velocity") as
        | { vx: number }
        | undefined;
      if (vel) vel.vx = face * config.throwKnockbackX;
    }
    applyBeltElevationKnockback(world, best, config.throwKnockbackY);

    // Brief i-frames on thrower
    if (world.hasComponent(entity, "Health")) {
      world.mutateComponent(entity, "Health", (h: { invulnerableRemaining?: number }) => {
        h.invulnerableRemaining = Math.max(
          h.invulnerableRemaining ?? 0,
          config.throwIFramesSeconds
        );
      });
    }

    const bus = world.getEventBus();
    if (bus) {
      bus.emitDeferred("combat:hit", {
        targetEntity: best,
        sourceEntity: entity,
        amount: config.throwDamage,
        remainingHealth: next,
        category: "throw"
      });
      if (next <= 0) {
        world.getCommandBuffer().addComponent(best, { type: "Dead" });
        bus.emitDeferred("combat:death", {
          entity: best,
          sourceEntity: entity,
          category: "throw"
        });
      }
      if (!world.isReSimulating) {
        bus.emit("PlaySFX", { name: "hit" });
      }
    }

    return true;
  }

  private doSpecial(
    world: World<CoreComponentRegistry>,
    entity: Entity,
    config: ComboMeleeConfig
  ): void {
    const transform = world.getComponent(entity, "Transform") as
      | { x: number; y: number; worldX?: number; worldY?: number }
      | undefined;
    if (!transform) return;

    const ox = transform.worldX ?? transform.x;
    const oy = transform.worldY ?? transform.y;

    // Health cost
    const health = world.getMutableComponent(entity, "Health") as
      | { current: number; invulnerableRemaining?: number }
      | undefined;
    if (health) {
      if (health.current <= config.specialHealthCost) return;
      health.current = Math.max(1, health.current - config.specialHealthCost);
      health.invulnerableRemaining = Math.max(
        health.invulnerableRemaining ?? 0,
        config.specialIFramesSeconds
      );
    }

    const enemies = world.query("Enemy", "Health", "Transform");
    const bus = world.getEventBus();
    const r2 = config.specialRadius * config.specialRadius;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (world.hasComponent(e, "Dead")) continue;
      if (!depthZOverlap(entity, e, world, { halfDepth: 28 })) continue;

      const t = world.getComponent(e, "Transform") as
        | { x: number; y: number; worldX?: number; worldY?: number }
        | undefined;
      if (!t) continue;
      const tx = t.worldX ?? t.x;
      const ty = t.worldY ?? t.y;
      const dx = tx - ox;
      const dy = ty - oy;
      if (dx * dx + dy * dy > r2) continue;

      const h = world.getMutableComponent(e, "Health") as
        | { current: number }
        | undefined;
      if (!h || h.current <= 0) continue;

      const next = Math.max(0, h.current - config.specialDamage);
      h.current = next;

      if (world.hasComponent(e, "Velocity")) {
        const vel = world.getMutableComponent(e, "Velocity") as
          | { vx: number }
          | undefined;
        if (vel) vel.vx = (dx >= 0 ? 1 : -1) * 220;
      }
      applyBeltElevationKnockback(world, e, 180);

      if (bus) {
        bus.emitDeferred("combat:hit", {
          targetEntity: e,
          sourceEntity: entity,
          amount: config.specialDamage,
          remainingHealth: next,
          category: "special"
        });
        if (next <= 0) {
          world.getCommandBuffer().addComponent(e, { type: "Dead" });
          bus.emitDeferred("combat:death", {
            entity: e,
            sourceEntity: entity,
            category: "special"
          });
        }
      }
    }

    if (bus && !world.isReSimulating) {
      bus.emit("PlaySFX", { name: "explosion_small" });
    }
  }
}
