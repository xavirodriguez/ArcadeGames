import { THEME_RESOURCE_KEY } from "@tiny-aster/core";
import type { Theme, World } from "@tiny-aster/core";
import type { ScenarioId, FlappySectorEvent } from "../types/FlappyBirdTypes";

export const OFFICE_PAPER_THEME_ID = "office-paper";

/**
 * Evaluates whether a Theme instance corresponds to the "office-paper" concept pack.
 */
export function isOfficeTheme(theme: Theme | undefined | null): boolean {
  return theme?.conceptPack?.id === OFFICE_PAPER_THEME_ID;
}

/**
 * Evaluates whether the active world theme corresponds to the "office-paper" concept pack.
 */
export function isOfficeThemeWorld(world: World): boolean {
  const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
  return isOfficeTheme(theme);
}


export type FlappyAnnouncementDescriptor =
  | { type: "scenario"; scenario: ScenarioId }
  | { type: "sector_event"; event: FlappySectorEvent };

const SPATIAL_ANNOUNCEMENTS = {
  scenario: {
    open_space: "OPEN SPACE",
    asteroid_belt: "ASTEROID BELT",
    solar_storm: "SOLAR STORM",
    warp_corridor: "WARP CORRIDOR"
  },
  sector_event: {
    solar_flare: "SOLAR FLARE",
    asteroid_storm: "ASTEROID STORM",
    hyper_warp: "HYPER WARP"
  }
} satisfies {
  scenario: Record<ScenarioId, string>;
  sector_event: Record<FlappySectorEvent, string>;
};

const OFFICE_ANNOUNCEMENTS = {
  scenario: {
    open_space: "OPEN OFFICE",
    asteroid_belt: "ARCHIVE AISLE",
    solar_storm: "COFFEE STATION",
    warp_corridor: "PRINTER CORRIDOR"
  },
  sector_event: {
    solar_flare: "COFFEE SPILL",
    asteroid_storm: "STAPLE SHOWER",
    hyper_warp: "PAPER PLANE TURBO"
  }
} satisfies {
  scenario: Record<ScenarioId, string>;
  sector_event: Record<FlappySectorEvent, string>;
};

/** Resolve announcement wording at the active aesthetic boundary. */
export function resolveFlappyAnnouncement(
  theme: Theme | undefined | null,
  announcement: FlappyAnnouncementDescriptor
): string {
  const labels = isOfficeTheme(theme) ? OFFICE_ANNOUNCEMENTS : SPATIAL_ANNOUNCEMENTS;
  return announcement.type === "scenario"
    ? labels.scenario[announcement.scenario]
    : labels.sector_event[announcement.event];
}
