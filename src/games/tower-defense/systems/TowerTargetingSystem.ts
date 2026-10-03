import { System, SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry } from "../types/TowerDefenseTypes";

/**
 * For each tower, find the best target among creeps in range.
 * Classic rule: prefer the creep furthest along the path (highest pathProgress).
 * Deterministic, O(towers × creeps) — SpatialPartitioning can be added later.
 */
export class TowerTargetingSystem extends System<TowerDefenseComponentRegistry> {
  readonly phase = SystemPhase.Simulation;

  update(world: World<TowerDefenseComponentRegistry>, _dt: number): void {
    const towers = world.query("Tower");
    const creeps = world.query("Creep");

    for (const towerEntity of towers) {
      const tower = world.getComponent(towerEntity, "Tower");
      const towerTransform = world.getComponent(towerEntity, "Transform");
      if (!tower || !towerTransform) continue;

      let best: number | null = null;
      let bestProgress = -1;

      for (const creepEntity of creeps) {
        const creep = world.getComponent(creepEntity, "Creep");
        const creepTransform = world.getComponent(creepEntity, "Transform");
        if (!creep || !creepTransform) continue;

        const dx = creepTransform.x - towerTransform.x;
        const dy = creepTransform.y - towerTransform.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > tower.range * tower.range) continue;

        if (creep.pathProgress > bestProgress) {
          bestProgress = creep.pathProgress;
          best = creepEntity;
        }
      }

      world.mutateComponent(towerEntity, "Tower", (t) => {
        t.targetEntity = best;
      });
    }
  }
}
