import { System, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, TowerDefenseEventRegistry } from "../types/TowerDefenseTypes";

/**
 * Base system for Tower Defense systems that perform one-time event bus subscriptions on their initial update tick.
 */
export abstract class TowerDefenseEventBindingSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  private bound = false;

  public override update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, _dt: number): void {
    if (!this.bound) {
      this.bindEvents(world);
      this.bound = true;
    }
  }

  protected abstract bindEvents(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>): void;
}
