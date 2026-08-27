import { Component } from "../ecs/Component";

/**
 * Component attached to entities that store and accumulate kinetic energy
 * from movement velocity and near-miss / graze events.
 *
 * @public
 */
export interface KineticAccumulatorComponent extends Component {
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
