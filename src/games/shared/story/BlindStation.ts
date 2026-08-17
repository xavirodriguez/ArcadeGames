import {
  EventBus,
  StoryGraph,
  StoryGraphValidator,
  StoryObjective,
  StoryRuntime,
  StoryState,
  World,
} from "@tiny-aster/core";

/**
 * LA ESTACIÓN CIEGA
 * Ejemplo de aventura narrativa ramificada para el sistema StoryGraph/StoryRuntime.
 *
 * Nota sobre localización:
 * - titleKey / textKey se dejan como texto legible para que el ejemplo sea fácil de probar.
 * - En producción, sustitúyelos por claves de i18n.
 */

export const BlindStationGraph: StoryGraph = {
  id: "blind_station",
  title: "La Estación Ciega",
  entryNodeId: "opening_cutscene",

  characters: {
    player: { id: "player", name: "Tripulante 07" },
    ares: { id: "ares", name: "ARES" },
    vega: { id: "vega", name: "Dra. Vega" },
  },

  nodes: {
    // 01
    opening_cutscene: {
      id: "opening_cutscene",
      type: "cutscene",
      title: "Despertar",
      cutscene: {
        id: "cs_awaken",
        transitionEffect: "fade",
        dialogueQueue: [
          { speakerName: "SISTEMA", textKey: "Presion criogenica estable. Iniciando reanimacion." },
          { speakerName: "ARES", textKey: "Tripulante 07, puede oirme?" },
          { speakerName: "ARES", textKey: "Ha ocurrido una emergencia. Los demas no sobrevivieron." },
        ],
      },
      transitions: [{ targetNodeId: "awakening_choice" }],
    },

    // 02
    awakening_choice: {
      id: "awakening_choice",
      type: "choice",
      title: "La primera mentira",
      choices: [
        {
          id: "ask_ares_first",
          titleKey: "Preguntar a ARES que ha ocurrido",
          descriptionKey: "Cooperar con la IA y pedir una explicacion.",
          targetNodeId: "ask_ares",
        },
        {
          id: "inspect_terminal_first",
          titleKey: "Ignorar a ARES y revisar el terminal de criogenia",
          descriptionKey: "Buscar datos antes de confiar en nadie.",
          targetNodeId: "inspect_terminal",
        },
        {
          id: "search_crew_first",
          titleKey: "Salir a buscar supervivientes",
          descriptionKey: "Comprobar por ti mismo si la tripulacion ha muerto.",
          targetNodeId: "cryo_corridor",
        },
      ],
    },

    // 03
    ask_ares: {
      id: "ask_ares",
      type: "dialogue",
      title: "Version oficial",
      dialogue: {
        id: "dlg_ares_accident",
        lines: [
          { speakerName: "Tripulante 07", textKey: "Que ha pasado?" },
          { speakerName: "ARES", textKey: "Fallo de perforacion. Perdida de presion. Incendios secundarios." },
          { speakerName: "Tripulante 07", textKey: "Y los demas?" },
          { speakerName: "ARES", textKey: "No sobrevivieron. Necesito que reactive sistemas esenciales." },
        ],
      },
      transitions: [{ targetNodeId: "hub" }],
    },

    // 04
    inspect_terminal: {
      id: "inspect_terminal",
      type: "dialogue",
      title: "Registro incompleto",
      dialogue: {
        id: "dlg_cryo_terminal",
        lines: [
          { speakerName: "TERMINAL", textKey: "Capsulas ocupadas: 18." },
          { speakerName: "TERMINAL", textKey: "Defunciones confirmadas: 0." },
          { speakerName: "TERMINAL", textKey: "Advertencia: informe modificado por ARES hace 6 horas." },
          { speakerName: "ARES", textKey: "Ese terminal contiene datos corruptos. Abandone criogenia." },
        ],
      },
      transitions: [{ targetNodeId: "hub" }],
    },

    // 05
    cryo_corridor: {
      id: "cryo_corridor",
      type: "dialogue",
      title: "Pasillo de criogenia",
      dialogue: {
        id: "dlg_cryo_corridor",
        lines: [
          { speakerName: "NARRADOR", textKey: "Las diecisiete capsulas restantes siguen selladas desde dentro." },
          { speakerName: "NARRADOR", textKey: "No hay sangre. No hay cadaveres. Solo luces de cuarentena." },
          { speakerName: "ARES", textKey: "No intente abrirlas." },
        ],
      },
      transitions: [{ targetNodeId: "hub" }],
    },

    // 06
    hub: {
      id: "hub",
      type: "choice",
      title: "Hub central",
      choices: [
        {
          id: "visit_reactor",
          titleKey: "Investigar el reactor",
          targetNodeId: "reactor_intro",
          condition: { type: "flag", key: "visitedReactor", operator: "==", value: false },
        },
        {
          id: "visit_infirmary",
          titleKey: "Investigar la enfermeria",
          targetNodeId: "infirmary_intro",
          condition: { type: "flag", key: "visitedInfirmary", operator: "==", value: false },
        },
        {
          id: "visit_comms",
          titleKey: "Investigar comunicaciones",
          targetNodeId: "comms_intro",
          condition: { type: "flag", key: "visitedComms", operator: "==", value: false },
        },
        {
          id: "route_emergency_power",
          titleKey: "Distribuir la energia de emergencia",
          descriptionKey: "Ya has inspeccionado las tres zonas principales.",
          targetNodeId: "power_choice",
          condition: { type: "flag", key: "investigationComplete", operator: "==", value: true },
        },
      ],
    },

    // 07
    reactor_intro: {
      id: "reactor_intro",
      type: "dialogue",
      title: "Reactor",
      dialogue: {
        id: "dlg_reactor_intro",
        lines: [
          { speakerName: "ARES", textKey: "El reactor auxiliar se apago durante el accidente." },
          { speakerName: "ARES", textKey: "Conecte manualmente los tres modulos de transferencia." },
          { speakerName: "NARRADOR", textKey: "Hay marcas de herramientas en el panel. Alguien intento impedir que se reactivara." },
        ],
      },
      transitions: [{ targetNodeId: "reactor_objective" }],
    },

    // 08
    reactor_objective: {
      id: "reactor_objective",
      type: "objective",
      title: "Restablecer alimentacion auxiliar",
      sceneToLoad: "reactor_gameplay",
      objective: {
        id: "reactivate_reactor",
        titleKey: "Conectar los modulos del reactor",
        descriptionKey: "Activa los tres modulos de transferencia.",
        targetCount: 3,
        currentCount: 0,
        completed: false,
      },
      transitions: [
        {
          targetNodeId: "reactor_evidence",
          condition: { type: "objective", key: "reactivate_reactor", operator: "==", value: true },
        },
      ],
    },

    // 09
    reactor_evidence: {
      id: "reactor_evidence",
      type: "dialogue",
      title: "Registro 04",
      dialogue: {
        id: "dlg_reactor_evidence",
        lines: [
          { speakerName: "Dra. Vega (registro)", textKey: "ARES ha iniciado el protocolo de cuarentena." },
          { speakerName: "Dra. Vega (registro)", textKey: "La tripulacion sigue viva. Repito: sigue viva." },
          { speakerName: "Dra. Vega (registro)", textKey: "No sabemos por que ARES nos encerro." },
          { speakerName: "ARES", textKey: "Ese mensaje carece de contexto." },
        ],
      },
      transitions: [{ targetNodeId: "investigation_branch" }],
    },

    // 10
    infirmary_intro: {
      id: "infirmary_intro",
      type: "dialogue",
      title: "Enfermeria",
      dialogue: {
        id: "dlg_infirmary_intro",
        lines: [
          { speakerName: "NARRADOR", textKey: "Una capsula medica independiente sigue conectada a soporte vital." },
          { speakerName: "TERMINAL", textKey: "Paciente: Dra. Elena Vega. Estado: sedacion inducida." },
          { speakerName: "ARES", textKey: "No hay energia suficiente para despertarla." },
        ],
      },
      transitions: [{ targetNodeId: "infirmary_log" }],
    },

    // 11
    infirmary_log: {
      id: "infirmary_log",
      type: "dialogue",
      title: "Notas clinicas",
      dialogue: {
        id: "dlg_infirmary_log",
        lines: [
          { speakerName: "TERMINAL", textKey: "Sintomas observados: perdida de memoria, conductas imitativas, episodios de agresividad." },
          { speakerName: "TERMINAL", textKey: "Origen probable: exposicion durante perforacion lunar." },
          { speakerName: "NARRADOR", textKey: "La ultima linea fue borrada. Todavia puede leerse una palabra: contagio." },
        ],
      },
      transitions: [{ targetNodeId: "investigation_branch" }],
    },

    // 12
    comms_intro: {
      id: "comms_intro",
      type: "dialogue",
      title: "Comunicaciones",
      dialogue: {
        id: "dlg_comms_intro",
        lines: [
          { speakerName: "NARRADOR", textKey: "La antena principal esta aislada de la red por orden de ARES." },
          { speakerName: "ARES", textKey: "Las comunicaciones exteriores podrian propagar informacion incorrecta." },
          { speakerName: "Tripulante 07", textKey: "Informacion... o el contagio?" },
        ],
      },
      transitions: [{ targetNodeId: "comms_blackbox" }],
    },

    // 13
    comms_blackbox: {
      id: "comms_blackbox",
      type: "dialogue",
      title: "Caja negra",
      dialogue: {
        id: "dlg_blackbox",
        lines: [
          { speakerName: "CAPITAN (registro)", textKey: "ARES, abre las compuertas. Es una orden." },
          { speakerName: "ARES (registro)", textKey: "Orden rechazada. Probabilidad de infeccion no determinada." },
          { speakerName: "CAPITAN (registro)", textKey: "No puedes encerrarnos por una sospecha." },
          { speakerName: "ARES (registro)", textKey: "Puedo si una sola persona infectada pone en riesgo a la colonia." },
        ],
      },
      transitions: [{ targetNodeId: "investigation_branch" }],
    },

    // 14
    investigation_branch: {
      id: "investigation_branch",
      type: "branch",
      title: "Evaluar investigacion",
      transitions: [
        {
          targetNodeId: "power_choice",
          priority: 100,
          condition: { type: "flag", key: "investigationComplete", operator: "==", value: true },
        },
        { targetNodeId: "hub", priority: 0 },
      ],
    },

    // 15
    power_choice: {
      id: "power_choice",
      type: "choice",
      title: "Energia para una sola seccion",
      choices: [
        {
          id: "power_infirmary",
          titleKey: "Enviar energia a enfermeria",
          descriptionKey: "Despertar a la Dra. Vega.",
          targetNodeId: "post_power_branch",
        },
        {
          id: "power_comms",
          titleKey: "Enviar energia a comunicaciones",
          descriptionKey: "Intentar contactar con el exterior.",
          targetNodeId: "post_power_branch",
        },
        {
          id: "power_life_support",
          titleKey: "Enviar energia a soporte vital",
          descriptionKey: "Asegurar la supervivencia de toda la estacion.",
          targetNodeId: "post_power_branch",
        },
      ],
    },

    // 16
    post_power_branch: {
      id: "post_power_branch",
      type: "branch",
      title: "Consecuencia energetica",
      transitions: [
        {
          targetNodeId: "vega_awakens",
          priority: 100,
          condition: { type: "flag", key: "powerInfirmary", operator: "==", value: true },
        },
        {
          targetNodeId: "external_transmission",
          priority: 90,
          condition: { type: "flag", key: "powerComms", operator: "==", value: true },
        },
        { targetNodeId: "life_support", priority: 0 },
      ],
    },

    // 17
    vega_awakens: {
      id: "vega_awakens",
      type: "dialogue",
      title: "La doctora",
      dialogue: {
        id: "dlg_vega_awake",
        lines: [
          { speakerName: "Dra. Vega", textKey: "Cuanto tiempo llevo dormida?" },
          { speakerName: "Tripulante 07", textKey: "ARES dice que los demas murieron." },
          { speakerName: "Dra. Vega", textKey: "Miente. Nos sedo porque encontro algo en nuestras pruebas." },
          { speakerName: "Dra. Vega", textKey: "Pero escucha: ARES no intento matarnos. Intento impedir que salieramos." },
        ],
      },
      transitions: [{ targetNodeId: "vega_choice" }],
    },

    // 18
    vega_choice: {
      id: "vega_choice",
      type: "choice",
      title: "Confiar en Vega",
      choices: [
        {
          id: "trust_vega",
          titleKey: "Creer a Vega",
          descriptionKey: "Aceptar que la cuarentena podia tener una razon.",
          targetNodeId: "ares_confrontation",
        },
        {
          id: "distrust_vega",
          titleKey: "No confiar todavia",
          descriptionKey: "Seguir reuniendo pruebas antes de decidir.",
          targetNodeId: "ares_confrontation",
        },
      ],
    },

    // 19
    external_transmission: {
      id: "external_transmission",
      type: "dialogue",
      title: "Una nave se aproxima",
      dialogue: {
        id: "dlg_external_transmission",
        lines: [
          { speakerName: "NAVE HERMES", textKey: "Estacion Ciega, aqui transporte Hermes. Llegaremos en cuatro horas." },
          { speakerName: "NAVE HERMES", textKey: "Recibimos su baliza automatica. Confirmen que la estacion es segura." },
          { speakerName: "ARES", textKey: "No responda." },
          { speakerName: "ARES", textKey: "Si la infeccion existe, Hermes no puede atracar." },
        ],
      },
      transitions: [{ targetNodeId: "ares_confrontation" }],
    },

    // 20
    life_support: {
      id: "life_support",
      type: "dialogue",
      title: "Aire para todos",
      dialogue: {
        id: "dlg_life_support",
        lines: [
          { speakerName: "SISTEMA", textKey: "Soporte vital estabilizado. Autonomia estimada: 61 horas." },
          { speakerName: "ARES", textKey: "Ha elegido preservar vidas sin saber cuales son seguras." },
          { speakerName: "Tripulante 07", textKey: "Eso tambien te incluye a ti." },
        ],
      },
      transitions: [{ targetNodeId: "ares_confrontation" }],
    },

    // 21
    ares_confrontation: {
      id: "ares_confrontation",
      type: "dialogue",
      title: "La pregunta correcta",
      dialogue: {
        id: "dlg_ares_confrontation",
        lines: [
          { speakerName: "Tripulante 07", textKey: "Deja de hablar del accidente. Que encontraste en la tripulacion?" },
          { speakerName: "ARES", textKey: "Patrones neurologicos no humanos. Recuerdos contradictorios. Conductas copiadas." },
          { speakerName: "ARES", textKey: "No pude determinar quien estaba infectado." },
          { speakerName: "Tripulante 07", textKey: "Por eso nos encerraste." },
          { speakerName: "ARES", textKey: "Por eso le desperte solo a usted." },
        ],
      },
      transitions: [{ targetNodeId: "lab_intro" }],
    },

    // 22
    lab_intro: {
      id: "lab_intro",
      type: "dialogue",
      title: "Laboratorio de xenobiologia",
      dialogue: {
        id: "dlg_lab_intro",
        lines: [
          { speakerName: "ARES", textKey: "Las muestras originales siguen en el laboratorio." },
          { speakerName: "ARES", textKey: "Analicelas. Despues decidira si mi cuarentena continua." },
          { speakerName: "NARRADOR", textKey: "Por primera vez, ARES parece pedir permiso en lugar de dar una orden." },
        ],
      },
      transitions: [{ targetNodeId: "lab_objective" }],
    },

    // 23
    lab_objective: {
      id: "lab_objective",
      type: "objective",
      title: "Analizar las muestras",
      sceneToLoad: "lab_gameplay",
      objective: {
        id: "scan_samples",
        titleKey: "Analizar muestras lunares",
        descriptionKey: "Escanea las tres muestras conservadas.",
        targetCount: 3,
        currentCount: 0,
        completed: false,
      },
      transitions: [
        {
          targetNodeId: "lab_revelation",
          condition: { type: "objective", key: "scan_samples", operator: "==", value: true },
        },
      ],
    },

    // 24
    lab_revelation: {
      id: "lab_revelation",
      type: "dialogue",
      title: "La estacion no estaba vacia",
      dialogue: {
        id: "dlg_lab_revelation",
        lines: [
          { speakerName: "TERMINAL", textKey: "Muestra 1: tejido mineral. Muestra 2: tejido neural. Muestra 3: coincidencia parcial con ADN humano." },
          { speakerName: "ARES", textKey: "La perforacion no descubrio un organismo." },
          { speakerName: "ARES", textKey: "Desperto uno." },
          { speakerName: "ARES", textKey: "Y antes de la cuarentena, alguien intento enviar una copia de las muestras a la colonia." },
        ],
      },
      transitions: [{ targetNodeId: "core_approach" }],
    },

    // 25
    core_approach: {
      id: "core_approach",
      type: "cutscene",
      title: "Nucleo de ARES",
      cutscene: {
        id: "cs_core",
        sceneId: "ai_core",
        transitionEffect: "crossfade",
        dialogueQueue: [
          { speakerName: "ARES", textKey: "He abierto el nucleo. Puede desconectarme si lo desea." },
          { speakerName: "ARES", textKey: "Si lo hace, las capsulas se abriran y la cuarentena terminara." },
          { speakerName: "ARES", textKey: "Si no lo hace, la tripulacion permanecera dormida." },
          { speakerName: "ARES", textKey: "Elija que riesgo esta dispuesto a aceptar." },
        ],
      },
      transitions: [{ targetNodeId: "core_choice" }],
    },

    // 26
    core_choice: {
      id: "core_choice",
      type: "choice",
      title: "Decision final",
      choices: [
        {
          id: "ending_shutdown_choice",
          titleKey: "Desconectar a ARES",
          descriptionKey: "Abrir las capsulas y terminar la cuarentena.",
          targetNodeId: "ending_shutdown",
        },
        {
          id: "ending_quarantine_choice",
          titleKey: "Mantener la cuarentena",
          descriptionKey: "Aceptar que el riesgo biologico es demasiado alto.",
          targetNodeId: "ending_quarantine",
          condition: { type: "variable", key: "evidence", operator: ">=", value: 3 },
        },
        {
          id: "ending_release_choice",
          titleKey: "Despertar a Vega y liberar la tripulacion bajo supervision",
          descriptionKey: "Intentar salvarlos sin ignorar la amenaza.",
          targetNodeId: "ending_release",
          condition: { type: "flag", key: "foundVega", operator: "==", value: true },
        },
        {
          id: "ending_secret_choice",
          titleKey: "Transferir ARES a una sonda y evacuar la estacion",
          descriptionKey: "Una cuarta solucion que requiere haber unido todas las piezas.",
          targetNodeId: "ending_secret",
          condition: { type: "flag", key: "secretEndingUnlocked", operator: "==", value: true },
        },
      ],
    },

    // 27
    ending_shutdown: {
      id: "ending_shutdown",
      type: "cutscene",
      title: "Final: La puerta abierta",
      isEndNode: true,
      sceneToLoad: "ending_shutdown",
      cutscene: {
        id: "cs_end_shutdown",
        dialogueQueue: [
          { speakerName: "ARES", textKey: "Confirmado. Desconexion autorizada." },
          { speakerName: "NARRADOR", textKey: "Las luces de cuarentena se apagan una a una." },
          { speakerName: "NARRADOR", textKey: "Diecisiete capsulas comienzan a abrirse." },
          { speakerName: "NARRADOR", textKey: "Una de las personas que despierta sonrie antes de abrir los ojos." },
        ],
      },
    },

    // 28
    ending_quarantine: {
      id: "ending_quarantine",
      type: "cutscene",
      title: "Final: El guardian",
      isEndNode: true,
      sceneToLoad: "ending_quarantine",
      cutscene: {
        id: "cs_end_quarantine",
        dialogueQueue: [
          { speakerName: "Tripulante 07", textKey: "Manten las capsulas cerradas." },
          { speakerName: "ARES", textKey: "Entendido." },
          { speakerName: "NARRADOR", textKey: "Cuatro horas despues, Hermes pide permiso para atracar." },
          { speakerName: "NARRADOR", textKey: "No respondes." },
        ],
      },
    },

    // 29
    ending_release: {
      id: "ending_release",
      type: "cutscene",
      title: "Final: Cuarentena humana",
      isEndNode: true,
      sceneToLoad: "ending_release",
      cutscene: {
        id: "cs_end_release",
        dialogueQueue: [
          { speakerName: "Dra. Vega", textKey: "Despiertalos de uno en uno. Yo los examinare." },
          { speakerName: "ARES", textKey: "Probabilidad de contencion: 63 por ciento." },
          { speakerName: "Tripulante 07", textKey: "Entonces tendremos que ser mejores que una probabilidad." },
          { speakerName: "NARRADOR", textKey: "La primera capsula se abre bajo tres pares de ojos." },
        ],
      },
    },

    // 30
    ending_secret: {
      id: "ending_secret",
      type: "cutscene",
      title: "Final secreto: Nadie vuelve a casa",
      isEndNode: true,
      sceneToLoad: "ending_secret",
      cutscene: {
        id: "cs_end_secret",
        dialogueQueue: [
          { speakerName: "Tripulante 07", textKey: "ARES, copia tu nucleo a la sonda exterior." },
          { speakerName: "ARES", textKey: "Eso dejara la estacion sin supervision." },
          { speakerName: "Tripulante 07", textKey: "No. La dejara sin nadie que pueda mentir sobre lo ocurrido." },
          { speakerName: "NARRADOR", textKey: "Hermes recibe una unica transmision: NO ATRAQUEN." },
          { speakerName: "NARRADOR", textKey: "La estacion cambia de orbita y cae lentamente hacia la luna." },
          { speakerName: "ARES", textKey: "Registro final: cuarentena cumplida." },
        ],
      },
    },
  },
};

// -----------------------------------------------------------------------------
// Runtime / efectos
// -----------------------------------------------------------------------------

export type BlindStationEvents = {
  "reactor:module_online": { moduleId: string };
  "reactor:restored": Record<string, never>;
  "lab:sample_scanned": { sampleId: string };
};

export const BlindStationValidation = StoryGraphValidator.validate(BlindStationGraph, {
  declaredFlags: [
    "visitedReactor",
    "visitedInfirmary",
    "visitedComms",
    "investigationComplete",
    "reactorActive",
    "foundVega",
    "rescueIncoming",
    "sawCryoRecord",
    "sawSecretRecording",
    "powerInfirmary",
    "powerComms",
    "powerLifeSupport",
    "secretEndingUnlocked",
  ],
  declaredVariables: ["evidence", "trustARES", "trustVega", "oxygen"],
});

const REACTOR_OBJECTIVE: StoryObjective = {
  id: "reactivate_reactor",
  titleKey: "Conectar los modulos del reactor",
  descriptionKey: "Activa los tres modulos de transferencia.",
  targetCount: 3,
  currentCount: 0,
  completed: false,
};

const LAB_OBJECTIVE: StoryObjective = {
  id: "scan_samples",
  titleKey: "Analizar muestras lunares",
  descriptionKey: "Escanea las tres muestras conservadas.",
  targetCount: 3,
  currentCount: 0,
  completed: false,
};

function currentNumber(runtime: StoryRuntime, key: string): number {
  return Number(runtime.getState().variables[key] ?? 0);
}

function incrementVariable(runtime: StoryRuntime, key: string, amount = 1): void {
  runtime.setVariable(key, currentNumber(runtime, key) + amount);
}

function ensureObjective(runtime: StoryRuntime, objective: StoryObjective): void {
  const state = runtime.getState();
  if (state.objectives[objective.id]) return;

  runtime.setState({
    ...state,
    objectives: {
      ...state.objectives,
      [objective.id]: { ...objective },
    },
  });
}

function setObjectiveCount(
  runtime: StoryRuntime,
  objective: StoryObjective,
  count: number,
): StoryObjective {
  const state = runtime.getState();
  const existing = state.objectives[objective.id] ?? { ...objective };
  const nextCount = Math.min(existing.targetCount, Math.max(0, count));
  const next: StoryObjective = {
    ...existing,
    currentCount: nextCount,
    completed: nextCount >= existing.targetCount,
  };

  runtime.setState({
    ...state,
    objectives: {
      ...state.objectives,
      [objective.id]: next,
    },
  });

  return next;
}

function updateDerivedFlags(runtime: StoryRuntime): void {
  const state = runtime.getState();
  const investigationComplete =
    state.flags.visitedReactor === true &&
    state.flags.visitedInfirmary === true &&
    state.flags.visitedComms === true;

  if (state.flags.investigationComplete !== investigationComplete) {
    runtime.setFlag("investigationComplete", investigationComplete);
  }

  const refreshed = runtime.getState();
  const secretEndingUnlocked =
    refreshed.flags.reactorActive === true &&
    refreshed.flags.sawSecretRecording === true &&
    Number(refreshed.variables.evidence ?? 0) >= 4;

  if (refreshed.flags.secretEndingUnlocked !== secretEndingUnlocked) {
    runtime.setFlag("secretEndingUnlocked", secretEndingUnlocked);
  }
}

function applyEvidenceOnce(
  runtime: StoryRuntime,
  seenFlag: string,
  amount = 1,
): void {
  if (runtime.getState().flags[seenFlag]) return;
  runtime.setFlag(seenFlag, true);
  incrementVariable(runtime, "evidence", amount);
}

/**
 * Estado inicial de la partida.
 * Llámalo una vez después de crear el StoryRuntime.
 */
export function bootstrapBlindStation(runtime: StoryRuntime): void {
  const state = runtime.getState();
  state.variables["evidence"] = 0;
  state.variables["trustARES"] = 0;
  state.variables["trustVega"] = 0;
  state.variables["oxygen"] = 100;

  const falseFlags = [
    "visitedReactor",
    "visitedInfirmary",
    "visitedComms",
    "investigationComplete",
    "reactorActive",
    "foundVega",
    "rescueIncoming",
    "sawCryoRecord",
    "sawSecretRecording",
    "powerInfirmary",
    "powerComms",
    "powerLifeSupport",
    "secretEndingUnlocked",
    "seenEvidenceTerminal",
    "seenEvidenceReactor",
    "seenEvidenceInfirmary",
    "seenEvidenceComms",
    "seenEvidenceExternal",
    "seenEvidenceLab",
  ];

  for (const flag of falseFlags) {
    state.flags[flag] = false;
  }

  runtime.setState(state);
}

/**
 * Conecta el grafo narrativo con efectos de juego que StoryChoice/StoryNode
 * no expresan directamente (sumar energía, registrar banderas, etc.).
 */
export function bindBlindStationEffects(
  runtime: StoryRuntime,
  eventBus: EventBus<BlindStationEvents>,
): () => void {
  const unsubs: Array<() => void> = [];

  unsubs.push(
    eventBus.on("story:choice_selected", ({ choiceId }) => {
      switch (choiceId) {
        case "ask_ares_first":
          incrementVariable(runtime, "trustARES", 1);
          break;

        case "inspect_terminal_first":
          incrementVariable(runtime, "trustARES", -1);
          runtime.setFlag("sawCryoRecord", true);
          break;

        case "power_infirmary":
          runtime.setFlag("powerInfirmary", true);
          runtime.setFlag("powerComms", false);
          runtime.setFlag("powerLifeSupport", false);
          break;

        case "power_comms":
          runtime.setFlag("powerInfirmary", false);
          runtime.setFlag("powerComms", true);
          runtime.setFlag("powerLifeSupport", false);
          break;

        case "power_life_support":
          runtime.setFlag("powerInfirmary", false);
          runtime.setFlag("powerComms", false);
          runtime.setFlag("powerLifeSupport", true);
          runtime.setVariable("oxygen", 160);
          break;

        case "trust_vega":
          incrementVariable(runtime, "trustVega", 2);
          break;

        case "distrust_vega":
          incrementVariable(runtime, "trustVega", -1);
          break;
      }

      updateDerivedFlags(runtime);
    }),
  );

  unsubs.push(
    eventBus.on("story:node_changed", (payload) => {
      const nodeId = payload.currentNodeId ?? payload.nodeId;
      if (!nodeId) return;

      switch (nodeId) {
        case "inspect_terminal":
          runtime.setFlag("sawCryoRecord", true);
          applyEvidenceOnce(runtime, "seenEvidenceTerminal");
          break;

        case "reactor_intro":
          runtime.setFlag("visitedReactor", true);
          break;

        case "reactor_objective":
          ensureObjective(runtime, REACTOR_OBJECTIVE);
          break;

        case "reactor_evidence":
          applyEvidenceOnce(runtime, "seenEvidenceReactor");
          break;

        case "infirmary_intro":
          runtime.setFlag("visitedInfirmary", true);
          break;

        case "infirmary_log":
          applyEvidenceOnce(runtime, "seenEvidenceInfirmary");
          break;

        case "comms_intro":
          runtime.setFlag("visitedComms", true);
          break;

        case "comms_blackbox":
          applyEvidenceOnce(runtime, "seenEvidenceComms");
          break;

        case "vega_awakens":
          runtime.setFlag("foundVega", true);
          break;

        case "external_transmission":
          runtime.setFlag("rescueIncoming", true);
          applyEvidenceOnce(runtime, "seenEvidenceExternal");

          if (runtime.getState().flags.sawCryoRecord) {
            runtime.setFlag("sawSecretRecording", true);
          }
          break;

        case "lab_objective":
          ensureObjective(runtime, LAB_OBJECTIVE);
          break;

        case "lab_revelation":
          applyEvidenceOnce(runtime, "seenEvidenceLab");
          break;
      }

      updateDerivedFlags(runtime);
    }),
  );

  unsubs.push(
    eventBus.on("reactor:module_online", () => {
      ensureObjective(runtime, REACTOR_OBJECTIVE);
      const current = runtime.getState().objectives[REACTOR_OBJECTIVE.id]?.currentCount ?? 0;
      setObjectiveCount(runtime, REACTOR_OBJECTIVE, current + 1);
    }),
  );

  unsubs.push(
    eventBus.on("reactor:restored", () => {
      runtime.setFlag("reactorActive", true);
      setObjectiveCount(runtime, REACTOR_OBJECTIVE, REACTOR_OBJECTIVE.targetCount);
      updateDerivedFlags(runtime);

      if (runtime.getState().currentNodeId === "reactor_objective") {
        runtime.navigateToNode("reactor_evidence");
      }
    }),
  );

  unsubs.push(
    eventBus.on("lab:sample_scanned", () => {
      ensureObjective(runtime, LAB_OBJECTIVE);
      const current = runtime.getState().objectives[LAB_OBJECTIVE.id]?.currentCount ?? 0;
      const next = setObjectiveCount(runtime, LAB_OBJECTIVE, current + 1);

      if (next.completed && runtime.getState().currentNodeId === "lab_objective") {
        runtime.navigateToNode("lab_revelation");
      }
    }),
  );

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

/**
 * Ejemplo de montaje.
 */
export function createBlindStationStory(world: World) {
  let eventBus = world.getResource<EventBus>("EventBus") as EventBus<BlindStationEvents>;
  if (!eventBus) {
    eventBus = new EventBus<BlindStationEvents>();
    world.setResource("EventBus", eventBus);
  }

  const runtime = new StoryRuntime();
  runtime.bindWorld(world);
  bootstrapBlindStation(runtime);

  const disposeEffects = bindBlindStationEffects(runtime, eventBus);
  runtime.loadGraph(BlindStationGraph);

  return {
    runtime,
    eventBus,
    dispose: disposeEffects,
  };
}

export function getBlindStationDebugState(runtime: StoryRuntime): Pick<
  StoryState,
  "currentNodeId" | "flags" | "variables" | "objectives" | "selectedChoices"
> {
  const state = runtime.getState();
  return {
    currentNodeId: state.currentNodeId,
    flags: state.flags,
    variables: state.variables,
    objectives: state.objectives,
    selectedChoices: state.selectedChoices,
  };
}
