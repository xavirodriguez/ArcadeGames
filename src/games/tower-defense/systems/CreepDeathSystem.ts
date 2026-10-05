import { System, SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, TowerDefenseEventRegistry } from "../types/TowerDefenseTypes";

/**
 * Reacts to combat:death (from CombatSystem) and also polls Health as a safety net.
 * Emits creep:killed so GameStateSystem can award gold.
 * Guarantees exactly ONE reward per killed creep.
 */
export class CreepDeathSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  readonly phase = SystemPhase.GameRules;
  private bound = false;
  private unsubDeath?: () => void;
  private killedEntities = new Set<number>();

  update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, _dt: number): void {
    if (!this.bound) {
      this.bind(world);
      this.bound = true;
    }

    const creeps = world.query("Creep");
    for (const entity of creeps) {
      if (this.killedEntities.has(entity)) continue;
      const health = world.getComponent(entity, "Health");
      const creep = world.getComponent(entity, "Creep");
      if (!health || !creep) continue;
      if (health.current <= 0) {
        this.killCreep(world, entity, creep.reward, creep.creepType);
      }
    }

    // Prune stale killed entities that were removed
    if (this.killedEntities.size > 0) {
      for (const entity of this.killedEntities) {
        if (!world.hasEntity(entity)) {
          this.killedEntities.delete(entity);
        }
      }
    }
  }

  public reset(): void {
    this.killedEntities.clear();
    this.unsubDeath?.();
    this.bound = false;
  }

  private bind(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>): void {
    const bus = world.getEventBus();
    if (!bus?.on) return;

    this.unsubDeath = bus.on("combat:death", (ev) => {
      if (!world.hasEntity(ev.entity)) return;
      if (!world.hasComponent(ev.entity, "Creep")) return;
      const creep = world.getComponent(ev.entity, "Creep")!;
      this.killCreep(world, ev.entity, creep.reward, creep.creepType);
    });
  }

  private killCreep(
    world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>,
    entity: number,
    reward: number,
    creepType: string
  ): void {
    if (!world.hasEntity(entity) || this.killedEntities.has(entity)) return;
    this.killedEntities.add(entity);

    const bus = world.getEventBus();
    bus?.emit("creep:killed", { entity, reward, creepType });
    bus?.emit("enemy:destroyed", { entity, enemyType: creepType });
    const director = world.query("SpawnDirector")[0];
    if (director !== undefined) {
      world.mutateComponent(director, "SpawnDirector", (s: any) => {
        s.enemiesRemaining = Math.max(0, (s.enemiesRemaining ?? 1) - 1);
      });
    }
    world.commands.removeEntity(entity);
  }
}
