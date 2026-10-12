import type { World } from "@tiny-aster/core";
import { resolveThemeColorWithFallback } from "@tiny-aster/core";
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
  const themeName = (trackSpec?.skin ?? trackSpec?.theme ?? "breakfast") as TrackTheme;
  const basePalette = RACING_PALETTES[themeName] ?? RACING_PALETTES.breakfast;

  return {
    surface: resolveThemeColorWithFallback(world, basePalette.surface, "racing_surface", "surface"),
    surfaceDetail: resolveThemeColorWithFallback(world, basePalette.surfaceDetail, "racing_surfaceDetail"),
    track: resolveThemeColorWithFallback(world, basePalette.track, "racing_track"),
    trackEdge: resolveThemeColorWithFallback(world, basePalette.trackEdge, "racing_trackEdge"),
    player: resolveThemeColorWithFallback(world, basePalette.player, "racing_player", "player", "primary"),
    playerHighlight: resolveThemeColorWithFallback(world, basePalette.playerHighlight, "racing_playerHighlight"),
    rival: resolveThemeColorWithFallback(world, basePalette.rival, "racing_rival", "rival", "enemy"),
    rivalHighlight: resolveThemeColorWithFallback(world, basePalette.rivalHighlight, "racing_rivalHighlight"),
    obstacle: resolveThemeColorWithFallback(world, basePalette.obstacle, "racing_obstacle"),
    obstacleHighlight: resolveThemeColorWithFallback(world, basePalette.obstacleHighlight, "racing_obstacleHighlight"),
    danger: resolveThemeColorWithFallback(world, basePalette.danger, "racing_danger", "danger"),
    shadow: resolveThemeColorWithFallback(world, basePalette.shadow, "racing_shadow"),
    accent: resolveThemeColorWithFallback(world, basePalette.accent, "racing_accent", "accent"),
    outline: resolveThemeColorWithFallback(world, basePalette.outline, "racing_outline"),
    text: resolveThemeColorWithFallback(world, basePalette.text, "racing_text")
  };
}
