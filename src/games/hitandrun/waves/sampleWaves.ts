import type { WaveScript } from "./HitRunWaveTypes";

/**
 * Belt depth plane (Transform.y), not platformer tile ground.
 * depthMin≈280, depthMax≈520, player spawn y=400.
 */
const DEPTH_NEAR = 380; // closer to camera
const DEPTH_MID = 400;
const DEPTH_FAR = 440; // toward background

/**
 * Scripts de ejemplo — tension tipo arcade belt-scroll.
 * X alineado con primera seccion (gate ~420); Y = profundidad.
 */
export const WAVE_OPENING: WaveScript = {
  id: "opening",
  name: "OPENING",
  events: [
    { t: 1.5, type: "popcorn", count: 4, formation: "line", spacing: 32, x: 320, y: DEPTH_MID },
    { t: 5, type: "popcorn", count: 6, formation: "scatter", spacing: 28, x: 360, y: DEPTH_NEAR },
    { t: 9, type: "hopper", count: 2, formation: "line", spacing: 48, x: 300, y: DEPTH_FAR },
    { t: 13, type: "wall", count: 5, formation: "wall", spacing: 22, x: 340, y: DEPTH_MID }
  ]
};

export const WAVE_PRESSURE: WaveScript = {
  id: "pressure",
  name: "PRESSURE",
  events: [
    { t: 0, type: "popcorn", count: 8, formation: "line", spacing: 24, x: 500, y: DEPTH_MID },
    { t: 2.5, type: "charger", count: 2, formation: "column", spacing: 36, x: 560, y: DEPTH_NEAR },
    { t: 5, type: "wall", count: 6, formation: "wall", spacing: 20, x: 480, y: DEPTH_MID },
    { t: 8, type: "hopper", count: 4, formation: "line", spacing: 40, interval: 0.15, x: 420, y: DEPTH_FAR },
    { t: 12, type: "popcorn", count: 10, formation: "scatter", spacing: 22, x: 520, y: DEPTH_NEAR }
  ]
};

export const WAVE_BOSS_LEAD: WaveScript = {
  id: "boss_lead",
  name: "ELITE",
  events: [
    { t: 0, type: "wall", count: 4, formation: "wall", spacing: 24, x: 500, y: DEPTH_MID },
    { t: 4, type: "charger", count: 3, formation: "line", spacing: 40, x: 540, y: DEPTH_MID },
    { t: 8, type: "elite", count: 1, formation: "point", x: 560, y: DEPTH_FAR },
    { t: 8.5, type: "popcorn", count: 6, formation: "scatter", spacing: 28, x: 500, y: DEPTH_NEAR }
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
