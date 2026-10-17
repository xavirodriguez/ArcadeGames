import type { World } from "@tiny-aster/core";
import { resolveThemeColorWithFallback } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";
import { colors } from "../../../theme/colors";

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
    surface: colors.amber,
    surfaceDetail: colors.orange,
    track: colors.yellow,
    trackEdge: colors.slate,
    player: colors.cyan,
    playerHighlight: colors.blueLight,
    rival: colors.red,
    rivalHighlight: colors.pink,
    obstacle: colors.orange,
    obstacleHighlight: colors.yellow,
    danger: colors.redHot,
    shadow: colors.backgroundDark,
    accent: colors.gold,
    outline: colors.surface,
    text: colors.white
  },
  billiard: {
    surface: colors.green,
    surfaceDetail: colors.green,
    track: colors.yellow,
    trackEdge: colors.slate,
    player: colors.cyan,
    playerHighlight: colors.blueLight,
    rival: colors.orange,
    rivalHighlight: colors.yellow,
    obstacle: colors.orange,
    obstacleHighlight: colors.yellow,
    danger: colors.red,
    shadow: colors.backgroundDark,
    accent: colors.gold,
    outline: colors.surface,
    text: colors.white
  },
  desk: {
    surface: colors.slate,
    surfaceDetail: colors.borderDark,
    track: colors.neutral,
    trackEdge: colors.slate,
    player: colors.blue,
    playerHighlight: colors.blueLight,
    rival: colors.red,
    rivalHighlight: colors.pink,
    obstacle: colors.gold,
    obstacleHighlight: colors.yellow,
    danger: colors.red,
    shadow: colors.surface,
    accent: colors.gold,
    outline: colors.surface,
    text: colors.white
  },
  garden: {
    surface: colors.green,
    surfaceDetail: colors.green,
    track: colors.yellow,
    trackEdge: colors.slate,
    player: colors.cyan,
    playerHighlight: colors.blueLight,
    rival: colors.pink,
    rivalHighlight: colors.pink,
    obstacle: colors.slate,
    obstacleHighlight: colors.borderLight,
    danger: colors.red,
    shadow: colors.surface,
    accent: colors.gold,
    outline: colors.surface,
    text: colors.white
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
