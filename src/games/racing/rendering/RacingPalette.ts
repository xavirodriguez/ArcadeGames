import type { World } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";

export type TrackTheme = "breakfast" | "billiard" | "desk" | "garden";

export interface RacingPalette {
  surface: string;
  surfaceDetail: string;
  track: string;
  trackEdge: string;
  player: string;
  playerHighlight: string;
  rival: string;
  rivalHighlight: string;
  obstacle: string;
  obstacleHighlight: string;
  danger: string;
  shadow: string;
  accent: string;
  outline: string;
  text: string;
}

/**
 * Semantic color palettes for Miniature Tabletop Rally themes.
 *
 * Derived tokens explanation:
 * - surfaceDetail: Derived for desk (#B2A084) and garden (#5C6E46) by darkening surface tone by ~15% for wood grain / grass turf patterns.
 * - playerHighlight / rivalHighlight: Derived by brightening player cyan/blue and rival coral/orange tones by ~25% for top-down volumetric highlights on toy car roofs.
 * - obstacleHighlight: Derived by brightening obstacle base tones by ~20% for glossy highlights on bowls, mugs, and balls.
 * - outline: Dark tone derived from each theme's shadow base (#2D1E18, #0C2018, #2B2521, #282D20) for consistent tabletop object outlines.
 * - accent: Gold/Yellow (#F2C94C) used for finish line details and boost flame highlights.
 */
export const RACING_PALETTES: Record<TrackTheme, RacingPalette> = {
  breakfast: {
    surface: "#D8BC91",
    surfaceDetail: "#B99568",
    track: "#F1E7CF",
    trackEdge: "#9D7952",
    player: "#55C9CE",
    playerHighlight: "#8BE4E8",
    rival: "#E86A72",
    rivalHighlight: "#F29AA0",
    obstacle: "#C98C32",
    obstacleHighlight: "#E5AD5A",
    danger: "#C94C45",
    shadow: "#4B382E",
    accent: "#F2C94C",
    outline: "#2D1E18",
    text: "#FFFFFF"
  },
  billiard: {
    surface: "#18533E",
    surfaceDetail: "#26684F",
    track: "#D8CCAA",
    trackEdge: "#6C5138",
    player: "#53C8C2",
    playerHighlight: "#89E3DE",
    rival: "#E97852",
    rivalHighlight: "#F2A388",
    obstacle: "#C98C32",
    obstacleHighlight: "#E5AD5A",
    danger: "#D94E4E",
    shadow: "#102C22",
    accent: "#F2C94C",
    outline: "#0C2018",
    text: "#FFFFFF"
  },
  desk: {
    surface: "#C8B89E",
    surfaceDetail: "#B2A084",
    track: "#E4DED1",
    trackEdge: "#8C7966",
    player: "#4FA7D8",
    playerHighlight: "#88C4E6",
    rival: "#D85E63",
    rivalHighlight: "#E89296",
    obstacle: "#D6B84C",
    obstacleHighlight: "#E8D078",
    danger: "#C9574E",
    shadow: "#433B35",
    accent: "#F2C94C",
    outline: "#2B2521",
    text: "#FFFFFF"
  },
  garden: {
    surface: "#718459",
    surfaceDetail: "#5C6E46",
    track: "#CBBE96",
    trackEdge: "#6C5B40",
    player: "#58BBA0",
    playerHighlight: "#8ED8C3",
    rival: "#D96F72",
    rivalHighlight: "#E89FA1",
    obstacle: "#A77852",
    obstacleHighlight: "#C69A73",
    danger: "#C6524D",
    shadow: "#3E4633",
    accent: "#F2C94C",
    outline: "#282D20",
    text: "#FFFFFF"
  }
};

export function getRacingPalette(world: World<RacingComponentRegistry, RacingEventRegistry>): RacingPalette {
  const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
  const theme = trackSpec?.theme ?? "breakfast";
  return RACING_PALETTES[theme] ?? RACING_PALETTES.breakfast;
}
