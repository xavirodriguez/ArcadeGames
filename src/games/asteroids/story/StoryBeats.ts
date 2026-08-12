/** @public */
export interface StoryBeat {
  chapterTitle?: string;
  readyText: string;
  intermissionTitle?: string;
  intermissionSub?: string;
}

/**
 * Returns the story beat configuration for a given level.
 * @public
 */
export function getStoryBeatForLevel(level: number): StoryBeat {
  if (level <= 2) {
    return {
      readyText: "ODISEA-7 A LA DERIVA",
      intermissionTitle: "Capítulo 1: Silencio en el Cinturón — completado",
      intermissionSub: "Algo se mueve entre los escombros...",
    };
  } else if (level <= 4) {
    const readyText = level === 3 ? "NIVEL 3 — LOS FRAGMENTOS SE MULTIPLICAN" : "NIVEL 4 — CONTACTO CONFIRMADO";
    return {
      readyText,
      intermissionTitle: "Capítulo 2: El Enjambre Despierta — completado",
      intermissionSub: "Señales extrañas detectadas...",
    };
  } else if (level <= 6) {
    return {
      readyText: `NIVEL ${level}`,
      intermissionTitle: "Capítulo 3: No estás solo aquí fuera.",
      intermissionSub: "Drones de contención aproximándose...",
    };
  } else if (level <= 8) {
    const readyText = level === 7 ? "ZONA RESTRINGIDA" : "HELIOS-EXT: ABANDONE EL SECTOR";
    return {
      readyText,
      intermissionTitle: "Capítulo 4: La Zona de Cuarentena — completado",
      intermissionSub: "Sistemas bajo interferencia...",
    };
  } else if (level <= 10) {
    const readyText = level === 9 ? "NIVEL 9 — APROXIMÁNDOSE AL NÚCLEO" : `NIVEL ${level}`;
    return {
      readyText,
      intermissionTitle: "Capítulo 5: El Núcleo — completado",
      intermissionSub: "Aproximándose al horizonte de sucesos...",
    };
  } else {
    return {
      readyText: `TRANSMISIÓN PERDIDA — NIVEL ${level}`,
      intermissionTitle: "Capítulo 6: Kepler's Ghost",
      intermissionSub: "El enjambre se expande indefinidamente...",
    };
  }
}

/**
 * Gets the alternative ending text based on the reached level and score.
 * @public
 */
export function getStoryEnding(level: number, score: number, highScore: number): string {
  if (level < 5) {
    return "Tu señal se apagó en el cinturón Kepler-791. Helios Extractive borró todo registro de la ODISEA-7: el secreto murió contigo.";
  } else if (level <= 10) {
    return "La caja negra fue transmitida... pero los drones de Helios interceptaron tu escape a un paso de la Tierra.";
  } else {
    if (score >= highScore) {
      return "NUEVO RÉCORD — Te convertiste en el Fantasma de Kepler. La señal llegó a la Tierra: la verdad sobre Helios Extractive, expuesta.";
    } else {
      return "Te fusionaste por completo con el enjambre. Tu eco, y el de todos los que vinieron antes, seguirá orbitando para siempre los radares de Helios.";
    }
  }
}

/**
 * Gets the alternative ending text based on the reached level and score (alias/variant).
 * @public
 */
export function getStoryEndingText(level: number, score: number, highScore: number): string {
  return getStoryEnding(level, score, highScore);
}

/**
 * Returns the lore and transmissions logs of ODISEA-7 based on level.
 * @public
 */
export function getLogsForLevel(level: number): string[] {
  if (level <= 2) {
    return [
      'Log #01 — Ing. Okonkwo: "La carga del Sector 4 no era mineral... estaba viva."',
      'Log #02 — Cmdt. Reyes: "Señal de auxilio emitida. Frecuencia bloqueada por polvo ionizado."',
      'Log #05: "La tripulación del módulo A no respondió al protocolo de evacuación."'
    ];
  } else if (level <= 4) {
    return [
      'Log #09 — Ing. Okonkwo: "Al dispararles se dividen y aceleran. El impacto los alimenta."',
      'Log #14 — Ing. Okonkwo: "El reactor absorbió partículas del enjambre. La nave está... mutando."',
      'Log #18 — Piloto: "Si mantengo el ritmo de disparo, la densidad del campo disminuye."'
    ];
  } else if (level <= 6) {
    return [
      'Log #22 — Cmdt. Reyes: "¡No son naves de socorro! Tienen el emblema de Helios Extractive."',
      'Log #29 — Cmdt. Reyes: "Los drones no buscan limpiar el sector: vienen a borrar la evidencia."',
      'Log #33 — Ing. Okonkwo: "Encontré la clave del \'Proyecto Arcano\': no extraen minerales, cultivan la resonancia del enjambre para venderla como arma. La directiva siempre lo supo."'
    ];
  } else if (level <= 8) {
    return [
      'Log #41 — Ing. Okonkwo: "Helios probó la red nanotecnológica en los mineros sin aviso."',
      'Log #48 — Piloto: "Mis manos tiemblan a la misma frecuencia que el motor de la nave."',
      'Log #53 — Piloto: "Si alcanzo el borde exterior, la transmisión llegará a la Tierra."'
    ];
  } else if (level <= 10) {
    return [
      'Log #62 — Piloto: "El enjambre ya no me ataca a mí... ataca a los drones de Helios."',
      'Log #71 — Piloto: "Sincronización al 80%. Puedo sentir la trayectoria de cada fragmento."',
      'Log #79 — Cmdt. Reyes (transmisión final): "Para quien encuentre esto: Helios Extractive nos sacrificó por una patente."'
    ];
  } else {
    return [
      'Log #99: "Ya no hay piloto en la cabina. Solo queda la señal."',
      'Log #INF: "Transmitiendo bucle de datos... infinito..."'
    ];
  }
}
