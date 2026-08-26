import {
  MiniGameEncounter,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";

/**
 * Proof of Concept Encounter for Asteroids (Act 1)
 */
export const asteroidsPOCEncounter: MiniGameEncounter = {
  id: "poc-asteroids-1",
  gameId: "asteroids",
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
        },
        {
          type: "setFlag",
          key: "heroicEntry",
          value: true
        }
      ]
    },
    {
      id: "rule_asteroids_struggle",
      priority: 20,
      condition: {
        field: "completed",
        operator: "==",
        value: false
      },
      effects: [
        {
          type: "setFlag",
          key: "asteroidsStruggle",
          value: true
        },
        {
          type: "setFlag",
          key: "heroicEntry",
          value: false
        }
      ]
    }
  ]
};

/**
 * Proof of Concept Encounter for Space Invaders (Act 2)
 */
export const spaceInvadersPOCEncounter: MiniGameEncounter = {
  id: "poc-space-invaders-1",
  gameId: "space-invaders",
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
      id: "rule_si_high_score",
      priority: 10,
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
          type: "incrementVariable",
          key: "narrativeScore",
          amount: 100
        }
      ]
    },
    {
      id: "rule_si_low_score",
      priority: 20,
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
          type: "incrementVariable",
          key: "narrativeScore",
          amount: 50
        }
      ]
    }
  ]
};

/**
 * Proof of Concept Encounter for Asteroids Redux (Act 3)
 */
export const asteroidsReduxPOCEncounter: MiniGameEncounter = {
  id: "poc-asteroids-redux",
  gameId: "asteroids",
  baseConfig: {
    difficulty: "hard",
    timeLimitMs: 120000,
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
      id: "rule_redux_completion",
      priority: 10,
      condition: {
        field: "completed",
        operator: "==",
        value: true
      },
      effects: [
        {
          type: "incrementVariable",
          key: "narrativeScore",
          amount: 200
        }
      ]
    }
  ]
};
