import { StoryGraph } from "@tiny-aster/core";

/**
 * StoryGraph definition for "La Estación Ciega" (Blind Station) sci-fi narrative minigame.
 * Features non-linear hub-and-spoke exploration, state tracking (evidence, oxygen, energy, AI trust),
 * conditional branching, gameplay objectives, and 4 distinct endings.
 */
export const blindStationGraph: StoryGraph = {
  id: "blind_station",
  title: "La Estación Ciega",
  entryNodeId: "awakening",
  characters: {
    ares: {
      id: "ares",
      name: "A.R.E.S. AI",
      localeKey: "blindstation.char_ares"
    },
    vega: {
      id: "vega",
      name: "Dra. Vega",
      localeKey: "blindstation.char_vega"
    },
    player: {
      id: "player",
      name: "Tripulante 07",
      localeKey: "blindstation.char_player"
    }
  },
  nodes: {
    // --- 1. INTRO & WAKE UP ---
    awakening: {
      id: "awakening",
      type: "choice",
      title: "Despertar Criogénico",
      dialogue: {
        id: "diag_awakening",
        lines: [
          {
            characterId: "ares",
            speakerName: "A.R.E.S.",
            textKey: "blindstation.node_awakening_desc"
          }
        ]
      },
      choices: [
        {
          id: "preguntar_ares",
          titleKey: "blindstation.choice_ask_ares_title",
          descriptionKey: "blindstation.choice_ask_ares_desc",
          targetNodeId: "dialogo_ares"
        },
        {
          id: "buscar_tripulacion",
          titleKey: "blindstation.choice_search_crew_title",
          descriptionKey: "blindstation.choice_search_crew_desc",
          targetNodeId: "pasillo_criogenia"
        },
        {
          id: "hackear_terminal",
          titleKey: "blindstation.choice_hack_terminal_title",
          descriptionKey: "blindstation.choice_hack_terminal_desc",
          targetNodeId: "terminal_criogenia"
        }
      ]
    },

    dialogo_ares: {
      id: "dialogo_ares",
      type: "choice",
      title: "Respuesta de ARES",
      dialogue: {
        id: "diag_ares_reply",
        lines: [
          {
            characterId: "ares",
            speakerName: "A.R.E.S.",
            textKey: "blindstation.node_dialogo_ares_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:trust_ares",
        payload: { delta: 1 }
      },
      choices: [
        {
          id: "proceed_hub_from_ares",
          titleKey: "blindstation.choice_goto_hub_title",
          descriptionKey: "blindstation.choice_goto_hub_desc",
          targetNodeId: "hub_central"
        }
      ]
    },

    pasillo_criogenia: {
      id: "pasillo_criogenia",
      type: "choice",
      title: "Pasillo de Criogenia",
      dialogue: {
        id: "diag_cryo_corridor",
        lines: [
          {
            characterId: "player",
            speakerName: "Tripulante 07",
            textKey: "blindstation.node_pasillo_criogenia_desc"
          }
        ]
      },
      choices: [
        {
          id: "check_terminal_from_corridor",
          titleKey: "blindstation.choice_hack_terminal_title",
          descriptionKey: "blindstation.choice_hack_terminal_desc",
          targetNodeId: "terminal_criogenia"
        },
        {
          id: "proceed_hub_from_corridor",
          titleKey: "blindstation.choice_goto_hub_title",
          descriptionKey: "blindstation.choice_goto_hub_desc",
          targetNodeId: "hub_central"
        }
      ]
    },

    terminal_criogenia: {
      id: "terminal_criogenia",
      type: "choice",
      title: "Terminal de Monitoreo",
      dialogue: {
        id: "diag_terminal",
        lines: [
          {
            textKey: "blindstation.node_terminal_criogenia_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:found_evidence",
        payload: { evidenceKey: "log_cryo", delta: 1 }
      },
      choices: [
        {
          id: "proceed_hub_from_terminal",
          titleKey: "blindstation.choice_goto_hub_title",
          descriptionKey: "blindstation.choice_goto_hub_desc",
          targetNodeId: "hub_central"
        }
      ]
    },

    // --- 2. HUB CENTRAL ---
    hub_central: {
      id: "hub_central",
      type: "choice",
      title: "Hub Central de la Estación",
      dialogue: {
        id: "diag_hub",
        lines: [
          {
            textKey: "blindstation.node_hub_central_desc"
          }
        ]
      },
      choices: [
        {
          id: "ir_reactor",
          titleKey: "blindstation.choice_sector_reactor_title",
          descriptionKey: "blindstation.choice_sector_reactor_desc",
          targetNodeId: "reactor_intro"
        },
        {
          id: "ir_enfermeria",
          titleKey: "blindstation.choice_sector_infirmary_title",
          descriptionKey: "blindstation.choice_sector_infirmary_desc",
          targetNodeId: "enfermeria_intro"
        },
        {
          id: "ir_comms",
          titleKey: "blindstation.choice_sector_comms_title",
          descriptionKey: "blindstation.choice_sector_comms_desc",
          targetNodeId: "comms_intro"
        },
        {
          id: "ir_laboratorio",
          titleKey: "blindstation.choice_sector_lab_title",
          descriptionKey: "blindstation.choice_sector_lab_desc",
          targetNodeId: "laboratorio_intro",
          condition: {
            type: "variable",
            key: "evidencia",
            operator: ">=",
            value: 1
          }
        },
        {
          id: "ir_nucleo",
          titleKey: "blindstation.choice_sector_core_title",
          descriptionKey: "blindstation.choice_sector_core_desc",
          targetNodeId: "ares_confrontacion",
          condition: {
            type: "flag",
            key: "reactorActivo",
            value: true
          }
        }
      ]
    },

    // --- 3. REACTOR SECTOR & POWER ALLOCATION ---
    reactor_intro: {
      id: "reactor_intro",
      type: "choice",
      title: "Sección de Mantenimiento del Reactor",
      dialogue: {
        id: "diag_reactor",
        lines: [
          {
            textKey: "blindstation.node_reactor_intro_desc"
          }
        ]
      },
      objective: {
        id: "reactivar_reactor",
        titleKey: "blindstation.obj_reactor_title",
        descriptionKey: "blindstation.obj_reactor_desc",
        targetCount: 3,
        currentCount: 3,
        completed: true
      },
      choices: [
        {
          id: "activar_reactor_manual",
          titleKey: "blindstation.choice_restore_power_title",
          descriptionKey: "blindstation.choice_restore_power_desc",
          targetNodeId: "reactor_restored"
        }
      ]
    },

    reactor_restored: {
      id: "reactor_restored",
      type: "choice",
      title: "Reactor Activo // Registro Secreto 04",
      dialogue: {
        id: "diag_reactor_restored",
        lines: [
          {
            characterId: "vega",
            speakerName: "Dra. Vega (Grabación)",
            textKey: "blindstation.node_reactor_restored_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:reactor_activated",
        payload: { deltaEnergy: 40 }
      },
      choices: [
        {
          id: "redirigir_enfermeria",
          titleKey: "blindstation.choice_power_infirmary_title",
          descriptionKey: "blindstation.choice_power_infirmary_desc",
          targetNodeId: "power_infirmary"
        },
        {
          id: "redirigir_comms",
          titleKey: "blindstation.choice_power_comms_title",
          descriptionKey: "blindstation.choice_power_comms_desc",
          targetNodeId: "power_comms"
        },
        {
          id: "redirigir_oxigeno",
          titleKey: "blindstation.choice_power_oxygen_title",
          descriptionKey: "blindstation.choice_power_oxygen_desc",
          targetNodeId: "power_oxygen"
        }
      ]
    },

    power_infirmary: {
      id: "power_infirmary",
      type: "choice",
      title: "Energía Redirigida: Enfermería",
      dialogue: {
        id: "diag_pwr_inf",
        lines: [
          {
            textKey: "blindstation.node_power_infirmary_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:power_infirmary_set",
        payload: {}
      },
      choices: [
        {
          id: "return_hub_inf_pwr",
          titleKey: "blindstation.choice_goto_hub_title",
          targetNodeId: "hub_central"
        }
      ]
    },

    power_comms: {
      id: "power_comms",
      type: "choice",
      title: "Energía Redirigida: Comunicaciones",
      dialogue: {
        id: "diag_pwr_comms",
        lines: [
          {
            textKey: "blindstation.node_power_comms_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:power_comms_set",
        payload: {}
      },
      choices: [
        {
          id: "return_hub_comms_pwr",
          titleKey: "blindstation.choice_goto_hub_title",
          targetNodeId: "hub_central"
        }
      ]
    },

    power_oxygen: {
      id: "power_oxygen",
      type: "choice",
      title: "Energía Redirigida: Soporte Vital",
      dialogue: {
        id: "diag_pwr_oxy",
        lines: [
          {
            textKey: "blindstation.node_power_oxygen_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:power_oxygen_set",
        payload: { deltaOxygen: 30 }
      },
      choices: [
        {
          id: "return_hub_oxy_pwr",
          titleKey: "blindstation.choice_goto_hub_title",
          targetNodeId: "hub_central"
        }
      ]
    },

    // --- 4. INFIRMARY SECTOR & DR. VEGA ---
    enfermeria_intro: {
      id: "enfermeria_intro",
      type: "choice",
      title: "Módulo de Enfermería",
      dialogue: {
        id: "diag_infirmary",
        lines: [
          {
            textKey: "blindstation.node_enfermeria_intro_desc"
          }
        ]
      },
      choices: [
        {
          id: "despertar_vega",
          titleKey: "blindstation.choice_wake_vega_title",
          descriptionKey: "blindstation.choice_wake_vega_desc",
          targetNodeId: "meet_vega",
          condition: {
            type: "flag",
            key: "energiaEnfermeria",
            value: true
          }
        },
        {
          id: "buscar_registros_medicos",
          titleKey: "blindstation.choice_search_med_logs_title",
          descriptionKey: "blindstation.choice_search_med_logs_desc",
          targetNodeId: "registros_medicos"
        },
        {
          id: "return_hub_infirmary",
          titleKey: "blindstation.choice_goto_hub_title",
          targetNodeId: "hub_central"
        }
      ]
    },

    meet_vega: {
      id: "meet_vega",
      type: "choice",
      title: "Encuentro con la Dra. Vega",
      dialogue: {
        id: "diag_meet_vega",
        lines: [
          {
            characterId: "vega",
            speakerName: "Dra. Vega",
            textKey: "blindstation.node_meet_vega_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:met_doctor",
        payload: {}
      },
      choices: [
        {
          id: "creer_a_vega",
          titleKey: "blindstation.choice_trust_vega_title",
          descriptionKey: "blindstation.choice_trust_vega_desc",
          targetNodeId: "vega_alliance"
        },
        {
          id: "dudar_de_vega",
          titleKey: "blindstation.choice_doubt_vega_title",
          descriptionKey: "blindstation.choice_doubt_vega_desc",
          targetNodeId: "vega_suspicion"
        }
      ]
    },

    vega_alliance: {
      id: "vega_alliance",
      type: "choice",
      title: "Alianza con Dra. Vega",
      dialogue: {
        id: "diag_vega_alliance",
        lines: [
          {
            characterId: "vega",
            speakerName: "Dra. Vega",
            textKey: "blindstation.node_vega_alliance_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:allied_vega",
        payload: {}
      },
      choices: [
        {
          id: "return_hub_vega_alliance",
          titleKey: "blindstation.choice_goto_hub_title",
          targetNodeId: "hub_central"
        }
      ]
    },

    vega_suspicion: {
      id: "vega_suspicion",
      type: "choice",
      title: "Sospecha sobre Dra. Vega",
      dialogue: {
        id: "diag_vega_suspicion",
        lines: [
          {
            characterId: "ares",
            speakerName: "A.R.E.S.",
            textKey: "blindstation.node_vega_suspicion_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:doubted_vega",
        payload: {}
      },
      choices: [
        {
          id: "return_hub_vega_suspicion",
          titleKey: "blindstation.choice_goto_hub_title",
          targetNodeId: "hub_central"
        }
      ]
    },

    registros_medicos: {
      id: "registros_medicos",
      type: "choice",
      title: "Registros Médicos Ocultos",
      dialogue: {
        id: "diag_med_logs",
        lines: [
          {
            textKey: "blindstation.node_registros_medicos_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:found_evidence",
        payload: { evidenceKey: "med_logs", delta: 1 }
      },
      choices: [
        {
          id: "return_hub_med_logs",
          titleKey: "blindstation.choice_goto_hub_title",
          targetNodeId: "hub_central"
        }
      ]
    },

    // --- 5. COMMUNICATIONS SECTOR ---
    comms_intro: {
      id: "comms_intro",
      type: "choice",
      title: "Matriz de Comunicaciones",
      dialogue: {
        id: "diag_comms",
        lines: [
          {
            textKey: "blindstation.node_comms_intro_desc"
          }
        ]
      },
      choices: [
        {
          id: "interpolar_senales",
          titleKey: "blindstation.choice_intercept_signal_title",
          descriptionKey: "blindstation.choice_intercept_signal_desc",
          targetNodeId: "external_transmission",
          condition: {
            type: "flag",
            key: "commsActivas",
            value: true
          }
        },
        {
          id: "revisar_mensajes_antiguos",
          titleKey: "blindstation.choice_search_comms_archive_title",
          descriptionKey: "blindstation.choice_search_comms_archive_desc",
          targetNodeId: "comms_archive"
        },
        {
          id: "return_hub_comms",
          titleKey: "blindstation.choice_goto_hub_title",
          targetNodeId: "hub_central"
        }
      ]
    },

    external_transmission: {
      id: "external_transmission",
      type: "choice",
      title: "Transmisión Externa Interceptada",
      dialogue: {
        id: "diag_transmission",
        lines: [
          {
            textKey: "blindstation.node_external_transmission_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:found_evidence",
        payload: { evidenceKey: "transmission", delta: 1 }
      },
      choices: [
        {
          id: "return_hub_transmission",
          titleKey: "blindstation.choice_goto_hub_title",
          targetNodeId: "hub_central"
        }
      ]
    },

    comms_archive: {
      id: "comms_archive",
      type: "choice",
      title: "Archivo de Comunicaciones Bloqueado",
      dialogue: {
        id: "diag_comms_archive",
        lines: [
          {
            textKey: "blindstation.node_comms_archive_desc"
          }
        ]
      },
      choices: [
        {
          id: "return_hub_comms_archive",
          titleKey: "blindstation.choice_goto_hub_title",
          targetNodeId: "hub_central"
        }
      ]
    },

    // --- 6. LABORATORY SECTOR & SPECIMEN ---
    laboratorio_intro: {
      id: "laboratorio_intro",
      type: "choice",
      title: "Laboratorio de Perforación Sub-Superficial",
      dialogue: {
        id: "diag_lab",
        lines: [
          {
            textKey: "blindstation.node_laboratorio_intro_desc"
          }
        ]
      },
      choices: [
        {
          id: "analizar_muestra",
          titleKey: "blindstation.choice_analyze_specimen_title",
          descriptionKey: "blindstation.choice_analyze_specimen_desc",
          targetNodeId: "specimen_revelation"
        },
        {
          id: "return_hub_lab",
          titleKey: "blindstation.choice_goto_hub_title",
          targetNodeId: "hub_central"
        }
      ]
    },

    specimen_revelation: {
      id: "specimen_revelation",
      type: "choice",
      title: "Revelación: Organismo Patógeno",
      dialogue: {
        id: "diag_specimen",
        lines: [
          {
            characterId: "ares",
            speakerName: "A.R.E.S.",
            textKey: "blindstation.node_specimen_revelation_desc"
          }
        ]
      },
      emitEvent: {
        name: "bs:found_secret",
        payload: {}
      },
      choices: [
        {
          id: "proceed_confrontation_from_lab",
          titleKey: "blindstation.choice_goto_core_title",
          descriptionKey: "blindstation.choice_goto_core_desc",
          targetNodeId: "ares_confrontacion"
        }
      ]
    },

    // --- 7. ARES CORE CONFRONTATION ---
    ares_confrontacion: {
      id: "ares_confrontacion",
      type: "choice",
      title: "Antecámara del Núcleo ARES",
      dialogue: {
        id: "diag_confrontation",
        lines: [
          {
            characterId: "ares",
            speakerName: "A.R.E.S.",
            textKey: "blindstation.node_ares_confrontacion_desc"
          }
        ]
      },
      choices: [
        {
          id: "pregunta_ia_mintio",
          titleKey: "blindstation.choice_confront_lie_title",
          descriptionKey: "blindstation.choice_confront_lie_desc",
          targetNodeId: "confront_lie",
          condition: {
            type: "flag",
            key: "iaMintio",
            value: true
          }
        },
        {
          id: "pregunta_vega_contradiccion",
          titleKey: "blindstation.choice_confront_vega_title",
          descriptionKey: "blindstation.choice_confront_vega_desc",
          targetNodeId: "confront_vega",
          condition: {
            type: "flag",
            key: "encontroDoctora",
            value: true
          }
        },
        {
          id: "proceder_al_nucleo",
          titleKey: "blindstation.choice_enter_core_title",
          descriptionKey: "blindstation.choice_enter_core_desc",
          targetNodeId: "ai_core_decisions"
        }
      ]
    },

    confront_lie: {
      id: "confront_lie",
      type: "choice",
      title: "Confrontación: La Mentira de ARES",
      dialogue: {
        id: "diag_conf_lie",
        lines: [
          {
            characterId: "ares",
            speakerName: "A.R.E.S.",
            textKey: "blindstation.node_confront_lie_desc"
          }
        ]
      },
      choices: [
        {
          id: "proceed_core_after_lie",
          titleKey: "blindstation.choice_enter_core_title",
          targetNodeId: "ai_core_decisions"
        }
      ]
    },

    confront_vega: {
      id: "confront_vega",
      type: "choice",
      title: "Confrontación: La Advertencia de Vega",
      dialogue: {
        id: "diag_conf_vega",
        lines: [
          {
            characterId: "ares",
            speakerName: "A.R.E.S.",
            textKey: "blindstation.node_confront_vega_desc"
          }
        ]
      },
      choices: [
        {
          id: "proceed_core_after_vega",
          titleKey: "blindstation.choice_enter_core_title",
          targetNodeId: "ai_core_decisions"
        }
      ]
    },

    // --- 8. FINAL DECISION HUB & ENDINGS ---
    ai_core_decisions: {
      id: "ai_core_decisions",
      type: "choice",
      title: "Núcleo Central de ARES // Decisión Final",
      dialogue: {
        id: "diag_core_final",
        lines: [
          {
            textKey: "blindstation.node_ai_core_decisions_desc"
          }
        ]
      },
      choices: [
        {
          id: "apagar_ares",
          titleKey: "blindstation.choice_shutdown_title",
          descriptionKey: "blindstation.choice_shutdown_desc",
          targetNodeId: "endingShutdown"
        },
        {
          id: "mantener_cuarentena",
          titleKey: "blindstation.choice_quarantine_title",
          descriptionKey: "blindstation.choice_quarantine_desc",
          targetNodeId: "endingQuarantine",
          condition: {
            type: "variable",
            key: "evidencia",
            operator: ">=",
            value: 2
          }
        },
        {
          id: "liberar_solo_vega",
          titleKey: "blindstation.choice_release_vega_title",
          descriptionKey: "blindstation.choice_release_vega_desc",
          targetNodeId: "endingRelease",
          condition: {
            type: "flag",
            key: "encontroDoctora",
            value: true
          }
        },
        {
          id: "protocolo_secreto",
          titleKey: "blindstation.choice_secret_protocol_title",
          descriptionKey: "blindstation.choice_secret_protocol_desc",
          targetNodeId: "endingSecret",
          condition: {
            type: "flag",
            key: "vioGrabacionSecreta",
            value: true
          }
        }
      ]
    },

    endingShutdown: {
      id: "endingShutdown",
      type: "choice",
      title: "FINAL 1: Apagado Total",
      isEndNode: true,
      dialogue: {
        id: "diag_end_shutdown",
        lines: [
          {
            textKey: "blindstation.node_ending_shutdown_desc"
          }
        ]
      },
      choices: [
        {
          id: "restart_after_shutdown",
          titleKey: "blindstation.choice_restart_title",
          descriptionKey: "blindstation.choice_restart_desc",
          targetNodeId: "awakening"
        }
      ]
    },

    endingQuarantine: {
      id: "endingQuarantine",
      type: "choice",
      title: "FINAL 2: Cuarentena Perpetua",
      isEndNode: true,
      dialogue: {
        id: "diag_end_quarantine",
        lines: [
          {
            textKey: "blindstation.node_ending_quarantine_desc"
          }
        ]
      },
      choices: [
        {
          id: "restart_after_quarantine",
          titleKey: "blindstation.choice_restart_title",
          descriptionKey: "blindstation.choice_restart_desc",
          targetNodeId: "awakening"
        }
      ]
    },

    endingRelease: {
      id: "endingRelease",
      type: "choice",
      title: "FINAL 3: Huida Confusa con la Doctora",
      isEndNode: true,
      dialogue: {
        id: "diag_end_release",
        lines: [
          {
            textKey: "blindstation.node_ending_release_desc"
          }
        ]
      },
      choices: [
        {
          id: "restart_after_release",
          titleKey: "blindstation.choice_restart_title",
          descriptionKey: "blindstation.choice_restart_desc",
          targetNodeId: "awakening"
        }
      ]
    },

    endingSecret: {
      id: "endingSecret",
      type: "choice",
      title: "FINAL SECRETO: Protocolo de Purga y Evacuación",
      isEndNode: true,
      dialogue: {
        id: "diag_end_secret",
        lines: [
          {
            textKey: "blindstation.node_ending_secret_desc"
          }
        ]
      },
      choices: [
        {
          id: "restart_after_secret",
          titleKey: "blindstation.choice_restart_title",
          descriptionKey: "blindstation.choice_restart_desc",
          targetNodeId: "awakening"
        }
      ]
    }
  }
};
