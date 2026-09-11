import { MissionDefinition } from "../shared/missions/MissionTypes";

/**
 * Registry of all 12 playable Asteroids mini-missions available from Level 1.
 * @public
 */
export const ASTEROIDS_MISSIONS: Record<string, MissionDefinition> = {
  chaos_king: {
    id: "chaos_king",
    titleKey: "missions.chaos_king.title",
    descriptionKey: "missions.chaos_king.description",
    conditionType: "continuous",
    targetCount: 3,
    customData: { cloudRadius: 150, targetTime: 3.0 },
    reward: { xp: 100, scoreBonus: 500 }
  },
  extreme_survival: {
    id: "extreme_survival",
    titleKey: "missions.extreme_survival.title",
    descriptionKey: "missions.extreme_survival.description",
    conditionType: "survival",
    targetCount: 15,
    customData: { survivalTarget: 15.0 },
    reward: { xp: 150, scoreBonus: 750 }
  },
  close_hunt: {
    id: "close_hunt",
    titleKey: "missions.close_hunt.title",
    descriptionKey: "missions.close_hunt.description",
    conditionType: "distance_event",
    targetCount: 1,
    customData: { maxDistance: 80 },
    reward: { xp: 100, scoreBonus: 400 }
  },
  against_clock: {
    id: "against_clock",
    titleKey: "missions.against_clock.title",
    descriptionKey: "missions.against_clock.description",
    conditionType: "time_limit",
    targetCount: 1000,
    timeLimit: 30,
    reward: { xp: 200, scoreBonus: 1000 }
  },
  mult_master: {
    id: "mult_master",
    titleKey: "missions.mult_master.title",
    descriptionKey: "missions.mult_master.description",
    conditionType: "combo_multiplier",
    targetCount: 5,
    reward: { xp: 150, scoreBonus: 800 }
  },
  precision_pressure: {
    id: "precision_pressure",
    titleKey: "missions.precision_pressure.title",
    descriptionKey: "missions.precision_pressure.description",
    conditionType: "continuous",
    targetCount: 10,
    customData: { minMultiplier: 3, targetDuration: 10.0 },
    reward: { xp: 150, scoreBonus: 700 }
  },
  core_hunter: {
    id: "core_hunter",
    titleKey: "missions.core_hunter.title",
    descriptionKey: "missions.core_hunter.description",
    conditionType: "event_counter",
    targetCount: 10,
    customData: { targetAsteroids: 8, targetPowerUps: 2 },
    reward: { xp: 120, scoreBonus: 600 }
  },
  ghost_ship: {
    id: "ghost_ship",
    titleKey: "missions.ghost_ship.title",
    descriptionKey: "missions.ghost_ship.description",
    conditionType: "continuous",
    targetCount: 20,
    customData: { targetNoFireTime: 20.0 },
    reward: { xp: 180, scoreBonus: 900 }
  },
  space_dancer: {
    id: "space_dancer",
    titleKey: "missions.space_dancer.title",
    descriptionKey: "missions.space_dancer.description",
    conditionType: "event_counter",
    targetCount: 3,
    customData: { closeRadius: 45 },
    reward: { xp: 130, scoreBonus: 650 }
  },
  double_threat: {
    id: "double_threat",
    titleKey: "missions.double_threat.title",
    descriptionKey: "missions.double_threat.description",
    conditionType: "timed_sequence",
    targetCount: 2,
    customData: { timeWindow: 10.0 },
    reward: { xp: 250, scoreBonus: 1200 }
  },
  perfect_shield: {
    id: "perfect_shield",
    titleKey: "missions.perfect_shield.title",
    descriptionKey: "missions.perfect_shield.description",
    conditionType: "shield_event",
    targetCount: 1,
    reward: { xp: 100, scoreBonus: 500 }
  },
  offensive_shield: {
    id: "offensive_shield",
    titleKey: "missions.offensive_shield.title",
    descriptionKey: "missions.offensive_shield.description",
    conditionType: "shield_event",
    targetCount: 3,
    reward: { xp: 120, scoreBonus: 600 }
  }
};

/**
 * Ordered list of mission definitions.
 * @public
 */
export const ALL_ASTEROIDS_MISSIONS: MissionDefinition[] = Object.values(ASTEROIDS_MISSIONS);
