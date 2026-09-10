import {
  MiniGameEncounter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { ESCAPE_ROUTE_01_ENCOUNTER_ID, escapeRoute01Encounter } from "./EscapeRouteEncounter";

export { ESCAPE_ROUTE_01_ENCOUNTER_ID, escapeRoute01Encounter };

/**
 * Encounter ID for Phase 2 (Quarantine Zone / Arcane Project) in Kepler's Ghost campaign.
 */
export const KEPLER_PHASE2_ENCOUNTER_ID = "kepler_phase2_quarantine";

/**
 * Encounter ID for Phase 3 (The Core / Final Stand) in Kepler's Ghost campaign.
 */
export const KEPLER_PHASE3_ENCOUNTER_ID = "kepler_phase3_core";

/**
 * Phase 2 MiniGameEncounter definition for Kepler's Ghost campaign.
 */
export const keplerPhase2Encounter: MiniGameEncounter = {
  id: KEPLER_PHASE2_ENCOUNTER_ID,
  gameId: "asteroids",
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 90000,
    targetScore: 2500
  },
  modifierRules: [
    {
      id: "stealth_approach_shield_bonus",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.ast_path_stealth,
      modifier: {
        id: "stealth_shield_boost",
        targetProperty: "shieldMultiplier",
        value: 1.2
      }
    },
    {
      id: "attack_approach_damage_bonus",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.ast_path_attack,
      modifier: {
        id: "attack_damage_boost",
        targetProperty: "weaponDamageMultiplier",
        value: 1.25
      }
    },
    {
      id: "low_oxygen_thrust_penalty",
      condition: (snapshot: StoryRuntimeSnapshot) => {
        const oxygen = typeof snapshot.variables.oxygen === "number" ? snapshot.variables.oxygen : 100;
        return oxygen < 50;
      },
      modifier: {
        id: "low_oxygen_thrust",
        targetProperty: "thrustMultiplier",
        value: 0.8
      }
    }
  ],
  outcomeRules: [
    {
      id: "rule_phase2_flawless",
      priority: 30,
      condition: {
        all: [
          { field: "completed", operator: "==", value: true },
          { metric: "collisions", operator: "<=", value: 2 }
        ]
      },
      effects: [
        { type: "setFlag", key: "quarantineBreached", value: true },
        { type: "setFlag", key: "quarantineFlawless", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 150 }
      ]
    },
    {
      id: "rule_phase2_completed",
      priority: 20,
      condition: {
        field: "completed",
        operator: "==",
        value: true
      },
      effects: [
        { type: "setFlag", key: "quarantineBreached", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 75 }
      ]
    },
    {
      id: "rule_phase2_secret_black_box",
      priority: 10,
      condition: {
        secret: "black_box_decrypted"
      },
      effects: [
        { type: "setFlag", key: "blackBoxDecrypted", value: true },
        { type: "discoverEvidence", evidenceId: "black_box_decrypted" }
      ]
    }
  ]
};

/**
 * Phase 3 MiniGameEncounter definition for Kepler's Ghost campaign.
 */
export const keplerPhase3Encounter: MiniGameEncounter = {
  id: KEPLER_PHASE3_ENCOUNTER_ID,
  gameId: "asteroids",
  baseConfig: {
    difficulty: "hard",
    timeLimitMs: 120000,
    targetScore: 5000
  },
  modifierRules: [
    {
      id: "decrypted_telemetry_shield_boost",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.blackBoxDecrypted,
      modifier: {
        id: "decrypted_shield_boost",
        targetProperty: "shieldMultiplier",
        value: 1.3
      }
    },
    {
      id: "quarantine_flawless_firepower",
      condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.quarantineFlawless,
      modifier: {
        id: "quarantine_damage_boost",
        targetProperty: "weaponDamageMultiplier",
        value: 1.2
      }
    }
  ],
  outcomeRules: [
    {
      id: "rule_phase3_flawless",
      priority: 30,
      condition: {
        all: [
          { field: "completed", operator: "==", value: true },
          { metric: "asteroidsDestroyed", operator: ">=", value: 20 },
          { metric: "collisions", operator: "<=", value: 3 }
        ]
      },
      effects: [
        { type: "setFlag", key: "keplerFlawlessRun", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 300 }
      ]
    },
    {
      id: "rule_phase3_completion",
      priority: 20,
      condition: {
        field: "completed",
        operator: "==",
        value: true
      },
      effects: [
        { type: "setFlag", key: "coreOvercharged", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 150 }
      ]
    },
    {
      id: "rule_phase3_merged",
      priority: 10,
      condition: {
        metric: "collisions",
        operator: ">=",
        value: 8
      },
      effects: [
        { type: "setFlag", key: "swarmMerged", value: true }
      ]
    }
  ]
};
