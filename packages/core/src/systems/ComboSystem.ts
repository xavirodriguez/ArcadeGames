import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";

/** @public */
export class ComboSystem<TComponents extends ComponentRegistry = ComponentRegistry> extends System<TComponents> {
  public update(world: World<TComponents>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const entities = world.query("Combo" as any);
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const combo = world.getComponent(entity, "Combo" as any) as any;
      // Safe for determinism/rollback. Avoids acquiring mutable component and stateVersion bumps when combo is inactive or already zero.
      if (!combo || combo.timerRemaining <= 0) continue;

      const mutableCombo = world.getMutableComponent(entity, "Combo" as any) as any;
      if (mutableCombo) {
        mutableCombo.timerRemaining -= deltaTime;
        if (mutableCombo.timerRemaining <= 0) {
          mutableCombo.timerRemaining = 0;
          mutableCombo.combo = 0;
          mutableCombo.multiplier = 1;
        }
      }
    }
  }

  public dispose(): void {}
}
