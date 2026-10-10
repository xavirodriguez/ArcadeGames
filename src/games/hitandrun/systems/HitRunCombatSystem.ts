import {
  System,
  World,
  WorldUtils,
  Entity,
  EventBus,
  CoreComponentRegistry
} from "@tiny-aster/core";
import { depthZOverlap } from "../combat/HitVolume";

/**
 * HitRunCombatSystem — processes collision contacts for Hit&Run,
 * enforcing depth (Y) and elevation height (Z) overlap filtering via depthZOverlap.
 */
export class HitRunCombatSystem extends System<CoreComponentRegistry> {
  private destroyedEntities = new Set<number>();

  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const entitiesWithEvents = world.query("CollisionEvents");
    this.destroyedEntities.clear();

    const len = entitiesWithEvents.length;

    for (let i = 0; i < len; i++) {
      const entityA = entitiesWithEvents[i];
      const colComp = world.getComponent(entityA, "CollisionEvents") as
        | {
            collisions?: Array<{ otherEntity: number }>;
            triggersEntered?: number[];
          }
        | undefined;
      if (!colComp) continue;

      // Process physical collisions
      if (colComp.collisions) {
        const cLen = colComp.collisions.length;
        for (let j = 0; j < cLen; j++) {
          const entityB = colComp.collisions[j].otherEntity;
          if (entityA >= entityB) continue;
          if (!WorldUtils.isEntityActive(world, entityA) || !WorldUtils.isEntityActive(world, entityB)) continue;
          if (this.destroyedEntities.has(entityA) || this.destroyedEntities.has(entityB)) continue;

          if (!depthZOverlap(entityA, entityB, world, { halfDepth: 20 })) continue;

          this.resolveDamageDirection(world, entityA, entityB);
          this.resolveDamageDirection(world, entityB, entityA);
        }
      }

      // Process trigger entry overlaps (e.g. bullets, rockets, attack triggers)
      if (colComp.triggersEntered) {
        const tLen = colComp.triggersEntered.length;
        for (let j = 0; j < tLen; j++) {
          const entityB = colComp.triggersEntered[j];
          if (!WorldUtils.isEntityActive(world, entityA) || !WorldUtils.isEntityActive(world, entityB)) continue;
          if (this.destroyedEntities.has(entityA) || this.destroyedEntities.has(entityB)) continue;

          if (!depthZOverlap(entityA, entityB, world, { halfDepth: 20 })) continue;

          this.resolveDamageDirection(world, entityA, entityB);
          this.resolveDamageDirection(world, entityB, entityA);
        }
      }
    }
  }

  private resolveDamageDirection(
    world: World<CoreComponentRegistry>,
    attacker: Entity,
    target: Entity
  ): void {
    if (this.destroyedEntities.has(attacker) || this.destroyedEntities.has(target)) return;

    const damageComp = world.getComponent(attacker, "Damage" as any) as
      | { amount: number; category?: string; consumption?: string; friendlyFire?: boolean; sourceEntity?: number }
      | undefined;
    const healthComp = world.getComponent(target, "Health") as
      | { current: number; invulnerableRemaining?: number }
      | undefined;

    if (!damageComp || !healthComp) return;

    // 1. Faction Check (Friendly Fire prevention)
    const factionA = world.getComponent(attacker, "Faction") as
      | { value?: string; faction?: string }
      | undefined;
    const factionB = world.getComponent(target, "Faction") as
      | { value?: string; faction?: string }
      | undefined;

    const factionAVal = factionA?.value ?? factionA?.faction;
    const factionBVal = factionB?.value ?? factionB?.faction;

    if (factionAVal && factionBVal && factionAVal === factionBVal) {
      if (!damageComp.friendlyFire) {
        return;
      }
    }

    // 2. Invulnerability check
    if (healthComp.invulnerableRemaining !== undefined && healthComp.invulnerableRemaining > 0) {
      return;
    }

    // 3. Skip if target is already marked dead
    if (world.hasComponent(target, "Dead")) {
      return;
    }

    // 4. Calculate and apply damage
    const prevHealth = healthComp.current;
    if (prevHealth <= 0) return;

    const dmgAmount = damageComp.amount;
    const nextHealth = Math.max(0, prevHealth - dmgAmount);

    const mutableHealth = world.getMutableComponent(target, "Health") as
      | { current: number }
      | undefined;
    if (mutableHealth) {
      mutableHealth.current = nextHealth;
    }

    const sourceEntity = damageComp.sourceEntity ?? attacker;

    const eventBus = world.getEventBus() as EventBus;
    if (eventBus) {
      eventBus.emitDeferred("combat:hit", {
        targetEntity: target,
        sourceEntity,
        amount: dmgAmount,
        remainingHealth: nextHealth,
        category: damageComp.category ?? "bullet"
      });
    }

    if (nextHealth <= 0) {
      world.getCommandBuffer().addComponent(target, { type: "Dead" });

      if (eventBus) {
        eventBus.emitDeferred("combat:death", {
          entity: target,
          sourceEntity,
          category: damageComp.category ?? "bullet"
        });
      }
    }

    // 5. Apply Damage Component Consumption Policy
    const policy = damageComp.consumption || "destroy-entity";
    if (policy === "destroy-entity") {
      world.reclaimEntity(attacker);
      this.destroyedEntities.add(attacker);
    } else if (policy === "remove-component") {
      world.getCommandBuffer().removeComponent(attacker, "Damage" as any);
    }
  }
}
