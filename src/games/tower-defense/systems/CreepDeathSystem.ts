import { System, SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, TowerDefenseEventRegistry } from "../types/TowerDefenseTypes";

/**
 * Reacts to combat:death (from CombatSystem) and also polls Health as a safety net.
 * Emits creep:killed so GameStateSystem can award gold.
 */
export class CreepDeathSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  readonly phase = SystemPhase.GameRules;
  private bound = false;
  private unsubDeath?: () => void;

  update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, _dt: number): void {
    if (!this.bound) {
      this.bind(world);
      this.bound = true;
    }

    // Safety net: poll Health in case death event was missed (e.g. headless tests)
    const creeps = world.query("Creep");
    for (const entity of creeps) {
      const health = world.getComponent(entity, "Health");
      const creep = world.getComponent(entity, "Creep");
      if (!health || !creep) continue;
      if (health.current <= 0) {
        this.killCreep(world, entity, creep.reward, creep.creepType);
      }
    }
  }

  private bind(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>): void {
    const bus = world.getEventBus?.() ?? (world as any).eventBus;
    if (!bus?.on) return;

    this.unsubDeath = bus.on("combat:death", (ev: { entity: number; sourceEntity?: number; category?: string }) => {
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
    const bus = world.getEventBus?.() ?? (world as any).eventBus;
    bus?.emit?.("creep:killed", { entity, reward, creepType });
    if (world.hasEntity(entity)) {
      world.destroyEntity(entity);
    }
  }
}
