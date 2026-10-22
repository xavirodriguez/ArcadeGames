/**
 * Data-driven color palette tokens for Out Run scenarios.
 * Strict adherence to OUTRUN_ART.md visual specification (~12 tokens per scenario).
 */

import { hexToRgb } from "./OutrunFog";
import { colors } from "../../../theme/colors";
import { hexToRgba } from "../../shared/rendering/CosmicPalette";

export interface ScenarioPalette {
  id: "coast" | "desert" | "mountain" | "classic_coast" | "classic_desert" | "classic_mountain";
  horizonStyle?: "faceted_peaks" | "coast_sea" | "desert_dunes" | "mountain_cliffs";
  skyBands: string[];
  sun: string;
  mountainBase: string;
  mountainFacet: string;
  groundDark: string;
  groundLight: string;
  roadDark: string;
  roadLight: string;
  rumbleDark: string;
  rumbleLight: string;
  lane: string;
}

export const COAST_PALETTE: ScenarioPalette = {
  id: "coast",
  horizonStyle: "coast_sea",
  skyBands: [colors.red, colors.orange, colors.cyan, colors.blueLight, colors.cyan],
  sun: "#ff5252",
  mountainBase: colors.blue,
  mountainFacet: colors.blueLight,
  groundDark: colors.amber,
  groundLight: colors.yellow,
  roadDark: colors.slate,
  roadLight: colors.borderLight,
  rumbleDark: colors.red,
  rumbleLight: colors.surface,
  lane: colors.white
};

export const DESERT_PALETTE: ScenarioPalette = {
  id: "desert",
  horizonStyle: "desert_dunes",
  skyBands: [colors.borderDark, colors.violetDark, colors.purple, colors.pink, colors.orange],
  sun: colors.orange,
  mountainBase: colors.slate,
  mountainFacet: colors.orangeDark,
  groundDark: colors.amber,
  groundLight: colors.yellow,
  roadDark: colors.surface,
  roadLight: colors.borderDark,
  rumbleDark: colors.red,
  rumbleLight: colors.surface,
  lane: colors.white
};

export const MOUNTAIN_PALETTE: ScenarioPalette = {
  id: "mountain",
  horizonStyle: "mountain_cliffs",
  skyBands: [colors.backgroundDark, colors.violetDark, colors.purple, colors.magenta, colors.violet],
  sun: colors.violet,
  mountainBase: colors.borderDark,
  mountainFacet: colors.slate,
  groundDark: colors.slate,
  groundLight: colors.borderLight,
  roadDark: colors.backgroundDark,
  roadLight: colors.surface,
  rumbleDark: colors.red,
  rumbleLight: colors.surface,
  lane: colors.white
};

export const CLASSIC_COAST_PALETTE: ScenarioPalette = {
  id: "classic_coast",
  horizonStyle: "faceted_peaks",
  skyBands: [colors.blue, colors.purple, colors.red, colors.amber, colors.yellow],
  sun: "#ff5252",
  mountainBase: colors.green,
  mountainFacet: colors.green,
  groundDark: colors.yellow,
  groundLight: colors.orange,
  roadDark: colors.slate,
  roadLight: colors.borderLight,
  rumbleDark: colors.red,
  rumbleLight: colors.white,
  lane: colors.white
};

export const CLASSIC_DESERT_PALETTE: ScenarioPalette = {
  id: "classic_desert",
  horizonStyle: "faceted_peaks",
  skyBands: [colors.backgroundDark, colors.violetDark, colors.purple, colors.slate, colors.violet],
  sun: colors.yellow,
  mountainBase: colors.purple,
  mountainFacet: colors.magenta,
  groundDark: colors.violetDark,
  groundLight: colors.purple,
  roadDark: colors.surface,
  roadLight: colors.borderDark,
  rumbleDark: colors.pink,
  rumbleLight: colors.cyan,
  lane: colors.white
};

export const CLASSIC_MOUNTAIN_PALETTE: ScenarioPalette = {
  id: "classic_mountain",
  horizonStyle: "faceted_peaks",
  skyBands: [colors.slate, colors.borderDark, colors.borderLight, colors.neutral, colors.white],
  sun: colors.red,
  mountainBase: colors.purple,
  mountainFacet: colors.orange,
  groundDark: colors.orange,
  groundLight: colors.yellow,
  roadDark: colors.borderDark,
  roadLight: colors.borderLight,
  rumbleDark: colors.red,
  rumbleLight: colors.neutral,
  lane: colors.white
};

export type DayPhase = "dawn" | "day" | "sunset" | "blue_hour";

export interface ModulatedPalette extends ScenarioPalette {
  dayPhase: DayPhase;
  lightsOn: boolean;
  cloudColor: string;
  timeOfDay: number;
  reflectionAlpha: number;
}

export function getDayPhase(progress: number): { phase: DayPhase; phaseT: number; lightsOn: boolean; timeOfDay: number } {
  const t = ((progress % 1) + 1) % 1;
  if (t < 0.25) {
    return { phase: "dawn", phaseT: t / 0.25, lightsOn: false, timeOfDay: t };
  } else if (t < 0.5) {
    return { phase: "day", phaseT: (t - 0.25) / 0.25, lightsOn: false, timeOfDay: t };
  } else if (t < 0.75) {
    return { phase: "sunset", phaseT: (t - 0.5) / 0.25, lightsOn: false, timeOfDay: t };
  } else {
    return { phase: "blue_hour", phaseT: (t - 0.75) / 0.25, lightsOn: true, timeOfDay: t };
  }
}

export function applyDayPhase(palette: ScenarioPalette, progress: number): ModulatedPalette {
  const { phase, phaseT, lightsOn, timeOfDay } = getDayPhase(progress);

  let cloudColor = hexToRgba(colors.white, 0.25);
  let sunColor: string = palette.sun;
  let laneColor: string = colors.white; // Day: warm white
  let reflectionAlpha = 0.06; // Soft daytime wet reflection

  if (phase === "dawn") {
    cloudColor = hexToRgba(colors.yellow, 0.3);
    sunColor = colors.orange;
    laneColor = interpolateHexColor(colors.white, colors.pink, phaseT);
    reflectionAlpha = 0.08 + phaseT * 0.04;
  } else if (phase === "day") {
    cloudColor = hexToRgba(colors.white, 0.35);
    sunColor = colors.yellow;
    laneColor = colors.white;
    reflectionAlpha = 0.06;
  } else if (phase === "sunset") {
    cloudColor = hexToRgba(colors.pink, 0.3);
    sunColor = colors.red;
    laneColor = interpolateHexColor(colors.white, colors.orange, phaseT);
    reflectionAlpha = 0.12 + phaseT * 0.08;
  } else {
    cloudColor = hexToRgba(colors.cyan, 0.25);
    sunColor = colors.cyan;
    laneColor = interpolateHexColor(colors.orange, colors.blueLight, phaseT);
    reflectionAlpha = 0.22;
  }

  let groundDark = palette.groundDark;
  let groundLight = palette.groundLight;
  if (phase === "blue_hour") {
    groundDark = interpolateHexColor(palette.groundDark, colors.backgroundDark, 0.4);
    groundLight = interpolateHexColor(palette.groundLight, colors.surface, 0.4);
  }

  return {
    ...palette,
    sun: sunColor,
    lane: laneColor,
    groundDark,
    groundLight,
    dayPhase: phase,
    lightsOn,
    cloudColor,
    timeOfDay,
    reflectionAlpha
  };
}

export const OUTRUN_PALETTES: Record<string, ScenarioPalette> = {
  coast: COAST_PALETTE,
  desert: DESERT_PALETTE,
  mountain: MOUNTAIN_PALETTE,
  classic_coast: CLASSIC_COAST_PALETTE,
  classic_desert: CLASSIC_DESERT_PALETTE,
  classic_mountain: CLASSIC_MOUNTAIN_PALETTE
};

/**
 * Pure deterministic hash function for scenario facet geometry generation.
 */
export function scenarioHash(scenarioId: string, index: number): number {
  let hash = 0;
  const str = `${scenarioId}_${index}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

/**
 * Pure color interpolation between two HEX colors.
 */
export function interpolateHexColor(c1: string, c2: string, t: number): string {
  const clampT = Math.max(0, Math.min(1, t));

  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);

  const r = Math.round(r1 + (r2 - r1) * clampT);
  const g = Math.round(g1 + (g2 - g1) * clampT);
  const b = Math.round(b1 + (b2 - b1) * clampT);

  const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Interpolates two scenario palettes smoothly across transition boundaries.
 */
export function interpolatePalettes(
  p1: ScenarioPalette,
  p2: ScenarioPalette,
  t: number
): ScenarioPalette {
  const skyBands = p1.skyBands.map((band, idx) =>
    interpolateHexColor(band, p2.skyBands[idx] ?? p2.skyBands[p2.skyBands.length - 1], t)
  );

  return {
    id: t < 0.5 ? p1.id : p2.id,
    horizonStyle: t < 0.5 ? (p1.horizonStyle ?? "faceted_peaks") : (p2.horizonStyle ?? "faceted_peaks"),
    skyBands,
    sun: interpolateHexColor(p1.sun, p2.sun, t),
    mountainBase: interpolateHexColor(p1.mountainBase, p2.mountainBase, t),
    mountainFacet: interpolateHexColor(p1.mountainFacet, p2.mountainFacet, t),
    groundDark: interpolateHexColor(p1.groundDark, p2.groundDark, t),
    groundLight: interpolateHexColor(p1.groundLight, p2.groundLight, t),
    roadDark: interpolateHexColor(p1.roadDark, p2.roadDark, t),
    roadLight: interpolateHexColor(p1.roadLight, p2.roadLight, t),
    rumbleDark: interpolateHexColor(p1.rumbleDark, p2.rumbleDark, t),
    rumbleLight: interpolateHexColor(p1.rumbleLight, p2.rumbleLight, t),
    lane: interpolateHexColor(p1.lane, p2.lane, t)
  };
}

/**
 * Pure function computing the active scenario palette at playerZ,
 * interpolating across scenario boundary segments.
 */
export function getScenarioPaletteAtZ(
  playerZ: number,
  roadData: import("../types/OutrunTypes").RoadData
): ScenarioPalette {
  if (!roadData || roadData.segments.length === 0) return COAST_PALETTE;

  const trackLength = roadData.trackLength;
  let z = playerZ % trackLength;
  if (z < 0) z += trackLength;

  let accum = 0;
  let segIdx = 0;
  for (let i = 0; i < roadData.segments.length; i++) {
    const len = roadData.segments[i].length;
    if (accum + len > z) {
      segIdx = i;
      break;
    }
    accum += len;
  }

  const currentSeg = roadData.segments[segIdx];
  const curScenario = currentSeg.scenarioId ?? "coast";

  const transitionSegments = 20;
  const total = roadData.segments.length;
  let nextScenario = curScenario;
  let transitionDist = transitionSegments;

  for (let step = 1; step <= transitionSegments; step++) {
    const lookIdx = (segIdx + step) % total;
    const lookScenario = roadData.segments[lookIdx].scenarioId ?? "coast";
    if (lookScenario !== curScenario) {
      nextScenario = lookScenario;
      transitionDist = step;
      break;
    }
  }

  if (nextScenario === curScenario) {
    return OUTRUN_PALETTES[curScenario] ?? COAST_PALETTE;
  }

  const p1 = OUTRUN_PALETTES[curScenario] ?? COAST_PALETTE;
  const p2 = OUTRUN_PALETTES[nextScenario] ?? COAST_PALETTE;
  const t = 1.0 - transitionDist / transitionSegments;

  return interpolatePalettes(p1, p2, t);
}
