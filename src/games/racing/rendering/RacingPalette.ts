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

/**
 * Shared miniature-toy art direction:
 * warm, low-noise environments; readable road edges; and distinct player/rival
 * colours. UI accents remain available as separate semantic tokens.
 */
export const RACING_PALETTES: Record<TrackTheme, RacingPalette> = {
  breakfast: {
    surface: "#D8BB86",
    surfaceDetail: "#B99761",
    track: "#F0E8D6",
    trackEdge: "#46505B",
    player: "#08AFC1",
    playerHighlight: "#7CE7E5",
    rival: "#E85D4F",
    rivalHighlight: "#FFAA7A",
    obstacle: "#C86A35",
    obstacleHighlight: "#F4C56A",
    danger: "#C7372F",
    shadow: "#3B2D24",
    accent: "#F1B84B",
    outline: "#3F3A35",
    text: "#FFFDF5"
  },
  billiard: {
    surface: "#205C45",
    surfaceDetail: "#34765D",
    track: "#E4DDBF",
    trackEdge: "#193F35",
    player: "#0BB7C9",
    playerHighlight: "#85E7E0",
    rival: "#F07B45",
    rivalHighlight: "#FFD166",
    obstacle: "#CF7147",
    obstacleHighlight: "#FFD166",
    danger: "#E04F4F",
    shadow: "#102C24",
    accent: "#EAC35A",
    outline: "#152F2A",
    text: "#F7F4E6"
  },
  desk: {
    surface: "#807568",
    surfaceDetail: "#A89A84",
    track: "#E8E0D2",
    trackEdge: "#3E444C",
    player: "#237FBC",
    playerHighlight: "#9EDAFF",
    rival: "#DB5247",
    rivalHighlight: "#FFA08E",
    obstacle: "#CC9946",
    obstacleHighlight: "#F4D27E",
    danger: "#D94343",
    shadow: "#2F2A28",
    accent: "#D7A94D",
    outline: "#3B3531",
    text: "#FFF9EF"
  },
  garden: {
    surface: "#47784B",
    surfaceDetail: "#5D9660",
    track: "#E8D3A1",
    trackEdge: "#334B35",
    player: "#0BB7C9",
    playerHighlight: "#85E7E0",
    rival: "#E66B72",
    rivalHighlight: "#FFB1A9",
    obstacle: "#657A59",
    obstacleHighlight: "#CBD6A0",
    danger: "#D94343",
    shadow: "#203B25",
    accent: "#EAC35A",
    outline: "#2B3B2C",
    text: "#FFF9EF"
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
