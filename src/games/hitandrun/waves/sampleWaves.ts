import type { WaveScript } from "./HitRunWaveTypes";

/** Ground Y ~ tile row 10 * 32 ≈ 320 for default tile size. */
const GROUND_Y = 320;
const MID_Y = 260;
const DROP_Y = 120;

/**
 * Scripts de ejemplo — tensión tipo Metal Slug.
 * Coordenadas alineadas con level-01 Hit&Run (suelo y plataformas).
 */
export const WAVE_OPENING: WaveScript = {
  id: "opening",
  name: "OPENING",
  events: [
    { t: 1.5, type: "popcorn", count: 4, formation: "line", spacing: 32, x: 480, y: GROUND_Y },
    { t: 5, type: "popcorn", count: 6, formation: "scatter", spacing: 28, x: 520, y: GROUND_Y },
    { t: 9, type: "hopper", count: 2, formation: "drop", spacing: 48, x: 400, y: DROP_Y },
    { t: 13, type: "wall", count: 5, formation: "wall", spacing: 22, x: 500, y: GROUND_Y }
  ]
};

export const WAVE_PRESSURE: WaveScript = {
  id: "pressure",
  name: "PRESSURE",
  events: [
    { t: 0, type: "popcorn", count: 8, formation: "line", spacing: 24, x: 500, y: GROUND_Y },
    { t: 2.5, type: "charger", count: 2, formation: "column", spacing: 36, x: 560, y: MID_Y },
    { t: 5, type: "wall", count: 6, formation: "wall", spacing: 20, x: 480, y: GROUND_Y },
    { t: 8, type: "hopper", count: 4, formation: "drop", spacing: 40, interval: 0.15, x: 420, y: DROP_Y },
    { t: 12, type: "popcorn", count: 10, formation: "scatter", spacing: 22, x: 520, y: GROUND_Y }
  ]
};

export const WAVE_BOSS_LEAD: WaveScript = {
  id: "boss_lead",
  name: "ELITE",
  events: [
    { t: 0, type: "wall", count: 4, formation: "wall", spacing: 24, x: 500, y: GROUND_Y },
    { t: 4, type: "charger", count: 3, formation: "line", spacing: 40, x: 540, y: GROUND_Y },
    { t: 8, type: "elite", count: 1, formation: "point", x: 560, y: MID_Y },
    { t: 8.5, type: "popcorn", count: 6, formation: "scatter", spacing: 28, x: 500, y: GROUND_Y }
  ]
};

export const WAVE_ENDLESS_PRESSURE: WaveScript = {
  ...WAVE_PRESSURE,
  id: "endless_pressure",
  name: "ENDLESS",
  loop: true,
  loopDelay: 4
};

export const SAMPLE_WAVE_SCRIPTS: Record<string, WaveScript> = {
  opening: WAVE_OPENING,
  pressure: WAVE_PRESSURE,
  boss_lead: WAVE_BOSS_LEAD,
  endless_pressure: WAVE_ENDLESS_PRESSURE
};
