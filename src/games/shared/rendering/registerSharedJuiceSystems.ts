/**
 * registerSharedJuiceSystems.ts
 * One-call registration of shared juice / game-feel systems that depend on VFXWorldState.
 *
 * Games that already call registerSharedVFX should also call this during system setup
 * so hit-stop timers tick and kinetic charge is mirrored into VFX state.
 */

import { SystemPhase, type World, type CoreComponentRegistry } from "@tiny-aster/core";
import { HitStopSystem } from "./HitStopSystem";
import { KineticFlowSystem } from "./KineticFlowSystem";

export interface RegisterSharedJuiceSystemsOptions {
  /** Register KineticFlowSystem (needs KineticAccumulator components). Default true. */
  kineticFlow?: boolean;
}

/**
 * Registers HitStopSystem (and optionally KineticFlowSystem) on the world.
 * Safe to call once per game boot; systems are presentation-phase and deterministic
 * with respect to gameplay RNG (they only read/write VFXWorldState).
 */
export function registerSharedJuiceSystems<
  TComponents extends CoreComponentRegistry = CoreComponentRegistry
>(
  world: World<TComponents>,
  options: RegisterSharedJuiceSystemsOptions = {}
): void {
  const { kineticFlow = true } = options;

  world.addSystem(new HitStopSystem() as never, {
    phase: SystemPhase.Presentation,
    priority: -50 // tick hit-stop before most presentation drawers
  });

  if (kineticFlow) {
    world.addSystem(new KineticFlowSystem() as never, {
      phase: SystemPhase.Presentation,
      priority: -40
    });
  }
}
