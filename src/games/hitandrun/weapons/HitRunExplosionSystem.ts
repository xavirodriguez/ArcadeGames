import {
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import type { EventBus } from "@tiny-aster/core";
import type {
  CombatExplosionPayload,
  ExplosivePayloadComponent
} from "./HitRunWeaponTypes";
import { CombatHitListenerSystem } from "../combat/CombatHitListenerSystem";

interface CombatHitLike {
  targetEntity: number;
  sourceEntity?: number;
  category?: string;
}

/**
 * HitRunExplosionSystem — cadena radial del lanzacohetes.
 *
 * Fase: SystemPhase.GameRules (después de CombatSystem en el tick).
 *
 * Unificado para utilizar únicamente combat:explosion emitido diferidamente o
 * derivado de combat:hit sin mantener colas duplicadas.
 */
export class HitRunExplosionSystem extends CombatHitListenerSystem<CombatHitLike> {
  private pendingExplosions: CombatExplosionPayload[] = [];
  private scratchTargets: number[] = [];

  protected override onSubscribe(eventBus: EventBus): void {
    eventBus.on("combat:explosion", (payload: unknown) => {
      this.pendingExplosions.push(payload as CombatExplosionPayload);
    });
  }

  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    // 1) Convertir hits explosivos en eventos de explosión (emitidos deferred al event bus)
    if (this.pendingHits.length > 0) {
      this.detonateFromHits(world);
      this.pendingHits.length = 0;
    }

    // 2) Resolver AOE de explosiones pendientes recibidas vía canal combat:explosion
    if (this.pendingExplosions.length > 0) {
      this.resolveExplosions(world);
      this.pendingExplosions.length = 0;
    }
  }

  private detonateFromHits(world: World<CoreComponentRegistry>): void {
    const bus = world.getEventBus();
    const len = this.pendingHits.length;

    for (let i = 0; i < len; i++) {
      const hit = this.pendingHits[i];
      if (hit.category !== "explosive") continue;

      const source = hit.sourceEntity;
      if (source === undefined || !world.hasEntity(source)) continue;

      const payload = world.getComponent(source, "ExplosivePayload") as
        | ExplosivePayloadComponent
        | undefined;
      if (!payload || payload.detonated) continue;

      const transform = world.getComponent(source, "Transform");
      if (!transform) continue;

      const mut = world.getMutableComponent(source, "ExplosivePayload") as
        | ExplosivePayloadComponent
        | undefined;
      if (mut) {
        mut.detonated = true;
      }

      const explosion: CombatExplosionPayload = {
        x: transform.worldX ?? transform.x,
        y: transform.worldY ?? transform.y,
        radius: payload.radius,
        damage: payload.damage,
        sourceEntity: source,
        projectileEntity: source,
        category: "explosive"
      };

      if (bus) {
        bus.emitDeferred("combat:explosion", explosion);
      } else {
        this.pendingExplosions.push(explosion);
      }

      world.getCommandBuffer().removeEntity(source);
    }
  }

  private resolveExplosions(world: World<CoreComponentRegistry>): void {
    const bus = world.getEventBus();
    const len = this.pendingExplosions.length;

    for (let i = 0; i < len; i++) {
      const boom = this.pendingExplosions[i];
      const r2 = boom.radius * boom.radius;

      this.scratchTargets.length = 0;
      const enemies = world.query("Health", "Transform");
      const eLen = enemies.length;

      for (let e = 0; e < eLen; e++) {
        const entity = enemies[e];
        if (boom.projectileEntity !== undefined && entity === boom.projectileEntity) {
          continue;
        }

        // No dañar al shooter ni aliados compartiendo faction player
        const faction = world.getComponent(entity, "Faction") as
          | { faction?: string; value?: string }
          | undefined;
        const factionName = faction?.value ?? faction?.faction;
        if (factionName === "player") continue;

        if (world.hasComponent(entity, "Dead")) continue;

        const tr = world.getComponent(entity, "Transform");
        if (!tr) continue;

        const ex = tr.worldX ?? tr.x;
        const ey = tr.worldY ?? tr.y;
        const dx = ex - boom.x;
        const dy = ey - boom.y;
        if (dx * dx + dy * dy > r2) continue;

        this.scratchTargets.push(entity);
      }

      const tLen = this.scratchTargets.length;
      for (let t = 0; t < tLen; t++) {
        const target = this.scratchTargets[t];
        const health = world.getComponent(target, "Health") as
          | { current: number; invulnerableRemaining?: number }
          | undefined;
        if (!health || health.current <= 0) continue;
        if (health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
          continue;
        }

        const prev = health.current;
        const next = Math.max(0, prev - boom.damage);

        const mutHealth = world.getMutableComponent(target, "Health") as
          | { current: number }
          | undefined;
        if (mutHealth) {
          mutHealth.current = next;
        }

        if (bus) {
          bus.emitDeferred("combat:hit", {
            targetEntity: target,
            sourceEntity: boom.sourceEntity,
            amount: boom.damage,
            remainingHealth: next,
            category: boom.category
          });

          if (next <= 0) {
            world.getCommandBuffer().addComponent(target, { type: "Dead" });
            bus.emitDeferred("combat:death", {
              entity: target,
              sourceEntity: boom.sourceEntity,
              category: boom.category
            });
          }
        }
      }

      if (!world.isReSimulating && bus) {
        bus.emit("PlaySFX", { name: "explosion_large" });
      }
    }
  }
}
