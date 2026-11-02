import { LocomotionProfile } from "../ecs/CoreComponents";

/**
 * Built-in locomotion profile presets. Values are game-feel starting points,
 * not universal physical constants.
 * @public
 */
export const LOCOMOTION_PROFILE_PRESETS: Readonly<Record<"responsive" | "momentum" | "heavy", LocomotionProfile>> = {
  responsive: {
    ground: {
      maxSpeed: 240,
      acceleration: 1600,
      deceleration: 1800,
      brakingAcceleration: 2600,
      turnAcceleration: 2200
    },
    air: {
      maxSpeed: 240,
      acceleration: 600,
      deceleration: 300,
      brakingAcceleration: 500,
      turnAcceleration: 450,
      steeringMultiplier: 0.65
    },
    momentum: {
      groundDrag: 0.15,
      airDrag: 0.03,
      preserveMomentum: 0.85
    },
    slide: {
      minEntrySpeed: 120,
      accelerationMultiplier: 0.35,
      frictionMultiplier: 1.25,
      steeringMultiplier: 0.25,
      minimumDuration: 0.2,
      maximumDuration: 0.9
    }
  },
  momentum: {
    ground: {
      maxSpeed: 260,
      acceleration: 900,
      deceleration: 250,
      brakingAcceleration: 800,
      turnAcceleration: 450
    },
    air: {
      maxSpeed: 260,
      acceleration: 300,
      deceleration: 100,
      brakingAcceleration: 250,
      turnAcceleration: 180,
      steeringMultiplier: 0.25
    },
    momentum: {
      groundDrag: 0.04,
      airDrag: 0.01,
      preserveMomentum: 1
    },
    slide: {
      minEntrySpeed: 90,
      accelerationMultiplier: 0.2,
      frictionMultiplier: 0.45,
      steeringMultiplier: 0.1,
      minimumDuration: 0.25,
      maximumDuration: 1.2
    }
  },
  heavy: {
    ground: {
      maxSpeed: 170,
      acceleration: 600,
      deceleration: 1600,
      brakingAcceleration: 2200,
      turnAcceleration: 900
    },
    air: {
      maxSpeed: 170,
      acceleration: 220,
      deceleration: 160,
      brakingAcceleration: 250,
      turnAcceleration: 200,
      steeringMultiplier: 0.15
    },
    momentum: {
      groundDrag: 0.25,
      airDrag: 0.08,
      preserveMomentum: 0.7
    },
    slide: {
      minEntrySpeed: 130,
      accelerationMultiplier: 0.25,
      frictionMultiplier: 1.5,
      steeringMultiplier: 0.15,
      minimumDuration: 0.3,
      maximumDuration: 1.0
    }
  }
};
