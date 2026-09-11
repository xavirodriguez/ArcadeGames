import { Component } from "../ecs/Component";

/**
 * Component attached to entities that store and accumulate kinetic energy
 * from movement velocity and near-miss / graze events.
 *
 * @remarks
 * Used by kinetic weapon and barrier systems to build up energy meters during close-quarters gameplay.
 * When `storedEnergy` reaches `maxEnergy`, `isBurstReady` becomes true, enabling a discharge wave.
 *
 * @example
 * ```ts
 * const kinetic: KineticAccumulatorComponent = {
 *   type: "KineticAccumulator",
 *   storedEnergy: 50,
 *   maxEnergy: 100,
 *   chargeOnMoveRate: 5,
 *   grazeRadius: 30,
 *   grazeChargeAmount: 15,
 *   burstRadius: 120,
 *   isBurstReady: false,
 *   isBurstActive: false
 * };
 * world.addComponent(entity, kinetic);
 * ```
 *
 * @public
 */
export interface KineticAccumulatorComponent extends Component {
  /** Discriminator type tag identifying this component as a KineticAccumulator. */
  type: "KineticAccumulator";
  /** Current stored energy amount (0 to maxEnergy). */
  storedEnergy: number;
  /** Maximum energy capacity required for a full burst charge. */
  maxEnergy: number;
  /** Rate (energy units per second) accumulated from movement velocity. */
  chargeOnMoveRate: number;
  /** Proximity radius (pixels) around the entity for detecting near-miss / graze events. */
  grazeRadius: number;
  /** Flat energy bonus awarded when a hostile entity enters graze radius. */
  grazeChargeAmount: number;
  /** Radius (pixels) of the kinetic burst shockwave when activated. */
  burstRadius: number;
  /** Whether the energy meter is fully charged and ready to unleash. */
  isBurstReady: boolean;
  /** Flag toggled for one frame when the kinetic burst shockwave is activated. */
  isBurstActive: boolean;
}
