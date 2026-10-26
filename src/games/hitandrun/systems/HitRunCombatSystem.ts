import {
  System,
  World,
  WorldUtils,
  Entity,
  EventBus,
  CoreComponentRegistry
} from "@tiny-aster/core";
import { depthZOverlap, DEFAULT_HALF_DEPTH } from "../combat/HitVolume";
import { isFriendly } from "../combat/faction";

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

      if (colComp.collisions) {
        const cLen = colComp.collisions.length;
        for (let j = 0; j < cLen; j++) {
          const entityB = colComp.collisions[j].otherEntity;
          if (entityA >= entityB) continue;
          this.processContactPair(world, entityA, entityB);
        }
      }

      if (colComp.triggersEntered) {
        const tLen = colComp.triggersEntered.length;
        for (let j = 0; j < tLen; j++) {
          const entityB = colComp.triggersEntered[j];
          this.processContactPair(world, entityA, entityB);
        }
      }
    }
  }

  private processContactPair(
    world: World<CoreComponentRegistry>,
    entityA: Entity,
    entityB: Entity
  ): void {
    if (!WorldUtils.isEntityActive(world, entityA) || !WorldUtils.isEntityActive(world, entityB)) return;
    if (this.destroyedEntities.has(entityA) || this.destroyedEntities.has(entityB)) return;

    if (!depthZOverlap(entityA, entityB, world, { halfDepth: DEFAULT_HALF_DEPTH })) return;

    this.resolveDamageDirection(world, entityA, entityB);
    this.resolveDamageDirection(world, entityB, entityA);
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

    const factionA = world.getComponent(attacker, "Faction") as
      | { value?: string; faction?: string }
      | undefined;
    const factionB = world.getComponent(target, "Faction") as
      | { value?: string; faction?: string }
      | undefined;

    if (isFriendly(factionA, factionB, damageComp.friendlyFire === true)) {
      return;
    }

    if (healthComp.invulnerableRemaining !== undefined && healthComp.invulnerableRemaining > 0) {
      return;
    }

    if (world.hasComponent(target, "Dead")) {
      return;
    }

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

    const policy = damageComp.consumption || "destroy-entity";
    if (policy === "destroy-entity") {
      world.reclaimEntity(attacker);
      this.destroyedEntities.add(attacker);
    } else if (policy === "remove-component") {
      world.getCommandBuffer().removeComponent(attacker, "Damage" as any);
    }
  }
}
