import { StoryGraph } from "@tiny-aster/core";

/**
 * Proof of Concept Multi-Game Narrative Campaign Graph.
 *
 * Flow:
 * Act 1: Asteroids (3 Levels)
 *   -> Branch on heroic performance (0 deaths => heroicEntry = true; >= 1 death => heroicEntry = false)
 * Act 2: Space Invaders (2 Waves)
 *   -> Modifiers applied dynamically from heroicEntry flag
 *   -> Branch on high score (> 5000 score => reinforcementsReceived = true; <= 5000 => false)
 * Act 3: Asteroids Redux (Level 4 Final Stand)
 *   -> Modifiers applied dynamically from reinforcementsReceived flag
 * Branching Finales:
 *   -> Flawless Victory (heroicEntry && reinforcementsReceived)
 *   -> Pyrrhic Victory (one true, one false)
 *   -> Survival (both false)
 *
 * @public
 */
export const proofOfConceptStoryGraph: StoryGraph = {
  id: "poc_multi_game_campaign",
  title: "Multi-Game Narrative Campaign: Odyssey Station Crisis",
  entryNodeId: "poc_start",
  characters: {
    AI_ODYSSEY_7: {
      id: "AI_ODYSSEY_7",
      name: "Odyssey-7 AI",
      avatarUrl: "assets/portraits/ai_odyssey.png"
    },
    COMMANDER_VALERIA: {
      id: "COMMANDER_VALERIA",
      name: "Commander Valeria",
      avatarUrl: "assets/portraits/valeria.png"
    }
  },
  nodes: {
    poc_start: {
      id: "poc_start",
      type: "dialogue",
      title: "Act 1: Station Alert",
      dialogue: {
        id: "diag_poc_start",
        lines: [
          {
            characterId: "AI_ODYSSEY_7",
            speakerName: "AI Odyssey-7",
            textKey: "story.poc.crisis_alert",
            emotion: "alarmed"
          },
          {
            characterId: "COMMANDER_VALERIA",
            speakerName: "Commander Valeria",
            textKey: "story.poc.valeria_response",
            emotion: "determined"
          }
        ]
      },
      transitions: [
        {
          targetNodeId: "poc_briefing"
        }
      ]
    },
    poc_briefing: {
      id: "poc_briefing",
      type: "dialogue",
      title: "Act 1: Debris Field Threat",
      dialogue: {
        id: "diag_poc_briefing",
        lines: [
          {
            characterId: "AI_ODYSSEY_7",
            speakerName: "AI Odyssey-7",
            textKey: "story.poc.debris_briefing",
            emotion: "neutral"
          }
        ]
      },
      transitions: [
        {
          targetNodeId: "poc_act1_prep"
        }
      ]
    },
    poc_act1_prep: {
      id: "poc_act1_prep",
      type: "choice",
      title: "Act 1: Tactical Approach",
      dialogue: {
        id: "diag_poc_prep",
        lines: [
          {
            characterId: "COMMANDER_VALERIA",
            speakerName: "Commander Valeria",
            textKey: "story.poc.prep_prompt",
            emotion: "thinking"
          }
        ]
      },
      choices: [
        {
          id: "choice_aggressive_entry",
          titleKey: "story.poc.choice_aggressive_title",
          descriptionKey: "story.poc.choice_aggressive_desc",
          targetNodeId: "poc_act1_asteroids",
          effects: [
            {
              type: "setVariable",
              key: "asteroidsDeaths",
              value: 0
            }
          ]
        },
        {
          id: "choice_cautious_entry",
          titleKey: "story.poc.choice_cautious_title",
          descriptionKey: "story.poc.choice_cautious_desc",
          targetNodeId: "poc_act1_asteroids",
          effects: [
            {
              type: "setVariable",
              key: "asteroidsDeaths",
              value: 0
            }
          ]
        }
      ]
    },
    poc_act1_asteroids: {
      id: "poc_act1_asteroids",
      type: "gameplay",
      title: "Act 1: Asteroids Debris Sweep",
      sceneToLoad: "asteroids-story-mode-lv3",
      meta: {
        gameId: "asteroids",
        encounterId: "poc-asteroids-1"
      },
      objective: {
        id: "obj_asteroids_sweep",
        eventKey: "level:completed",
        titleKey: "story.poc.obj_asteroids_title",
        descriptionKey: "story.poc.obj_asteroids_desc",
        targetCount: 3,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "poc_act1_check",
          condition: { type: "objective", key: "obj_asteroids_sweep" }
        }
      ]
    },
    poc_act1_check: {
      id: "poc_act1_check",
      type: "branch",
      title: "Act 1: Performance Evaluation",
      transitions: [
        {
          targetNodeId: "poc_act1_heroic_diag",
          priority: 10,
          condition: {
            type: "variable",
            key: "asteroidsDeaths",
            operator: "<=",
            value: 0
          }
        },
        {
          targetNodeId: "poc_act1_struggle_diag",
          priority: 1
        }
      ]
    },
    poc_act1_heroic_diag: {
      id: "poc_act1_heroic_diag",
      type: "dialogue",
      title: "Flawless Debris Run",
      effects: [
        {
          type: "setFlag",
          key: "heroicEntry",
          value: true
        }
      ],
      dialogue: {
        id: "diag_poc_heroic",
        lines: [
          {
            characterId: "AI_ODYSSEY_7",
            speakerName: "AI Odyssey-7",
            textKey: "story.poc.heroic_clear_text",
            emotion: "pleased"
          }
        ]
      },
      transitions: [
        {
          targetNodeId: "poc_transition_si"
        }
      ]
    },
    poc_act1_struggle_diag: {
      id: "poc_act1_struggle_diag",
      type: "dialogue",
      title: "Damaged Passage",
      effects: [
        {
          type: "setFlag",
          key: "heroicEntry",
          value: false
        }
      ],
      dialogue: {
        id: "diag_poc_struggle",
        lines: [
          {
            characterId: "AI_ODYSSEY_7",
            speakerName: "AI Odyssey-7",
            textKey: "story.poc.struggle_clear_text",
            emotion: "concerned"
          }
        ]
      },
      transitions: [
        {
          targetNodeId: "poc_transition_si"
        }
      ]
    },
    poc_transition_si: {
      id: "poc_transition_si",
      type: "cutscene",
      title: "Signal Intercepted",
      cutscene: {
        id: "cutscene_si_incoming",
        sceneId: "CutsceneScene",
        duration: 3,
        transitionEffect: "iris",
        dialogueQueue: [
          {
            characterId: "AI_ODYSSEY_7",
            speakerName: "AI Odyssey-7",
            textKey: "story.poc.signal_intercepted_text",
            emotion: "alarmed"
          }
        ]
      },
      transitions: [
        {
          targetNodeId: "poc_act2_prep"
        }
      ]
    },
    poc_act2_prep: {
      id: "poc_act2_prep",
      type: "dialogue",
      title: "Act 2: Defense Grid Engagement",
      dialogue: {
        id: "diag_poc_act2_prep",
        lines: [
          {
            characterId: "COMMANDER_VALERIA",
            speakerName: "Commander Valeria",
            textKey: "story.poc.act2_prep_text",
            emotion: "determined"
          }
        ]
      },
      transitions: [
        {
          targetNodeId: "poc_act2_space_invaders"
        }
      ]
    },
    poc_act2_space_invaders: {
      id: "poc_act2_space_invaders",
      type: "gameplay",
      title: "Act 2: Alien Wave Interception",
      sceneToLoad: "space-invaders-story-mode",
      meta: {
        gameId: "space-invaders",
        encounterId: "poc-space-invaders-1"
      },
      objective: {
        id: "obj_space_invaders_waves",
        eventKey: "wave:completed",
        titleKey: "story.poc.obj_invaders_title",
        descriptionKey: "story.poc.obj_invaders_desc",
        targetCount: 2,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "poc_act2_check",
          condition: { type: "objective", key: "obj_space_invaders_waves" }
        }
      ]
    },
    poc_act2_check: {
      id: "poc_act2_check",
      type: "branch",
      title: "Act 2: Reinforcement Evaluation",
      transitions: [
        {
          targetNodeId: "poc_act2_highscore_diag",
          priority: 10,
          condition: {
            type: "variable",
            key: "spaceinvadersScore",
            operator: ">",
            value: 5000
          }
        },
        {
          targetNodeId: "poc_act2_lowscore_diag",
          priority: 1
        }
      ]
    },
    poc_act2_highscore_diag: {
      id: "poc_act2_highscore_diag",
      type: "dialogue",
      title: "Reinforcements Confirmed",
      effects: [
        {
          type: "setFlag",
          key: "reinforcementsReceived",
          value: true
        }
      ],
      dialogue: {
        id: "diag_poc_reinforcements_ok",
        lines: [
          {
            characterId: "AI_ODYSSEY_7",
            speakerName: "AI Odyssey-7",
            textKey: "story.poc.reinforcements_success_text",
            emotion: "pleased"
          }
        ]
      },
      transitions: [
        {
          targetNodeId: "poc_transition_asteroids_redux"
        }
      ]
    },
    poc_act2_lowscore_diag: {
      id: "poc_act2_lowscore_diag",
      type: "dialogue",
      title: "Reinforcements Cut Off",
      effects: [
        {
          type: "setFlag",
          key: "reinforcementsReceived",
          value: false
        }
      ],
      dialogue: {
        id: "diag_poc_reinforcements_failed",
        lines: [
          {
            characterId: "AI_ODYSSEY_7",
            speakerName: "AI Odyssey-7",
            textKey: "story.poc.reinforcements_failed_text",
            emotion: "concerned"
          }
        ]
      },
      transitions: [
        {
          targetNodeId: "poc_transition_asteroids_redux"
        }
      ]
    },
    poc_transition_asteroids_redux: {
      id: "poc_transition_asteroids_redux",
      type: "dialogue",
      title: "Act 3: Final Stand Preparation",
      dialogue: {
        id: "diag_poc_act3_prep",
        lines: [
          {
            characterId: "COMMANDER_VALERIA",
            speakerName: "Commander Valeria",
            textKey: "story.poc.act3_prep_text",
            emotion: "resolute"
          }
        ]
      },
      transitions: [
        {
          targetNodeId: "poc_act3_asteroids_redux"
        }
      ]
    },
    poc_act3_asteroids_redux: {
      id: "poc_act3_asteroids_redux",
      type: "gameplay",
      title: "Act 3: Asteroids Redux - Final Wave",
      sceneToLoad: "asteroids-story-redux-lv4",
      meta: {
        gameId: "asteroids",
        encounterId: "poc-asteroids-redux-1"
      },
      objective: {
        id: "obj_asteroids_redux_final",
        eventKey: "level:completed",
        titleKey: "story.poc.obj_asteroids_redux_title",
        descriptionKey: "story.poc.obj_asteroids_redux_desc",
        targetCount: 1,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "poc_act3_eval_branch",
          condition: { type: "objective", key: "obj_asteroids_redux_final" }
        }
      ]
    },
    poc_act3_eval_branch: {
      id: "poc_act3_eval_branch",
      type: "branch",
      title: "Act 3: Outcome Branching",
      transitions: [
        {
          targetNodeId: "poc_ending_flawless",
          priority: 20,
          condition: {
            type: "all",
            all: [
              { type: "flag", key: "heroicEntry", value: true },
              { type: "flag", key: "reinforcementsReceived", value: true }
            ]
          }
        },
        {
          targetNodeId: "poc_ending_pyrrhic",
          priority: 10,
          condition: {
            type: "any",
            any: [
              { type: "flag", key: "heroicEntry", value: true },
              { type: "flag", key: "reinforcementsReceived", value: true }
            ]
          }
        },
        {
          targetNodeId: "poc_ending_survival",
          priority: 1
        }
      ]
    },
    poc_ending_flawless: {
      id: "poc_ending_flawless",
      type: "dialogue",
      title: "Ending: Flawless Victory",
      isEndNode: true,
      dialogue: {
        id: "diag_ending_flawless",
        lines: [
          {
            characterId: "AI_ODYSSEY_7",
            speakerName: "AI Odyssey-7",
            textKey: "story.poc.ending_flawless_text",
            emotion: "triumphant"
          }
        ]
      }
    },
    poc_ending_pyrrhic: {
      id: "poc_ending_pyrrhic",
      type: "dialogue",
      title: "Ending: Pyrrhic Victory",
      isEndNode: true,
      dialogue: {
        id: "diag_ending_pyrrhic",
        lines: [
          {
            characterId: "COMMANDER_VALERIA",
            speakerName: "Commander Valeria",
            textKey: "story.poc.ending_pyrrhic_text",
            emotion: "somber"
          }
        ]
      }
    },
    poc_ending_survival: {
      id: "poc_ending_survival",
      type: "dialogue",
      title: "Ending: Bare Survival",
      isEndNode: true,
      dialogue: {
        id: "diag_ending_survival",
        lines: [
          {
            characterId: "AI_ODYSSEY_7",
            speakerName: "AI Odyssey-7",
            textKey: "story.poc.ending_survival_text",
            emotion: "exhausted"
          }
        ]
      }
    }
  }
};
