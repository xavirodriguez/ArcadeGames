import { System, World } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { tickDamageVignette } from "../juice/ShmupJuiceHelpers";

/**
 * Presentation-only juice bookkeeping (vignette timers).
 * Runs while frozen so damage feedback still decays during hit-stop.
 */
export class ShmupJuicePresentationSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  public override runsWhileFrozen = true;

  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, dt: number): void {
    tickDamageVignette(world, dt);
  }
}
