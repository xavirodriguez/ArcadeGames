import { RogueliteUpgradeDefinition } from "../types/EconomyTypes";

/**
 * Data-driven catalog of run-bound roguelite upgrades.
 * Includes tactical trade-offs rather than pure statistical inflation.
 * @public
 */
export const ROGUELITE_UPGRADES: Record<string, RogueliteUpgradeDefinition> = {
  // --- Propulsion Family ---
  thruster_mk2: {
    id: "thruster_mk2",
    name: "Thruster MK II",
    family: "propulsion",
    cost: { minerals: 50 },
    description: "+35% thrust acceleration at the cost of higher energy drain.",
    modifiers: {
      thrustMultiplier: 1.35,
      energyDrainMultiplier: 1.25
    }
  },
  gyro_stabilizer: {
    id: "gyro_stabilizer",
    name: "Gyro Stabilizer",
    family: "propulsion",
    cost: { minerals: 40 },
    description: "+25% rotation speed and increased inertial damping.",
    modifiers: {
      rotationMultiplier: 1.25,
      frictionMultiplier: 1.2
    }
  },

  // --- Defense Family ---
  shield_capacitor: {
    id: "shield_capacitor",
    name: "Shield Capacitor",
    family: "defense",
    cost: { minerals: 60, components: 15 },
    description: "+50 max energy and partial shield absorption capacity.",
    modifiers: {
      maxEnergyBonus: 50,
      shieldCapacityBonus: 1
    }
  },

  // --- Combat & Salvage Family ---
  magnetic_field_amp: {
    id: "magnetic_field_amp",
    name: "Magnetic Field Amplifier",
    family: "combat_salvage",
    cost: { minerals: 45, components: 10 },
    description: "+50% magnetic pickup radius and +40% attraction force.",
    modifiers: {
      magneticRadiusMultiplier: 1.5,
      magneticForceMultiplier: 1.4
    }
  },
  heavy_pulse_slugs: {
    id: "heavy_pulse_slugs",
    name: "Heavy Pulse Slugs",
    family: "combat_salvage",
    cost: { minerals: 75, components: 25 },
    description: "+25% projectile speed with piercing capability, but +20% firing cooldown.",
    modifiers: {
      bulletSpeedMultiplier: 1.25,
      shootCooldownMultiplier: 1.2,
      penetratingProjectiles: true
    }
  }
};
