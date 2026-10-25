/**
 * Phase 3 — per-section wave scripts with fantasy pacing.
 * Y = belt depth lanes; X is offset by HitRunSectionWaveSystem to section.startX.
 */

import type { WaveScript } from "./HitRunWaveTypes";

const DEPTH_NEAR = 380;
const DEPTH_MID = 400;
const DEPTH_FAR = 440;

/** Section 0 — forest gate: teach depth + basic melee pressure. */
export const WAVE_GOBLINS: WaveScript = {
  id: "wave_goblins",
  name: "GOBLINS",
  events: [
    { t: 1.2, type: "popcorn", count: 4, formation: "line", spacing: 36, x: 320, y: DEPTH_MID },
    { t: 4.5, type: "popcorn", count: 5, formation: "scatter", spacing: 30, x: 340, y: DEPTH_NEAR },
    { t: 8.0, type: "hopper", count: 2, formation: "column", spacing: 32, x: 300, y: DEPTH_FAR },
    { t: 11.5, type: "wall", count: 4, formation: "wall", spacing: 26, x: 350, y: DEPTH_MID }
  ]
};

/** Section 1 — ruins: denser packs + chargers. */
export const WAVE_SKELETONS: WaveScript = {
  id: "wave_skeletons",
  name: "SKELETONS",
  events: [
    { t: 0.5, type: "popcorn", count: 6, formation: "line", spacing: 28, x: 320, y: DEPTH_MID },
    { t: 3.0, type: "charger", count: 2, formation: "column", spacing: 36, x: 360, y: DEPTH_NEAR },
    { t: 5.5, type: "wall", count: 5, formation: "wall", spacing: 22, x: 300, y: DEPTH_MID },
    { t: 9.0, type: "hopper", count: 3, formation: "line", spacing: 40, x: 340, y: DEPTH_FAR },
    { t: 12.5, type: "popcorn", count: 8, formation: "scatter", spacing: 24, x: 320, y: DEPTH_NEAR }
  ]
};

/** Section 2 — bridge: heavy front + flanking hoppers. */
export const WAVE_ORCS: WaveScript = {
  id: "wave_orcs",
  name: "ORCS",
  events: [
    { t: 0.4, type: "wall", count: 6, formation: "wall", spacing: 20, x: 330, y: DEPTH_MID },
    { t: 3.5, type: "charger", count: 3, formation: "line", spacing: 44, x: 360, y: DEPTH_NEAR },
    { t: 6.5, type: "hopper", count: 4, formation: "scatter", spacing: 32, x: 300, y: DEPTH_FAR },
    { t: 10.0, type: "popcorn", count: 10, formation: "line", spacing: 22, x: 340, y: DEPTH_MID },
    { t: 13.0, type: "charger", count: 2, formation: "column", spacing: 40, x: 380, y: DEPTH_NEAR }
  ]
};

/** Section 3 — citadel: elite lead-in. */
export const WAVE_BOSS: WaveScript = {
  id: "wave_boss",
  name: "CITADEL",
  events: [
    { t: 0.5, type: "wall", count: 5, formation: "wall", spacing: 24, x: 320, y: DEPTH_MID },
    { t: 4.0, type: "charger", count: 3, formation: "line", spacing: 40, x: 350, y: DEPTH_NEAR },
    { t: 7.5, type: "elite", count: 1, formation: "point", x: 360, y: DEPTH_FAR },
    { t: 8.0, type: "popcorn", count: 6, formation: "scatter", spacing: 28, x: 300, y: DEPTH_NEAR },
    { t: 10.5, type: "samurai", count: 1, formation: "point", x: 360, y: DEPTH_MID },
    { t: 12.0, type: "hopper", count: 3, formation: "column", spacing: 36, x: 340, y: DEPTH_MID }
  ]
};

export const SECTION_WAVE_SCRIPTS: Record<string, WaveScript> = {
  wave_goblins: WAVE_GOBLINS,
  wave_skeletons: WAVE_SKELETONS,
  wave_orcs: WAVE_ORCS,
  wave_boss: WAVE_BOSS,
  // aliases used by older maps / samples
  opening: WAVE_GOBLINS,
  pressure: WAVE_SKELETONS,
  boss_lead: WAVE_BOSS
};
