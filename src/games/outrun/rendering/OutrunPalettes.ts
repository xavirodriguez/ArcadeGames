/**
 * Data-driven color palette tokens for Out Run scenarios.
 * Strict adherence to OUTRUN_ART.md visual specification (~12 tokens per scenario).
 */

export interface ScenarioPalette {
  id: "coast" | "desert" | "mountain";
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
  skyBands: ["#ff6b6b", "#ff9e7d", "#88e1e7", "#38b6ff", "#00f0ff"],
  sun: "#ff5252",
  mountainBase: "#00b4d8",
  mountainFacet: "#90e0ef",
  groundDark: "#e2dfc8",
  groundLight: "#d1ceb2",
  roadDark: "#2d3138",
  roadLight: "#383d45",
  rumbleDark: "#ff5252",
  rumbleLight: "#f8f9fa",
  lane: "#ffffff"
};

export const DESERT_PALETTE: ScenarioPalette = {
  id: "desert",
  skyBands: ["#1d1829", "#3a233b", "#692a4a", "#9e3d4c", "#d96b52"],
  sun: "#ff9e7d",
  mountainBase: "#5c3d42",
  mountainFacet: "#8d5b4c",
  groundDark: "#d0a67a",
  groundLight: "#ba8f62",
  roadDark: "#1c1c28",
  roadLight: "#262636",
  rumbleDark: "#ff5252",
  rumbleLight: "#00f0ff",
  lane: "#ffffff"
};

export const MOUNTAIN_PALETTE: ScenarioPalette = {
  id: "mountain",
  skyBands: ["#120e26", "#251b47", "#4b2b5e", "#7e4075", "#b8b5ff"],
  sun: "#b8b5ff",
  mountainBase: "#2b2d42",
  mountainFacet: "#4a4e69",
  groundDark: "#8d99ae",
  groundLight: "#788596",
  roadDark: "#20252e",
  roadLight: "#2a303c",
  rumbleDark: "#b8b5ff",
  rumbleLight: "#ffffff",
  lane: "#ffffff"
};

export type DayPhase = "dawn" | "day" | "sunset" | "blue_hour";

export interface ModulatedPalette extends ScenarioPalette {
  dayPhase: DayPhase;
  lightsOn: boolean;
  cloudColor: string;
}

export function getDayPhase(progress: number): { phase: DayPhase; phaseT: number; lightsOn: boolean } {
  const t = (progress % 1 + 1) % 1;
  if (t < 0.25) {
    return { phase: "dawn", phaseT: t / 0.25, lightsOn: false };
  } else if (t < 0.5) {
    return { phase: "day", phaseT: (t - 0.25) / 0.25, lightsOn: false };
  } else if (t < 0.75) {
    return { phase: "sunset", phaseT: (t - 0.5) / 0.25, lightsOn: false };
  } else {
    return { phase: "blue_hour", phaseT: (t - 0.75) / 0.25, lightsOn: true };
  }
}

export function applyDayPhase(palette: ScenarioPalette, progress: number): ModulatedPalette {
  const { phase, lightsOn } = getDayPhase(progress);

  let cloudColor = "rgba(255, 255, 255, 0.25)";
  let sunColor = palette.sun;

  if (phase === "dawn") {
    cloudColor = "rgba(255, 218, 185, 0.3)";
    sunColor = "#ff9e7d";
  } else if (phase === "day") {
    cloudColor = "rgba(255, 255, 255, 0.35)";
    sunColor = "#fff8e7";
  } else if (phase === "sunset") {
    cloudColor = "rgba(230, 150, 210, 0.3)";
    sunColor = "#ff3b5c";
  } else {
    cloudColor = "rgba(100, 200, 255, 0.25)";
    sunColor = "#00f0ff";
  }

  let groundDark = palette.groundDark;
  let groundLight = palette.groundLight;
  if (phase === "blue_hour") {
    groundDark = interpolateHexColor(palette.groundDark, "#0d1117", 0.4);
    groundLight = interpolateHexColor(palette.groundLight, "#161b22", 0.4);
  }

  return {
    ...palette,
    sun: sunColor,
    groundDark,
    groundLight,
    dayPhase: phase,
    lightsOn,
    cloudColor
  };
}

export const OUTRUN_PALETTES: Record<string, ScenarioPalette> = {
  coast: COAST_PALETTE,
  desert: DESERT_PALETTE,
  mountain: MOUNTAIN_PALETTE
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
  const parseHex = (hex: string) => {
    const h = hex.replace("#", "");
    if (h.length === 3) {
      return [
        parseInt(h[0] + h[0], 16),
        parseInt(h[1] + h[1], 16),
        parseInt(h[2] + h[2], 16)
      ];
    }
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16)
    ];
  };

  const [r1, g1, b1] = parseHex(c1);
  const [r2, g2, b2] = parseHex(c2);

  const r = Math.round(r1 + (r2 - r1) * clampT);
  const g = Math.round(g1 + (g2 - g1) * clampT);
  const b = Math.round(b1 + (b2 - b1) * clampT);

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
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
