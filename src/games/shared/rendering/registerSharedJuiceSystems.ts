/**
 * registerSharedJuiceSystems.ts
 * One-call registration of deterministic hit-stop policy and shared Juice presentation systems.
 *
 * Games that already call registerSharedVFX should also call this during system setup
 * so hit-stop cooldown policy advances through freezes and kinetic charge is mirrored into VFX state.
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
 * Safe to call once per game boot. Hit-stop policy runs in Simulation and is snapshot-backed;
 * KineticFlow remains a presentation-side mirror and does not affect gameplay RNG.
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
