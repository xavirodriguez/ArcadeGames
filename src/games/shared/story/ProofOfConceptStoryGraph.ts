import { StoryGraph } from "@tiny-aster/core";

/**
 * PROOF OF CONCEPT STORY GRAPH
 * Extended 3-4 Act Multi-Game Campaign Flow:
 * Act 1: Asteroids (Orbital Clearance)
 * Narrative Bridge: Explicit Player Choice (Space Invaders Fleet OR Flappy Bird Debris Navigation)
 * Act 2: Space Invaders or Flappy Bird
 * Act 3: Return to Previous Game with Higher Difficulty (Asteroids Redux or Space Invaders Redux)
 * Terminal Endings: Flawless, Pyrrhic, or Survival
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
      title: "Acto 1: Despeje de Asteroides",
      sceneToLoad: "asteroids",
      checkpoint: true,
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
      transitions: [{ targetNodeId: "narrative_bridge_choice" }]
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
      transitions: [{ targetNodeId: "narrative_bridge_choice" }]
    },

    // 07: Narrative Bridge with Explicit Choices
    narrative_bridge_choice: {
      id: "narrative_bridge_choice",
      type: "choice",
      title: "Elección de Ruta Táctica",
      dialogue: {
        id: "dlg_tactical_choice",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Dos vectores tácticos disponibles tras superar el campo principal." },
          { speakerName: "AI ODYSSEY 7", textKey: "¿Interceptamos la armada invasora o atravesamos el canal de escombros?" }
        ]
      },
      choices: [
        {
          id: "choice_space_invaders",
          titleKey: "Interceptar flota de invasores (Space Invaders)",
          descriptionKey: "Combate frontal directo contra la vanguardia enemiga.",
          targetNodeId: "act2_spaceinvaders_intro",
          effects: [
            { type: "setFlag", key: "route_space_invaders", value: true }
          ]
        },
        {
          id: "choice_flappy_bird",
          titleKey: "Navegar canal de escombros (Flappy Bird)",
          descriptionKey: "Maniobra de sigilo ágil entre estructuras colapsadas.",
          targetNodeId: "act2_flappybird_intro",
          effects: [
            { type: "setFlag", key: "route_flappy_bird", value: true }
          ]
        }
      ]
    },

    // 08: Cutscene Space Invaders Route
    act2_spaceinvaders_intro: {
      id: "act2_spaceinvaders_intro",
      type: "cutscene",
      title: "Intercepción de Armada Hostil",
      cutscene: {
        id: "cs_trans_spaceinvaders",
        transitionEffect: "IrisTransition",
        dialogueQueue: [
          { speakerName: "SISTEMA", textKey: "Contacto de radar confirmado. Formación hostil detectada." },
          { speakerName: "AI ODYSSEY 7", textKey: "Mantenga la línea defensiva. Destruya los invasores." }
        ]
      },
      transitions: [{ targetNodeId: "act2_spaceinvaders_gameplay" }]
    },

    // 09: Gameplay Space Invaders Route
    act2_spaceinvaders_gameplay: {
      id: "act2_spaceinvaders_gameplay",
      type: "gameplay",
      title: "Acto 2: Space Invaders",
      sceneToLoad: "space-invaders",
      checkpoint: true,
      meta: {
        minijuego: "space-invaders",
        encounterId: "poc-space-invaders-1"
      },
      objective: {
        id: "repel-invaders-wave",
        titleKey: "Repele la invasión",
        descriptionKey: "Elimina 2 oleadas de invasores espaciales",
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

    // 10: Cutscene Flappy Bird Route
    act2_flappybird_intro: {
      id: "act2_flappybird_intro",
      type: "cutscene",
      title: "Navegación en Estrecho",
      cutscene: {
        id: "cs_trans_flappybird",
        transitionEffect: "fade",
        dialogueQueue: [
          { speakerName: "SISTEMA", textKey: "Ingresando a canal de escombros de alta densidad." },
          { speakerName: "AI ODYSSEY 7", textKey: "Ajuste propulsores de altitud. Mantenga la nave estable." }
        ]
      },
      transitions: [{ targetNodeId: "act2_flappybird_gameplay" }]
    },

    // 11: Gameplay Flappy Bird Route
    act2_flappybird_gameplay: {
      id: "act2_flappybird_gameplay",
      type: "gameplay",
      title: "Acto 2: Canal de Escombros",
      sceneToLoad: "flappybird",
      checkpoint: true,
      meta: {
        minijuego: "flappybird",
        encounterId: "poc-flappybird-1"
      },
      objective: {
        id: "navigate-debris-channel",
        titleKey: "Navega el canal",
        descriptionKey: "Esquiva 10 estructuras en el canal de escombros",
        targetCount: 10,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "eval_act2_performance",
          condition: { type: "objective", key: "navigate-debris-channel", operator: "==", value: true }
        }
      ]
    },

    // 12: Branch Eval Act 2
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
              { type: "variable", key: "spaceinvadersScore", operator: ">=", value: 2000 }
            ]
          }
        },
        {
          targetNodeId: "branch_reinforcements_failed",
          priority: 0
        }
      ]
    },

    // 13: Branch Reinforcements Success
    branch_reinforcements_success: {
      id: "branch_reinforcements_success",
      type: "dialogue",
      title: "Suministros Asegurados",
      effects: [
        { type: "setFlag", key: "reinforcementsReceived", value: true }
      ],
      dialogue: {
        id: "dlg_reinforcements_success",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Rendimiento óptimo. Carga táctica y escudos suplementarios asegurados." }
        ]
      },
      transitions: [{ targetNodeId: "act2_to_act3_bridge" }]
    },

    // 14: Branch Reinforcements Failed
    branch_reinforcements_failed: {
      id: "branch_reinforcements_failed",
      type: "dialogue",
      title: "Línea de Suministros Comprometida",
      effects: [
        { type: "setFlag", key: "reinforcementsReceived", value: false }
      ],
      dialogue: {
        id: "dlg_reinforcements_failed",
        lines: [
          { speakerName: "AI ODYSSEY 7", textKey: "Línea de suministros interrumpida. Entraremos al sector final con recursos mínimos." }
        ]
      },
      transitions: [{ targetNodeId: "act2_to_act3_bridge" }]
    },

    // 15: Act 3 Router (Determines Act 3 Redux variant based on chosen route)
    act2_to_act3_bridge: {
      id: "act2_to_act3_bridge",
      type: "branch",
      title: "Router para Acto 3",
      transitions: [
        {
          targetNodeId: "act3_asteroids_redux_intro",
          priority: 10,
          condition: { type: "flag", key: "route_space_invaders", value: true }
        },
        {
          targetNodeId: "act3_spaceinvaders_redux_intro",
          priority: 5,
          condition: { type: "flag", key: "route_flappy_bird", value: true }
        },
        {
          targetNodeId: "act3_asteroids_redux_intro",
          priority: 0
        }
      ]
    },

    // 16: Act 3 Asteroids Redux Intro
    act3_asteroids_redux_intro: {
      id: "act3_asteroids_redux_intro",
      type: "cutscene",
      title: "Retorno al Cinturón de Asteroides",
      cutscene: {
        id: "cs_trans_asteroids_redux",
        transitionEffect: "fade",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Regresando al sector alfa. La densidad de asteroides ha alcanzado nivel crítico." },
          { speakerName: "AI ODYSSEY 7", textKey: "Ajuste de dificultad aplicado: Detección táctica avanzada requerida." }
        ]
      },
      transitions: [{ targetNodeId: "act3_asteroids_redux_gameplay" }]
    },

    // 17: Act 3 Asteroids Redux Gameplay
    act3_asteroids_redux_gameplay: {
      id: "act3_asteroids_redux_gameplay",
      type: "gameplay",
      title: "Acto 3: Asteroids Clímax",
      sceneToLoad: "asteroids",
      checkpoint: true,
      meta: {
        minijuego: "asteroids",
        encounterId: "poc-asteroids-redux-1"
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

    // 18: Act 3 Space Invaders Redux Intro
    act3_spaceinvaders_redux_intro: {
      id: "act3_spaceinvaders_redux_intro",
      type: "cutscene",
      title: "Ataque Final Invasor",
      cutscene: {
        id: "cs_trans_si_redux",
        transitionEffect: "IrisTransition",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Nodriza enemiga detectada. La armada invasora ha lanzado un contraataque total." },
          { speakerName: "AI ODYSSEY 7", textKey: "Dificultad pesadilla activada. Resista hasta el último impacto." }
        ]
      },
      transitions: [{ targetNodeId: "act3_spaceinvaders_redux_gameplay" }]
    },

    // 19: Act 3 Space Invaders Redux Gameplay
    act3_spaceinvaders_redux_gameplay: {
      id: "act3_spaceinvaders_redux_gameplay",
      type: "gameplay",
      title: "Acto 3: Space Invaders Clímax",
      sceneToLoad: "space-invaders",
      checkpoint: true,
      meta: {
        minijuego: "space-invaders",
        encounterId: "poc-spaceinvaders-redux-1"
      },
      objective: {
        id: "repel-final-fleet",
        titleKey: "Repele la flota final",
        descriptionKey: "Elimina 3 oleadas finales de invasores pesados",
        targetCount: 3,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "final_evaluation_branch",
          condition: { type: "objective", key: "repel-final-fleet", operator: "==", value: true }
        }
      ]
    },

    // 20: Final Evaluation Branch
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

    // 21: Flawless Victory Ending (Terminal Leaf Node)
    ending_flawless: {
      id: "ending_flawless",
      type: "cutscene",
      title: "Final: Victoria Impecable",
      isEndNode: true,
      cutscene: {
        id: "cs_ending_flawless",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Victoria Impecable. Todos los sectores limpios y suministros resguardados." },
          { speakerName: "COMMANDER", textKey: "La estación está a salvo. Misión cumplida." }
        ]
      }
    },

    // 22: Pyrrhic Victory Ending (Terminal Leaf Node)
    ending_pyrrhic: {
      id: "ending_pyrrhic",
      type: "cutscene",
      title: "Final: Victoria Pirrórica",
      isEndNode: true,
      cutscene: {
        id: "cs_ending_pyrrhic",
        dialogueQueue: [
          { speakerName: "AI ODYSSEY 7", textKey: "Sobrevivimos al ataque, pero los sistemas sufrieron daños significativos." },
          { speakerName: "COMMANDER", textKey: "Una victoria amarga, pero seguimos de pie." }
        ]
      }
    },

    // 23: Survival Ending (Terminal Leaf Node)
    ending_survival: {
      id: "ending_survival",
      type: "cutscene",
      title: "Final: Supervivencia",
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
