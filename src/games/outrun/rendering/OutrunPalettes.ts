/**
 * Data-driven color palette tokens for Out Run scenarios.
 * Strict adherence to OUTRUN_ART.md visual specification (~12 tokens per scenario).
 */

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
  skyBands: ["#ff6b6b", "#ff9e7d", "#88e1e7", "#38b6ff", "#00f0ff"],
  sun: "#ff5252",
  mountainBase: "#00b4d8",
  mountainFacet: "#90e0ef",
  groundDark: "#e2dfc8",
  groundLight: "#d1ceb2",
  roadDark: "#2a2e37",
  roadLight: "#353a45",
  rumbleDark: "#e0564c",
  rumbleLight: "#1a1c20",
  lane: "#f7f2eb"
};

export const DESERT_PALETTE: ScenarioPalette = {
  id: "desert",
  horizonStyle: "desert_dunes",
  skyBands: ["#1d1829", "#3a233b", "#692a4a", "#9e3d4c", "#d96b52"],
  sun: "#ff9e7d",
  mountainBase: "#5c3d42",
  mountainFacet: "#8d5b4c",
  groundDark: "#d0a67a",
  groundLight: "#ba8f62",
  roadDark: "#2b2321",
  roadLight: "#382e2b",
  rumbleDark: "#e0564c",
  rumbleLight: "#1a1c20",
  lane: "#f7f2eb"
};

export const MOUNTAIN_PALETTE: ScenarioPalette = {
  id: "mountain",
  horizonStyle: "mountain_cliffs",
  skyBands: ["#120e26", "#251b47", "#4b2b5e", "#7e4075", "#b8b5ff"],
  sun: "#b8b5ff",
  mountainBase: "#2b2d42",
  mountainFacet: "#4a4e69",
  groundDark: "#8d99ae",
  groundLight: "#788596",
  roadDark: "#20242b",
  roadLight: "#2a2f38",
  rumbleDark: "#e0564c",
  rumbleLight: "#1a1c20",
  lane: "#f7f2eb"
};

export const CLASSIC_COAST_PALETTE: ScenarioPalette = {
  id: "classic_coast",
  horizonStyle: "faceted_peaks",
  skyBands: ["#1a2a6c", "#5c258d", "#b21f1f", "#fdbb2d", "#ffe066"],
  sun: "#ff4e50",
  mountainBase: "#2b580c",
  mountainFacet: "#639a67",
  groundDark: "#f7f06d",
  groundLight: "#d4a373",
  roadDark: "#3a3d40",
  roadLight: "#484b4e",
  rumbleDark: "#e63946",
  rumbleLight: "#f1faee",
  lane: "#ffffff"
};

export const CLASSIC_DESERT_PALETTE: ScenarioPalette = {
  id: "classic_desert",
  horizonStyle: "faceted_peaks",
  skyBands: ["#0f0c29", "#201c4e", "#302b63", "#24243e", "#4b2a5e"],
  sun: "#f8ffae",
  mountainBase: "#4a154b",
  mountainFacet: "#6c2257",
  groundDark: "#2c003e",
  groundLight: "#3d0c5a",
  roadDark: "#1f1f2e",
  roadLight: "#28283d",
  rumbleDark: "#ff007f",
  rumbleLight: "#00f0ff",
  lane: "#ffffff"
};

export const CLASSIC_MOUNTAIN_PALETTE: ScenarioPalette = {
  id: "classic_mountain",
  horizonStyle: "faceted_peaks",
  skyBands: ["#1c2833", "#2c3e50", "#7f8c8d", "#bdc3c7", "#ecf0f1"],
  sun: "#e74c3c",
  mountainBase: "#8e44ad",
  mountainFacet: "#d35400",
  groundDark: "#e67e22",
  groundLight: "#f39c12",
  roadDark: "#2c3e50",
  roadLight: "#34495e",
  rumbleDark: "#e74c3c",
  rumbleLight: "#ecf0f1",
  lane: "#ffffff"
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

  let cloudColor = "rgba(255, 255, 255, 0.25)";
  let sunColor = palette.sun;
  let laneColor = "#f7f2eb"; // Day: warm white
  let reflectionAlpha = 0.06; // Soft daytime wet reflection

  if (phase === "dawn") {
    cloudColor = "rgba(255, 218, 185, 0.3)";
    sunColor = "#ff9e7d";
    laneColor = interpolateHexColor("#f7f2eb", "#f8a89d", phaseT);
    reflectionAlpha = 0.08 + phaseT * 0.04;
  } else if (phase === "day") {
    cloudColor = "rgba(255, 255, 255, 0.35)";
    sunColor = "#fff8e7";
    laneColor = "#f7f2eb";
    reflectionAlpha = 0.06;
  } else if (phase === "sunset") {
    cloudColor = "rgba(230, 150, 210, 0.3)";
    sunColor = "#ff3b5c";
    laneColor = interpolateHexColor("#f7f2eb", "#f8a89d", phaseT);
    reflectionAlpha = 0.12 + phaseT * 0.08;
  } else {
    cloudColor = "rgba(100, 200, 255, 0.25)";
    sunColor = "#00f0ff";
    laneColor = interpolateHexColor("#f8a89d", "#d0e8ff", phaseT);
    reflectionAlpha = 0.22;
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
