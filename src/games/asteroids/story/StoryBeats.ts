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
    return "Tu señal se apagó cerca del borde del Cinturón.";
  } else if (level <= 10) {
    return "Escapaste con fragmentos de prueba... pero el enjambre sigue ahí fuera.";
  } else {
    if (score >= highScore) {
      return "NUEVO RÉCORD — Te convertiste en leyenda del Cinturón de Kepler.";
    } else {
      return "Te convertiste en leyenda del Cinturón de Kepler.";
    }
  }
}
