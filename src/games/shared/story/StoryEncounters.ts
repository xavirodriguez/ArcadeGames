import {
  MiniGameEncounter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";

export const ASTEROIDS_POC_ENCOUNTER_ID = "poc-asteroids-1";
export const SPACE_INVADERS_POC_ENCOUNTER_ID = "poc-space-invaders-1";
export const FLAPPYBIRD_POC_ENCOUNTER_ID = "poc-flappybird-1";
export const ASTEROIDS_REDUX_POC_ENCOUNTER_ID = "poc-asteroids-redux-1";
export const SPACEINVADERS_REDUX_POC_ENCOUNTER_ID = "poc-spaceinvaders-redux-1";

/**
 * Encounter definition for Act 1: Asteroids
 */
export const asteroidsPOCEncounter: MiniGameEncounter = {
  id: ASTEROIDS_POC_ENCOUNTER_ID,
  gameId: "asteroids",
  replayable: true,
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 60000,
    targetScore: 1000
  },
  modifierRules: [
    {
      id: "heroic_entry_check_true",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === true,
      modifier: {
        id: "heroic_no_assist",
        targetProperty: "navigationAssist",
        value: false,
        name: "Sin asistencia: manera difícil"
      }
    },
    {
      id: "heroic_entry_check_false",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === false,
      modifier: {
        id: "heroic_assist_enable",
        targetProperty: "navigationAssist",
        value: true,
        name: "Con asistencia: camino más amable"
      }
    },
    {
      id: "heroic_shield_boost",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === false,
      modifier: {
        id: "heroic_shield_multiplier",
        targetProperty: "shieldMultiplier",
        value: 1.2
      }
    }
  ],
  outcomeRules: [
    {
      id: "rule_asteroids_flawless",
      priority: 30,
      condition: {
        all: [
          { field: "completed", operator: "==", value: true },
          { metric: "wavesCleared", operator: ">=", value: 3 },
          { metric: "livesRemaining", operator: ">=", value: 2 }
        ]
      },
      effects: [
        { type: "setFlag", key: "asteroidsPerfect", value: true },
        { type: "setFlag", key: "heroicEntry", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 100 }
      ]
    },
    {
      id: "rule_asteroids_secret",
      priority: 25,
      condition: { secret: "black_box_alpha" },
      effects: [
        { type: "discoverEvidence", evidenceId: "black_box_alpha" },
        { type: "setFlag", key: "foundSecretEvidence", value: true }
      ]
    },
    {
      id: "rule_asteroids_passed",
      priority: 20,
      condition: { field: "completed", operator: "==", value: true },
      effects: [
        { type: "setFlag", key: "heroicEntry", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 50 }
      ]
    },
    {
      id: "rule_asteroids_struggle",
      priority: 10,
      condition: { field: "completed", operator: "==", value: false },
      effects: [
        { type: "setFlag", key: "asteroidsStruggle", value: true },
        { type: "setFlag", key: "heroicEntry", value: false }
      ]
    }
  ]
};

/**
 * Proof of Concept Encounter for Space Invaders (Act 2 Branch A)
 */
export const spaceInvadersPOCEncounter: MiniGameEncounter = {
  id: SPACE_INVADERS_POC_ENCOUNTER_ID,
  gameId: "space-invaders",
  replayable: true,
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 90000,
    targetScore: 5000
  },
  modifierRules: [
    {
      id: "si_heroic_true_extra_lives",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === true,
      modifier: {
        id: "si_no_extra_lives",
        targetProperty: "extraLives",
        value: 0
      }
    },
    {
      id: "si_heroic_false_extra_lives",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === false,
      modifier: {
        id: "si_extra_lives_bonus",
        targetProperty: "extraLives",
        value: 2
      }
    },
    {
      id: "si_heroic_false_firerate",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === false,
      modifier: {
        id: "si_fire_rate_bonus",
        targetProperty: "fireRateMultiplier",
        value: 1.3
      }
    }
  ],
  outcomeRules: [
    {
      id: "rule_si_heroic_defense",
      priority: 30,
      condition: {
        all: [
          { field: "score", operator: ">=", value: 5000 },
          { metric: "wavesCleared", operator: ">=", value: 2 }
        ]
      },
      effects: [
        { type: "setFlag", key: "reinforcementsReceived", value: true },
        { type: "setFlag", key: "invadersDefeated", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 150 }
      ]
    },
    {
      id: "rule_si_secret_core",
      priority: 25,
      condition: { secret: "invader_core_data" },
      effects: [
        { type: "discoverEvidence", evidenceId: "invader_core_data" },
        { type: "setFlag", key: "foundSecretEvidence", value: true }
      ]
    },
    {
      id: "rule_si_high_score",
      priority: 20,
      condition: { field: "score", operator: ">=", value: 2000 },
      effects: [
        { type: "setFlag", key: "reinforcementsReceived", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 80 }
      ]
    },
    {
      id: "rule_si_low_score",
      priority: 10,
      condition: { field: "score", operator: "<", value: 2000 },
      effects: [
        { type: "setFlag", key: "reinforcementsReceived", value: false },
        { type: "incrementVariable", key: "narrativeScore", amount: 20 }
      ]
    }
  ]
};

/**
 * Proof of Concept Encounter for Flappy Bird (Act 2 Branch B)
 */
export const flappyBirdPOCEncounter: MiniGameEncounter = {
  id: FLAPPYBIRD_POC_ENCOUNTER_ID,
  gameId: "flappybird",
  replayable: true,
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 60000,
    targetScore: 10
  },
  outcomeRules: [
    {
      id: "rule_fb_flawless",
      priority: 30,
      condition: {
        all: [
          { metric: "obstaclesPassed", operator: ">=", value: 10 },
          { metric: "livesRemaining", operator: ">=", value: 1 }
        ]
      },
      effects: [
        { type: "setFlag", key: "reinforcementsReceived", value: true },
        { type: "setFlag", key: "debrisNavigated", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 150 }
      ]
    },
    {
      id: "rule_fb_secret_cache",
      priority: 25,
      condition: { secret: "debris_cache" },
      effects: [
        { type: "discoverEvidence", evidenceId: "debris_cache" },
        { type: "setFlag", key: "foundSecretEvidence", value: true }
      ]
    },
    {
      id: "rule_fb_basic_pass",
      priority: 20,
      condition: { metric: "obstaclesPassed", operator: ">=", value: 5 },
      effects: [
        { type: "setFlag", key: "reinforcementsReceived", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 80 }
      ]
    },
    {
      id: "rule_fb_crash",
      priority: 10,
      condition: { metric: "obstaclesPassed", operator: "<", value: 5 },
      effects: [
        { type: "setFlag", key: "reinforcementsReceived", value: false },
        { type: "incrementVariable", key: "narrativeScore", amount: 20 }
      ]
    }
  ]
};

/**
 * Encounter definition for Act 3: Asteroids Redux
 */
export const asteroidsReduxPOCEncounter: MiniGameEncounter = {
  id: ASTEROIDS_REDUX_POC_ENCOUNTER_ID,
  gameId: "asteroids",
  replayable: false, // Narrative permadeath for final climax act!
  baseConfig: {
    difficulty: "hard",
    timeLimitMs: 60000,
    targetScore: 3000
  },
  modifierRules: [
    {
      id: "redux_reinforcements_true_shield",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.reinforcementsReceived === true,
      modifier: {
        id: "redux_high_shield",
        targetProperty: "shieldMultiplier",
        value: 1.5
      }
    },
    {
      id: "redux_reinforcements_false_shield",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.reinforcementsReceived === false,
      modifier: {
        id: "redux_low_shield",
        targetProperty: "shieldMultiplier",
        value: 0.8
      }
    }
  ],
  outcomeRules: [
    {
      id: "rule_redux_flawless",
      priority: 20,
      condition: {
        all: [
          { field: "completed", operator: "==", value: true },
          { metric: "wavesCleared", operator: ">=", value: 4 }
        ]
      },
      effects: [
        { type: "setFlag", key: "reduxClimaxFlawless", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 250 }
      ]
    },
    {
      id: "rule_redux_completion",
      priority: 10,
      condition: { field: "completed", operator: "==", value: true },
      effects: [
        { type: "incrementVariable", key: "narrativeScore", amount: 150 }
      ]
    }
  ]
};

/**
 * Encounter definition for Act 3 Alternative: Space Invaders Redux
 */
export const spaceInvadersReduxPOCEncounter: MiniGameEncounter = {
  id: SPACEINVADERS_REDUX_POC_ENCOUNTER_ID,
  gameId: "space-invaders",
  replayable: false, // Narrative permadeath for final climax act!
  baseConfig: {
    difficulty: "nightmare",
    timeLimitMs: 90000,
    targetScore: 8000
  },
  outcomeRules: [
    {
      id: "rule_si_redux_flawless",
      priority: 20,
      condition: {
        all: [
          { field: "completed", operator: "==", value: true },
          { field: "score", operator: ">=", value: 8000 }
        ]
      },
      effects: [
        { type: "setFlag", key: "reduxClimaxFlawless", value: true },
        { type: "incrementVariable", key: "narrativeScore", amount: 250 }
      ]
    },
    {
      id: "rule_si_redux_completion",
      priority: 10,
      condition: { field: "completed", operator: "==", value: true },
      effects: [
        { type: "incrementVariable", key: "narrativeScore", amount: 150 }
      ]
    }
  ]
};
