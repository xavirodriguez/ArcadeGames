import type { WaveScript } from "./HitRunWaveTypes";

/**
 * Scripts de ejemplo — tensión tipo Metal Slug:
 * popcorn → respiro → muro → hopper/charger → elite.
 */
export const WAVE_OPENING: WaveScript = {
  id: "opening",
  name: "Opening skirmish",
  events: [
    { t: 0, type: "popcorn", count: 4, formation: "line", spacing: 28 },
    { t: 3, type: "popcorn", count: 6, formation: "scatter", spacing: 24 },
    { t: 7, type: "hopper", count: 2, formation: "drop", spacing: 48 },
    { t: 10, type: "wall", count: 5, formation: "wall", spacing: 20 }
  ]
};

export const WAVE_PRESSURE: WaveScript = {
  id: "pressure",
  name: "Pressure cooker",
  events: [
    { t: 0, type: "popcorn", count: 8, formation: "line", spacing: 22 },
    { t: 2.5, type: "charger", count: 2, formation: "column", spacing: 36 },
    { t: 5, type: "wall", count: 6, formation: "wall", spacing: 18 },
    { t: 8, type: "hopper", count: 4, formation: "drop", spacing: 40, interval: 0.15 },
    { t: 12, type: "popcorn", count: 10, formation: "scatter", spacing: 20 }
  ]
};

export const WAVE_BOSS_LEAD: WaveScript = {
  id: "boss_lead",
  name: "Elite arrival",
  events: [
    { t: 0, type: "wall", count: 4, formation: "wall", spacing: 22 },
    { t: 4, type: "charger", count: 3, formation: "line", spacing: 40 },
    { t: 8, type: "elite", count: 1, formation: "point" },
    { t: 8.5, type: "popcorn", count: 6, formation: "scatter", spacing: 26 }
  ]
};

/** Endless: repite pressure con delay. */
export const WAVE_ENDLESS_PRESSURE: WaveScript = {
  ...WAVE_PRESSURE,
  id: "endless_pressure",
  loop: true,
  loopDelay: 4
};

export const SAMPLE_WAVE_SCRIPTS: Record<string, WaveScript> = {
  opening: WAVE_OPENING,
  pressure: WAVE_PRESSURE,
  boss_lead: WAVE_BOSS_LEAD,
  endless_pressure: WAVE_ENDLESS_PRESSURE
};
