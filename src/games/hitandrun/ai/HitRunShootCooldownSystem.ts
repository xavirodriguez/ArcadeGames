import { System, World, CoreComponentRegistry } from "@tiny-aster/core";
import { isSimulationFrozen } from "../systems/HitRunFeedbackSystem";
import { tickShootCooldown } from "./enemyShoot";

/**
 * Decrementa shootCooldownRemaining en StateMachine.data de enemigos.
 * Fase: Simulation (junto al resto de AI).
 */
export class HitRunShootCooldownSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (isSimulationFrozen(world)) return;

    const entities = world.query("StateMachine");
    const len = entities.length;
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const sm = world.getComponent(entity, "StateMachine") as
        | { data?: Record<string, unknown>; machineId?: string }
        | undefined;
      if (!sm?.data) continue;
      if (!sm.machineId || !sm.machineId.startsWith("hr_")) continue;
      if (!sm.data.canShoot) continue;

      // Mutar data in-place (mismo objeto referenciado por el componente)
      tickShootCooldown(sm.data, deltaTime);
    }
  }
}
