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

export const DESERT_PALETTE: ScenarioPalette = {
  id: "desert",
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

export const MOUNTAIN_PALETTE: ScenarioPalette = {
  id: "mountain",
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
