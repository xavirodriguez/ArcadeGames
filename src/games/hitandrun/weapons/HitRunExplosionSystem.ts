import {
  System,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import type { EventBus } from "@tiny-aster/core";
import type {
  CombatExplosionPayload,
  ExplosivePayloadComponent
} from "./HitRunWeaponTypes";

/**
 * Payload mínimo de combat:hit que necesitamos (alineado con CombatSystem).
 */
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
 * Flujo:
 *  1. CombatSystem aplica daño del cohete y consumption: "remove-component"
 *     (quita Damage, el proyectil puede seguir vivo un frame).
 *  2. Este sistema ve combat:hit con category "explosive" y source con ExplosivePayload.
 *  3. Emite combat:explosion (deferred) y marca payload.detonated.
 *  4. En el mismo o siguiente flush, resuelve AOE: enemigos en radio reciben
 *     daño vía mutate Health + combat:hit/death diferidos (sin tocar CombatSystem).
 *
 * Alternativa: escuchar solo combat:explosion si otro sistema lo emite.
 */
export class HitRunExplosionSystem extends System<CoreComponentRegistry> {
  private subscribed = false;
  private pendingHits: CombatHitLike[] = [];
  private pendingExplosions: CombatExplosionPayload[] = [];

  // Scratch para queries de enemigos (reutilizado)
  private scratchTargets: number[] = [];

  public subscribe(eventBus: EventBus): void {
    if (this.subscribed) return;
    this.subscribed = true;

    eventBus.on("combat:hit" as any, (payload: unknown) => {
      this.pendingHits.push(payload as CombatHitLike);
    });

    eventBus.on("combat:explosion" as any, (payload: unknown) => {
      this.pendingExplosions.push(payload as CombatExplosionPayload);
    });
  }

  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    // 1) Convertir hits explosivos en eventos de explosión
    if (this.pendingHits.length > 0) {
      this.detonateFromHits(world);
      this.pendingHits.length = 0;
    }

    // 2) Resolver AOE de explosiones pendientes
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

      const payload = world.getComponent(source, "ExplosivePayload" as any) as
        | ExplosivePayloadComponent
        | undefined;
      if (!payload || payload.detonated) continue;

      const transform = world.getComponent(source, "Transform");
      if (!transform) continue;

      // Marcar detonado (evitar doble cadena)
      const mut = world.getMutableComponent(source, "ExplosivePayload" as any) as
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
        bus.emitDeferred("combat:explosion" as any, explosion);
      }
      // También encolar local por si el flush de deferred es al final del frame
      this.pendingExplosions.push(explosion);

      // Reclaim del proyectil tras detonación (diferido)
      world.getCommandBuffer().removeEntity(source);
    }
  }

  private resolveExplosions(world: World<CoreComponentRegistry>): void {
    const bus = world.getEventBus();
    const len = this.pendingExplosions.length;

    for (let i = 0; i < len; i++) {
      const boom = this.pendingExplosions[i];
      const r2 = boom.radius * boom.radius;

      // Candidatos: entidades con Health + Faction enemy (o Hurtbox)
      this.scratchTargets.length = 0;
      const enemies = world.query("Health", "Transform");
      const eLen = enemies.length;

      for (let e = 0; e < eLen; e++) {
        const entity = enemies[e];
        if (boom.projectileEntity !== undefined && entity === boom.projectileEntity) {
          continue;
        }
        // No dañar al shooter aliado si comparte faction player
        const faction = world.getComponent(entity, "Faction" as any) as
          | { faction?: string }
          | undefined;
        if (faction?.faction === "player") continue;

        if (world.hasComponent(entity, "Dead" as any)) continue;

        const tr = world.getComponent(entity, "Transform");
        if (!tr) continue;

        const ex = tr.worldX ?? tr.x;
        const ey = tr.worldY ?? tr.y;
        const dx = ex - boom.x;
        const dy = ey - boom.y;
        if (dx * dx + dy * dy > r2) continue;

        this.scratchTargets.push(entity);
      }

      // Aplicar daño AOE (misma semántica que CombatSystem, sin tocarlo)
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
          bus.emitDeferred("combat:hit" as any, {
            targetEntity: target,
            sourceEntity: boom.sourceEntity,
            amount: boom.damage,
            remainingHealth: next,
            category: boom.category
          });

          if (next <= 0) {
            world.getCommandBuffer().addComponent(target, { type: "Dead" } as any);
            bus.emitDeferred("combat:death" as any, {
              entity: target,
              sourceEntity: boom.sourceEntity,
              category: boom.category
            });
          }
        }
      }

      // SFX de explosión (solo presentación)
      if (!world.isReSimulating && bus) {
        bus.emit("PlaySFX" as any, { name: "explosion_large" });
      }
    }
  }
}
