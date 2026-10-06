import { System, SystemPhase, World, CoreComponentRegistry } from "@tiny-aster/core";
import { getVFXState } from "./SharedVFXInternal";

export class KineticFlowSystem extends System<CoreComponentRegistry> {
  constructor() {
    super();
  }

  public update(world: World<CoreComponentRegistry>, dt: number): void {
    const state = getVFXState(world);
    const accumulators = world.query("KineticAccumulator");

    if (accumulators.length === 0) return;

    let maxRatio = 0;
    for (let i = 0; i < accumulators.length; i++) {
      const acc = world.getComponent(accumulators[i], "KineticAccumulator");
      if (acc && acc.maxEnergy > 0) {
        const ratio = acc.storedEnergy / acc.maxEnergy;
        if (ratio > maxRatio) {
          maxRatio = ratio;
        }
      }
    }

    state.kineticCharge = maxRatio;
  }
}
