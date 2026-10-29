/**
 * Canonical Out Run scenario palette tokens.
 * Values are kept identical to the legacy renderer palette definitions.
 */
import { colors } from "../../../theme/colors";

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
