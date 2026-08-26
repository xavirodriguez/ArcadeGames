import { StoryGraph } from "@tiny-aster/core";

/**
 * PROOF OF CONCEPT STORY GRAPH
 * Multi-game campaign flow:
 * Asteroids (Act 1) -> Space Invaders (Act 2) -> Asteroids Redux (Act 3) -> 3 Branched Endings
 */
export const proofOfConceptStoryGraph: StoryGraph = {
  id: "poc_multi_game_campaign",
  title: "Proof of Concept: Multi-Game Campaign",
  entryNodeId: "start_node",

  characters: {
    ai: { id: "AI_ODYSSEY_7", name: "AI ODYSSEY 7" },
    player: { id: "COMMANDER", name: "Comandante" }
  },

  nodes: {
    // 01: Inicio
    start_node: {
      id: "start_node",
      type: "dialogue",
      title: "Inicio: Crisis en la estación",
      dialogue: {
        id: "dlg_start_crisis",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Alerta sectorial. Enjambre de asteroides detectado en aproximación." },
          { speakerName: "AI ODYSSEY 7", textKey: "Sistemas primarios en riesgo. Comandante, tome los controles." }
        ]
      },
      transitions: [{ targetNodeId: "act1_asteroids_intro" }]
    },

    // 02: Intro Cutscene Act 1
    act1_asteroids_intro: {
      id: "act1_asteroids_intro",
      type: "cutscene",
      title: "Despliegue Orbital",
      cutscene: {
        id: "cs_act1_deploy",
        transitionEffect: "fade",
        dialogueQueue: [
          { speakerName: "SISTEMA", textKey: "Iniciando secuencia de lanzamiento de interceptor." },
          { speakerName: "AI ODYSSEY 7", textKey: "Destruya la primera oleada sin sufrir daños graves." }
        ]
      },
      transitions: [{ targetNodeId: "act1_asteroids_gameplay" }]
    },

    // 03: Gameplay Act 1 (Asteroids)
    act1_asteroids_gameplay: {
      id: "act1_asteroids_gameplay",
      type: "gameplay",
      title: "Capítulo 1: Asteroids",
      sceneToLoad: "asteroids-story-mode-lv3",
      meta: {
        minijuego: "asteroids",
        encounterId: "poc-asteroids-1"
      },
      objective: {
        id: "survive-asteroids-wave3",
        titleKey: "Sobrevive a las rocas",
        descriptionKey: "Destruye 3 oleadas de asteroides",
        targetCount: 3,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "eval_act1_performance",
          condition: { type: "objective", key: "survive-asteroids-wave3", operator: "==", value: true }
        }
      ]
    },

    // 04: Branch Eval Act 1
    eval_act1_performance: {
      id: "eval_act1_performance",
      type: "branch",
      title: "Evaluación Acto 1",
      transitions: [
        {
          targetNodeId: "branch_heroic_entry",
          priority: 10,
          condition: {
            any: [
              { type: "flag", key: "asteroidsPerfect", value: true },
              { type: "flag", key: "heroicEntry", value: true }
            ]
          }
        },
        {
          targetNodeId: "branch_struggling_entry",
          priority: 0
        }
      ]
    },

    // 05: Branch Heroic Entry
    branch_heroic_entry: {
      id: "branch_heroic_entry",
      type: "dialogue",
      title: "Entrada Heroica",
      effects: [
        { type: "setFlag", key: "heroicEntry", value: true }
      ],
      dialogue: {
        id: "dlg_heroic_entry",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Maniobra limpia. Escudos al máximo rendimiento." }
        ]
      },
      transitions: [{ targetNodeId: "cutscene_trans_to_spaceinvaders" }]
    },

    // 06: Branch Struggling Entry
    branch_struggling_entry: {
      id: "branch_struggling_entry",
      type: "dialogue",
      title: "Entrada con Daños",
      effects: [
        { type: "setFlag", key: "heroicEntry", value: false }
      ],
      dialogue: {
        id: "dlg_struggling_entry",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Impactos confirmados. Activando protocolo de asistencia táctica." }
        ]
      },
      transitions: [{ targetNodeId: "cutscene_trans_to_spaceinvaders" }]
    },

    // 07: Visual Transition to Space Invaders
    cutscene_trans_to_spaceinvaders: {
      id: "cutscene_trans_to_spaceinvaders",
      type: "cutscene",
      title: "Intercepción de Señal",
      cutscene: {
        id: "cs_trans_spaceinvaders",
        transitionEffect: "IrisTransition",
        dialogueQueue: [
          { speakerName: "SISTEMA", textKey: "Signal intercepted. Enemies incoming." },
          { speakerName: "AI ODYSSEY 7", textKey: "Formación hostil aproximándose en cuadrante 4." }
        ]
      },
      transitions: [{ targetNodeId: "act2_spaceinvaders_gameplay" }]
    },

    // 08: Gameplay Act 2 (Space Invaders)
    act2_spaceinvaders_gameplay: {
      id: "act2_spaceinvaders_gameplay",
      type: "gameplay",
      title: "Capítulo 2: Space Invaders",
      sceneToLoad: "space-invaders-story-mode-wave2",
      meta: {
        minijuego: "space-invaders",
        encounterId: "poc-space-invaders-1"
      },
      objective: {
        id: "repel-invaders-wave",
        titleKey: "Repele la invasión",
        descriptionKey: "Elimina 2 oleadas de invasores espacial",
        targetCount: 2,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "eval_act2_performance",
          condition: { type: "objective", key: "repel-invaders-wave", operator: "==", value: true }
        }
      ]
    },

    // 09: Branch Eval Act 2
    eval_act2_performance: {
      id: "eval_act2_performance",
      type: "branch",
      title: "Evaluación Acto 2",
      transitions: [
        {
          targetNodeId: "branch_reinforcements_success",
          priority: 10,
          condition: {
            any: [
              { type: "flag", key: "reinforcementsReceived", value: true },
              { type: "variable", key: "spaceinvadersScore", operator: ">", value: 5000 }
            ]
          }
        },
        {
          targetNodeId: "branch_reinforcements_failed",
          priority: 0
        }
      ]
    },

    // 10: Branch Reinforcements Success
    branch_reinforcements_success: {
      id: "branch_reinforcements_success",
      type: "dialogue",
      title: "Refuerzos Confirmados",
      effects: [
        { type: "setFlag", key: "reinforcementsReceived", value: true }
      ],
      dialogue: {
        id: "dlg_reinforcements_success",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Puntuación de combate alta. Cargamento de munición y escudos desplegado." }
        ]
      },
      transitions: [{ targetNodeId: "cutscene_trans_to_asteroids_redux" }]
    },

    // 11: Branch Reinforcements Failed
    branch_reinforcements_failed: {
      id: "branch_reinforcements_failed",
      type: "dialogue",
      title: "Línea de Suministros Interrumpida",
      effects: [
        { type: "setFlag", key: "reinforcementsReceived", value: false }
      ],
      dialogue: {
        id: "dlg_reinforcements_failed",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Línea de suministros comprometida. Deberemos resistir con recursos limitados." }
        ]
      },
      transitions: [{ targetNodeId: "cutscene_trans_to_asteroids_redux" }]
    },

    // 12: Visual Transition to Asteroids Redux
    cutscene_trans_to_asteroids_redux: {
      id: "cutscene_trans_to_asteroids_redux",
      type: "cutscene",
      title: "Retorno a la Zona de Impacto",
      cutscene: {
        id: "cs_trans_asteroids_redux",
        transitionEffect: "fade",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "We made it. For now." },
          { speakerName: "AI ODYSSEY 7", textKey: "Último sector de asteroides por despejar." }
        ]
      },
      transitions: [{ targetNodeId: "act3_asteroids_redux_gameplay" }]
    },

    // 13: Gameplay Act 3 (Asteroids Redux)
    act3_asteroids_redux_gameplay: {
      id: "act3_asteroids_redux_gameplay",
      type: "gameplay",
      title: "Capítulo 3: Asteroids Redux",
      sceneToLoad: "asteroids-story-mode-redux",
      meta: {
        minijuego: "asteroids",
        encounterId: "poc-asteroids-redux"
      },
      objective: {
        id: "clear-final-sector",
        titleKey: "Limpia el sector final",
        descriptionKey: "Supera el nivel 4 final de Asteroids",
        targetCount: 4,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "final_evaluation_branch",
          condition: { type: "objective", key: "clear-final-sector", operator: "==", value: true }
        }
      ]
    },

    // 14: Final Evaluation Branch
    final_evaluation_branch: {
      id: "final_evaluation_branch",
      type: "branch",
      title: "Determinación de Final",
      transitions: [
        {
          targetNodeId: "ending_flawless",
          priority: 30,
          condition: {
            all: [
              { type: "flag", key: "heroicEntry", value: true },
              { type: "flag", key: "reinforcementsReceived", value: true }
            ]
          }
        },
        {
          targetNodeId: "ending_pyrrhic",
          priority: 20,
          condition: {
            any: [
              { type: "flag", key: "heroicEntry", value: true },
              { type: "flag", key: "reinforcementsReceived", value: true }
            ]
          }
        },
        {
          targetNodeId: "ending_survival",
          priority: 0
        }
      ]
    },

    // 15: Flawless Victory Ending
    ending_flawless: {
      id: "ending_flawless",
      type: "cutscene",
      title: "Final: Flawless Victory",
      sceneToLoad: "ending-flawless",
      isEndNode: true,
      cutscene: {
        id: "cs_ending_flawless",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Victoria Impecable. Todos los sectores limpios y suministros resguardados." },
          { speakerName: "COMMANDER", textKey: "La estación está a salvo. Misión cumplida." }
        ]
      }
    },

    // 16: Pyrrhic Victory Ending
    ending_pyrrhic: {
      id: "ending_pyrrhic",
      type: "cutscene",
      title: "Final: Pyrrhic Victory",
      sceneToLoad: "ending-pyrrhic",
      isEndNode: true,
      cutscene: {
        id: "cs_ending_pyrrhic",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Sobrevivimos al ataque, pero los sistemas sufrieron daños significativos." },
          { speakerName: "COMMANDER", textKey: "Una victoria amarga, pero seguimos de pie." }
        ]
      }
    },

    // 17: Survival Ending
    ending_survival: {
      id: "ending_survival",
      type: "cutscene",
      title: "Final: Survival",
      sceneToLoad: "ending-survival",
      isEndNode: true,
      cutscene: {
        id: "cs_ending_survival",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Apenas lo logramos. Los recursos están prácticamente agotados." },
          { speakerName: "COMMANDER", textKey: "Resistimos hoy. Mañana será otra batalla." }
        ]
      }
    }
  }
};
