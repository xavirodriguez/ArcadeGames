import {
  MiniGameEncounter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";

export const ASTEROIDS_POC_ENCOUNTER_ID = "poc-asteroids-1";
export const SPACE_INVADERS_POC_ENCOUNTER_ID = "poc-space-invaders-1";
export const ASTEROIDS_REDUX_POC_ENCOUNTER_ID = "poc-asteroids-redux-1";

/**
 * Encounter definition for Act 1: Asteroids
 */
export const asteroidsPOCEncounter: MiniGameEncounter = {
  id: ASTEROIDS_POC_ENCOUNTER_ID,
  gameId: "asteroids",
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 60000,
    targetScore: 1000
  },
  modifierRules: [
    {
      id: "heroic_entry_check",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === true,
      modifier: {
        id: "heroic_no_assist",
        targetProperty: "navigationAssist",
        value: false
      }
    },
    {
      id: "struggle_entry_check",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === false,
      modifier: {
        id: "struggle_assist_enable",
        targetProperty: "navigationAssist",
        value: true
      }
    }
  ],
  outcomeRules: [
    {
      id: "rule_asteroids_perfect",
      priority: 10,
      condition: {
        field: "completed",
        operator: "==",
        value: true
      },
      effects: [
        {
          type: "setFlag",
          key: "asteroidsPerfect",
          value: true
        }
      ]
    },
    {
      id: "rule_asteroids_struggle",
      priority: 20,
      condition: {
        metric: "collisions",
        operator: ">=",
        value: 3
      },
      effects: [
        {
          type: "setFlag",
          key: "asteroidsStruggle",
          value: true
        }
      ]
    }
  ]
};

/**
 * Encounter definition for Act 2: Space Invaders
 */
export const spaceInvadersPOCEncounter: MiniGameEncounter = {
  id: SPACE_INVADERS_POC_ENCOUNTER_ID,
  gameId: "space-invaders",
  baseConfig: {
    difficulty: "normal",
    timeLimitMs: 90000,
    targetScore: 5000
  },
  modifierRules: [
    {
      id: "heroic_handicap_check",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === true,
      modifier: {
        id: "heroic_handicap_lives",
        targetProperty: "extraLives",
        value: 0
      }
    },
    {
      id: "heroic_handicap_firerate",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === true,
      modifier: {
        id: "heroic_handicap_firerate_val",
        targetProperty: "fireRateMultiplier",
        value: 1.0
      }
    },
    {
      id: "struggle_bonus_check",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === false,
      modifier: {
        id: "struggle_bonus_lives",
        targetProperty: "extraLives",
        value: 2
      }
    },
    {
      id: "struggle_bonus_firerate",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.heroicEntry === false,
      modifier: {
        id: "struggle_bonus_firerate_val",
        targetProperty: "fireRateMultiplier",
        value: 1.3
      }
    }
  ],
  outcomeRules: [
    {
      id: "rule_reinforcements_high_score",
      priority: 20,
      condition: {
        field: "score",
        operator: ">=",
        value: 5000
      },
      effects: [
        {
          type: "setFlag",
          key: "reinforcementsReceived",
          value: true
        },
        {
          type: "setVariable",
          key: "spaceinvadersScore",
          value: 6000
        },
        {
          type: "incrementVariable",
          key: "narrativeScore",
          amount: 100
        }
      ]
    },
    {
      id: "rule_reinforcements_low_score",
      priority: 10,
      condition: {
        field: "score",
        operator: "<",
        value: 5000
      },
      effects: [
        {
          type: "setFlag",
          key: "reinforcementsReceived",
          value: false
        },
        {
          type: "setVariable",
          key: "spaceinvadersScore",
          value: 3000
        },
        {
          type: "incrementVariable",
          key: "narrativeScore",
          amount: 50
        }
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
  baseConfig: {
    difficulty: "hard",
    timeLimitMs: 60000,
    targetScore: 3000
  },
  modifierRules: [
    {
      id: "reinforcements_boost_shield",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.reinforcementsReceived === true,
      modifier: {
        id: "shield_boost",
        targetProperty: "shieldMultiplier",
        value: 1.5
      }
    },
    {
      id: "no_reinforcements_penalty_shield",
      condition: (snapshot: StoryRuntimeSnapshot) => snapshot.flags.reinforcementsReceived === false,
      modifier: {
        id: "shield_penalty",
        targetProperty: "shieldMultiplier",
        value: 0.8
      }
    }
  ],
  outcomeRules: [
    {
      id: "rule_act3_complete",
      priority: 10,
      condition: {
        field: "completed",
        operator: "==",
        value: true
      },
      effects: [
        {
          type: "setFlag",
          key: "asteroidsReduxCompleted",
          value: true
        }
      ]
    }
  ]
};
