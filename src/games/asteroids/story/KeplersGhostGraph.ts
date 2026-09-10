import { StoryGraph } from "@tiny-aster/core";
import { ESCAPE_ROUTE_01_ENCOUNTER_ID } from "./EscapeRouteEncounter";
import { KEPLER_PHASE2_ENCOUNTER_ID, KEPLER_PHASE3_ENCOUNTER_ID } from "./KeplerEncounters";

/**
 * KEPLER'S GHOST STORY GRAPH
 * Multi-act branching campaign for Asteroids:
 * Act 1: Escape from Debris Field & Initial Attack
 * Tactical Choice Branch: Frontal Attack vs Stealth Bypass vs Signal Investigation
 * Act 2: Quarantine Zone & Helios Extractive's "Arcane Project"
 * Act 3: The Kepler Core Climax
 * 4 Distinct Terminal Endings:
 * - Flawless (Kepler's Ghost)
 * - Pyrrhic (Transmitted but Intercepted)
 * - Lost Signal (Erased from Records)
 * - Merged (Fused with the Swarm)
 *
 * @public
 */
export const keplersGhostStoryGraph: StoryGraph = {
  id: "asteroids_story_graph",
  title: "Kepler's Ghost: Asteroids Narrative Campaign",
  entryNodeId: "ast_intro_dialogue",

  characters: {
    ai: { id: "AI_ODYSSEY_7", name: "AI ODISEA-7" },
    okonkwo: { id: "ING_OKONKWO", name: "Ing. Okonkwo" },
    reyes: { id: "CMDT_REYES", name: "Cmdt. Reyes" },
    player: { id: "PILOT", name: "Piloto" }
  },

  nodes: {
    // 01: Intro Dialogue
    ast_intro_dialogue: {
      id: "ast_intro_dialogue",
      type: "dialogue",
      title: "Cinturón Kepler-791: Señal de Auxilio",
      dialogue: {
        id: "diag_ast_intro",
        lines: [
          { speakerName: "AI ODISEA-7", textKey: "Alerta sectorial. ODISEA-7 a la deriva en el cinturón Kepler-791." },
          { speakerName: "Ing. Okonkwo", textKey: "Log #01: La carga del Sector 4 no era mineral... estaba viva." },
          { speakerName: "Cmdt. Reyes", textKey: "Señal de auxilio emitida. Frecuencia bloqueada por polvo ionizado." }
        ]
      },
      transitions: [
        {
          targetNodeId: "ast_phase1_cutscene",
          condition: { type: "event", key: "dialogue:completed" }
        }
      ]
    },

    // 02: Phase 1 Cutscene Deployment
    ast_phase1_cutscene: {
      id: "ast_phase1_cutscene",
      type: "cutscene",
      title: "Despliegue en Campo de Escombros",
      cutscene: {
        id: "cs_ast_phase1_deploy",
        transitionEffect: "CRTGlitchTransition",
        dialogueQueue: [
          { speakerName: "SISTEMA", textKey: "Iniciando secuencia de motores de maniobra." },
          { speakerName: "AI ODISEA-7", textKey: "Escombros de alta densidad detectados. Atraviese el sector inicial." }
        ]
      },
      transitions: [{ targetNodeId: "ast_gameplay_phase1" }]
    },

    // 03: Phase 1 Gameplay
    ast_gameplay_phase1: {
      id: "ast_gameplay_phase1",
      type: "gameplay",
      title: "Fase 1: Escape del Campo de Escombros",
      sceneToLoad: "asteroids",
      checkpoint: true,
      meta: {
        minijuego: "asteroids",
        encounterId: ESCAPE_ROUTE_01_ENCOUNTER_ID
      },
      objective: {
        id: "obj_ast_phase1",
        titleKey: "Escapa del campo de escombros",
        descriptionKey: "Alcanza la puntuación requerida esquivando asteroides",
        targetCount: 1000,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "ast_choice_branch",
          condition: { type: "objective", key: "obj_ast_phase1", operator: "==", value: true }
        }
      ]
    },

    // 04: Tactical Choice Branch
    ast_choice_branch: {
      id: "ast_choice_branch",
      type: "choice",
      title: "Elección Táctica en el Cinturón",
      dialogue: {
        id: "dlg_ast_choice",
        lines: [
          { speakerName: "AI ODISEA-7", textKey: "Drones de contención de Helios Extractive aproximándose en radar." },
          { speakerName: "Ing. Okonkwo", textKey: "Al dispararles se dividen y aceleran. El impacto los alimenta." },
          { speakerName: "AI ODISEA-7", textKey: "Seleccione vector de navegación:" }
        ]
      },
      choices: [
        {
          id: "ast_choice_attack",
          titleKey: "Ataque Frontal Directo",
          descriptionKey: "Enfrentar la patrulla de Helios Extractive con máxima potencia.",
          targetNodeId: "ast_phase2_intro_attack",
          effects: [
            { type: "setFlag", key: "ast_path_attack", value: true }
          ]
        },
        {
          id: "ast_choice_stealth",
          titleKey: "Maniobra de Infiltración en Sigilo",
          descriptionKey: "Evadir los sensores del enjambre ajustando firmas térmicas.",
          targetNodeId: "ast_phase2_intro_stealth",
          effects: [
            { type: "setFlag", key: "ast_path_stealth", value: true }
          ]
        },
        {
          id: "ast_choice_investigate",
          titleKey: "Investigar Transmisión de la ODISEA-7",
          descriptionKey: "Rastrear la caja negra en busca de datos del Proyecto Arcano.",
          targetNodeId: "ast_phase2_intro_investigate",
          effects: [
            { type: "setFlag", key: "ast_path_investigate", value: true }
          ]
        }
      ]
    },

    // 05a: Phase 2 Intro - Attack
    ast_phase2_intro_attack: {
      id: "ast_phase2_intro_attack",
      type: "dialogue",
      title: "Ruta de Combate Directo",
      dialogue: {
        id: "dlg_ast_p2_attack",
        lines: [
          { speakerName: "Cmdt. Reyes", textKey: "Log #22: ¡No son naves de socorro! Tienen el emblema de Helios Extractive." },
          { speakerName: "AI ODISEA-7", textKey: "Armamento optimizado. Brecha en la zona de cuarentena iniciada." }
        ]
      },
      transitions: [{ targetNodeId: "ast_gameplay_phase2" }]
    },

    // 05b: Phase 2 Intro - Stealth
    ast_phase2_intro_stealth: {
      id: "ast_phase2_intro_stealth",
      type: "dialogue",
      title: "Ruta de Sigilo",
      dialogue: {
        id: "dlg_ast_p2_stealth",
        lines: [
          { speakerName: "Ing. Okonkwo", textKey: "Log #18: Si mantengo el ritmo de disparo, la densidad del campo disminuye." },
          { speakerName: "AI ODISEA-7", textKey: "Firma reducida. Escudos auxiliares cargados." }
        ]
      },
      transitions: [{ targetNodeId: "ast_gameplay_phase2" }]
    },

    // 05c: Phase 2 Intro - Investigate
    ast_phase2_intro_investigate: {
      id: "ast_phase2_intro_investigate",
      type: "dialogue",
      title: "Ruta de Investigación",
      dialogue: {
        id: "dlg_ast_p2_investigate",
        lines: [
          { speakerName: "Ing. Okonkwo", textKey: "Log #33: Encontré la clave del 'Proyecto Arcano': cultivan la resonancia del enjambre como arma." },
          { speakerName: "AI ODISEA-7", textKey: "Datos de la caja negra detectados en las lecturas de telemetría." }
        ]
      },
      transitions: [{ targetNodeId: "ast_gameplay_phase2" }]
    },

    // 06: Phase 2 Gameplay
    ast_gameplay_phase2: {
      id: "ast_gameplay_phase2",
      type: "gameplay",
      title: "Fase 2: Zona de Cuarentena y Proyecto Arcano",
      sceneToLoad: "asteroids",
      checkpoint: true,
      meta: {
        minijuego: "asteroids",
        encounterId: KEPLER_PHASE2_ENCOUNTER_ID
      },
      objective: {
        id: "obj_ast_phase2",
        titleKey: "Infiltra la zona de cuarentena",
        descriptionKey: "Supera la densidad de campo y asegúrate de sobrevivir",
        targetCount: 2500,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "ast_eval_phase2",
          condition: { type: "objective", key: "obj_ast_phase2", operator: "==", value: true }
        }
      ]
    },

    // 07: Phase 2 Branch Evaluation
    ast_eval_phase2: {
      id: "ast_eval_phase2",
      type: "branch",
      title: "Evaluación de la Zona de Cuarentena",
      transitions: [
        {
          targetNodeId: "ast_phase3_intro_decrypted",
          priority: 10,
          condition: { type: "flag", key: "blackBoxDecrypted", value: true }
        },
        {
          targetNodeId: "ast_phase3_intro_standard",
          priority: 0
        }
      ]
    },

    // 08a: Phase 3 Intro - Decrypted Secrets
    ast_phase3_intro_decrypted: {
      id: "ast_phase3_intro_decrypted",
      type: "cutscene",
      title: "Revelación del Proyecto Arcano",
      cutscene: {
        id: "cs_ast_p3_decrypted",
        transitionEffect: "CRTGlitchTransition",
        dialogueQueue: [
          { speakerName: "Ing. Okonkwo", textKey: "Log #41: Helios probó la red nanotecnológica en los mineros sin aviso." },
          { speakerName: "Cmdt. Reyes", textKey: "Log #79: Para quien encuentre esto: Helios Extractive nos sacrificó por una patente." },
          { speakerName: "AI ODISEA-7", textKey: "Transmisión hacia la Tierra lista. Ingresando al Núcleo de Kepler." }
        ]
      },
      transitions: [{ targetNodeId: "ast_gameplay_phase3" }]
    },

    // 08b: Phase 3 Intro - Standard
    ast_phase3_intro_standard: {
      id: "ast_phase3_intro_standard",
      type: "cutscene",
      title: "Aproximación al Núcleo",
      cutscene: {
        id: "cs_ast_p3_standard",
        transitionEffect: "FadeTransition",
        dialogueQueue: [
          { speakerName: "Piloto", textKey: "Log #53: Si alcanzo el borde exterior, la transmisión llegará a la Tierra." },
          { speakerName: "AI ODISEA-7", textKey: "Densidad máxima. El horizonte de sucesos del enjambre está activo." }
        ]
      },
      transitions: [{ targetNodeId: "ast_gameplay_phase3" }]
    },

    // 09: Phase 3 Gameplay (The Core Climax)
    ast_gameplay_phase3: {
      id: "ast_gameplay_phase3",
      type: "gameplay",
      title: "Fase 3: El Núcleo de Kepler",
      sceneToLoad: "asteroids",
      checkpoint: true,
      meta: {
        minijuego: "asteroids",
        encounterId: KEPLER_PHASE3_ENCOUNTER_ID
      },
      objective: {
        id: "obj_ast_phase3",
        titleKey: "Sobrevive al Núcleo de Kepler",
        descriptionKey: "Destruye la masa central de fragmentos en el núcleo",
        targetCount: 5000,
        currentCount: 0,
        completed: false
      },
      transitions: [
        {
          targetNodeId: "ast_eval_final",
          condition: { type: "objective", key: "obj_ast_phase3", operator: "==", value: true }
        }
      ]
    },

    // 10: Final Ending Evaluation Branch
    ast_eval_final: {
      id: "ast_eval_final",
      type: "branch",
      title: "Determinación de Final de Kepler's Ghost",
      transitions: [
        {
          targetNodeId: "ending_kepler_ghost_flawless",
          priority: 30,
          condition: {
            any: [
              { type: "flag", key: "keplerFlawlessRun", value: true },
              {
                all: [
                  { type: "flag", key: "quarantineFlawless", value: true },
                  { type: "flag", key: "blackBoxDecrypted", value: true }
                ]
              }
            ]
          }
        },
        {
          targetNodeId: "ending_kepler_ghost_merged",
          priority: 20,
          condition: { type: "flag", key: "swarmMerged", value: true }
        },
        {
          targetNodeId: "ending_kepler_ghost_pyrrhic",
          priority: 10,
          condition: {
            any: [
              { type: "flag", key: "quarantineBreached", value: true },
              { type: "flag", key: "coreOvercharged", value: true }
            ]
          }
        },
        {
          targetNodeId: "ending_kepler_ghost_lost_signal",
          priority: 0
        }
      ]
    },

    // 11: Terminal Ending 1 - Flawless (The Kepler Ghost)
    ending_kepler_ghost_flawless: {
      id: "ending_kepler_ghost_flawless",
      type: "cutscene",
      title: "Final: El Fantasma de Kepler (Impecable)",
      isEndNode: true,
      effects: [
        { type: "setFlag", key: "ending_flawless_unlocked", value: true }
      ],
      cutscene: {
        id: "cs_end_flawless",
        transitionEffect: "CRTGlitchTransition",
        dialogueQueue: [
          { speakerName: "AI ODISEA-7", textKey: "Transmisión completada al 100%. Señal recibida en la Tierra." },
          { speakerName: "Piloto", textKey: "Te convertiste en el Fantasma de Kepler. La verdad sobre Helios Extractive, expuesta." }
        ]
      }
    },

    // 12: Terminal Ending 2 - Pyrrhic (Intercepted)
    ending_kepler_ghost_pyrrhic: {
      id: "ending_kepler_ghost_pyrrhic",
      type: "cutscene",
      title: "Final: Victoria Pirrórica",
      isEndNode: true,
      effects: [
        { type: "setFlag", key: "ending_pyrrhic_unlocked", value: true }
      ],
      cutscene: {
        id: "cs_end_pyrrhic",
        transitionEffect: "CRTGlitchTransition",
        dialogueQueue: [
          { speakerName: "AI ODISEA-7", textKey: "La caja negra fue transmitida..." },
          { speakerName: "Piloto", textKey: "pero los drones de Helios interceptaron tu escape a un paso de la Tierra." }
        ]
      }
    },

    // 13: Terminal Ending 3 - Lost Signal
    ending_kepler_ghost_lost_signal: {
      id: "ending_kepler_ghost_lost_signal",
      type: "cutscene",
      title: "Final: Señal Perdida",
      isEndNode: true,
      effects: [
        { type: "setFlag", key: "ending_lost_unlocked", value: true }
      ],
      cutscene: {
        id: "cs_end_lost",
        transitionEffect: "FadeTransition",
        dialogueQueue: [
          { speakerName: "AI ODISEA-7", textKey: "TRANSMISIÓN PERDIDA — Nivel Crítico Alcanzado." },
          { speakerName: "Piloto", textKey: "Tu señal se apagó en el cinturón Kepler-791. Helios Extractive borró todo registro de la ODISEA-7." }
        ]
      }
    },

    // 14: Terminal Ending 4 - Swarm Merged
    ending_kepler_ghost_merged: {
      id: "ending_kepler_ghost_merged",
      type: "cutscene",
      title: "Final: Fusión con el Enjambre",
      isEndNode: true,
      effects: [
        { type: "setFlag", key: "ending_merged_unlocked", value: true }
      ],
      cutscene: {
        id: "cs_end_merged",
        transitionEffect: "PixelateTransition",
        dialogueQueue: [
          { speakerName: "Piloto", textKey: "Log #62: El enjambre ya no me ataca a mí... ataca a los drones de Helios." },
          { speakerName: "AI ODISEA-7", textKey: "Te fusionaste por completo con el enjambre. Tu eco orbitará para siempre los radares de Helios." }
        ]
      }
    }
  }
};
