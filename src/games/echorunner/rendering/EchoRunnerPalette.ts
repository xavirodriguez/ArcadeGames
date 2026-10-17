import { Theme, createVisualTheme } from "@tiny-aster/core";
import { DEFAULT_ECHO_PALETTE } from "../../shared/rendering/PlatformerSharedVisualUtils";
import { colors } from "../../../theme/colors";

export type EchoRunnerSkinId = "dark" | "light" | "sunset";

/**
 * EchoRunner "The Archive" Color Palette
 * Distinguishes Corrupted vs Restored Archive data and environments.
 */
export const ECHO_PALETTE = DEFAULT_ECHO_PALETTE;

/**
 * Guide & Workflow for Creating a Custom Theme / Skin for Echo Runner (e.g. Mario Bros skin):
 *
 * Echo Runner visual drawers read entity and environment colors dynamically from the active `Theme`
 * resource registered on the ECS `World` (via `resolveEchoRunnerPalette`).
 *
 * Role Keys & Contrast Hierarchy Guidelines (`VisualThemeContrastHierarchy`):
 * - `player` / `primary` / `restorationCyan`: Main playable character visor and aura accents.
 * - `secondary` / `restorationGold` / `core`: Collectible cores and checkpoint activation glows.
 * - `accent` / `enemy` / `corruptionCrimson`: Primary enemy attack and hazard indicators.
 * - `archiveVoidDark` / `background`: Canvas/screen root background fill.
 * - `archiveSlate` / `surface` / `world`: Tilemap platforms and enemy chassis structures.
 * - `archiveBorderDark` / `archiveBorderLight`: Entity outline and border contrast levels.
 * - `sentinel`, `hopper`, `watcher`, `charger`: Enemy-specific primary body / glow overrides.
 *
 * @param customTheme - Optional partial Theme to merge into the Archive theme defaults.
 * @returns Fully populated Theme instance for Echo Runner.
 * @public
 */
export function createArchiveTheme(customTheme?: Partial<Theme>): Theme {
  const visualTheme = createVisualTheme(
    ECHO_PALETTE.restorationCyan,
    ECHO_PALETTE.restorationGold,
    ECHO_PALETTE.corruptionCrimson,
    { particleShape: "shard" }
  );

  return {
    spriteMap: { ...customTheme?.spriteMap },
    colorMap: {
      primary: ECHO_PALETTE.restorationCyan,
      secondary: ECHO_PALETTE.restorationGold,
      accent: ECHO_PALETTE.corruptionCrimson,
      player: ECHO_PALETTE.restorationCyan,
      restorationCyan: ECHO_PALETTE.restorationCyan,
      restorationCyanGlow: ECHO_PALETTE.restorationCyanGlow,
      restorationCyanFade: ECHO_PALETTE.restorationCyanFade,
      restorationGold: ECHO_PALETTE.restorationGold,
      restorationGoldGlow: ECHO_PALETTE.restorationGoldGlow,
      restorationWhite: ECHO_PALETTE.restorationWhite,
      corruptionCrimson: ECHO_PALETTE.corruptionCrimson,
      corruptionCrimsonGlow: ECHO_PALETTE.corruptionCrimsonGlow,
      corruptionAmber: ECHO_PALETTE.corruptionAmber,
      corruptionPurple: ECHO_PALETTE.corruptionPurple,
      corruptionPurpleGlow: ECHO_PALETTE.corruptionPurpleGlow,
      archiveVoidDark: ECHO_PALETTE.archiveVoidDark,
      archiveSlate: ECHO_PALETTE.archiveSlate,
      archiveBorderDark: ECHO_PALETTE.archiveBorderDark,
      archiveBorderLight: ECHO_PALETTE.archiveBorderLight,
      archiveGridLine: ECHO_PALETTE.archiveGridLine,
      archiveGridLineSecondary: ECHO_PALETTE.archiveGridLineSecondary,
      archiveDataStream: ECHO_PALETTE.archiveDataStream,
      archiveNodeActive: ECHO_PALETTE.archiveNodeActive,
      archiveNodeInactive: ECHO_PALETTE.archiveNodeInactive,
      enemy: ECHO_PALETTE.corruptionCrimson,
      sentinel: ECHO_PALETTE.corruptionPurple,
      hopper: ECHO_PALETTE.archiveNodeActive,
      watcher: colors.blue,
      charger: ECHO_PALETTE.corruptionCrimson,
      fragment: ECHO_PALETTE.restorationCyan,
      core: ECHO_PALETTE.restorationGold,
      node: ECHO_PALETTE.archiveNodeActive,
      shadowColor: "rgba(0, 0, 0, 0.35)",
      ...customTheme?.colorMap
    },
    lore: {
      title: "Echo Runner: The Archive",
      subtitle: "Restoration Protocol Active",
      ...customTheme?.lore
    },
    vfxProfile: customTheme?.vfxProfile
      ? {
          starDensity: 0.8,
          starSpeed: 0.4,
          ambientGlow: 0.4,
          particleShape: "shard",
          backgroundLayers: ["echo_bg", "grid", "data_pillars"],
          ...customTheme.vfxProfile
        }
      : {
          starDensity: 0.8,
          starSpeed: 0.4,
          ambientGlow: 0.4,
          particleShape: "shard",
          backgroundLayers: ["echo_bg", "grid", "data_pillars"]
        },
    visualTheme: customTheme?.visualTheme ?? visualTheme
  };
}

/**
 * Creates a Theme for Echo Runner corresponding to the specified visual skin.
 *
 * @param skin - Visual skin identifier ("dark" | "light" | "sunset")
 * @returns Configured Theme for Echo Runner
 */
export function createEchoRunnerTheme(skin: EchoRunnerSkinId): Theme {
  if (skin === "light") {
    return createArchiveTheme({
      colorMap: {
        archiveVoidDark: "#f1f5f9",
        archiveSlate: "#e2e8f0",
        archiveBorderDark: "#64748b",
        archiveBorderLight: "#94a3b8",

        restorationCyan: "#0284c7",
        player: "#0284c7",
        primary: "#0284c7",
        fragment: "#0284c7",

        corruptionCrimson: "#e11d48",
        enemy: "#e11d48",
        charger: "#e11d48",
        accent: "#e11d48",

        restorationGold: "#d97706",
        secondary: "#d97706",
        core: "#d97706",

        corruptionPurple: "#7e22ce",
        sentinel: "#7e22ce",

        watcher: "#0284c7",
        shadowColor: "rgba(15, 23, 42, 0.15)",

        restorationCyanGlow: "rgba(2, 132, 199, 0.25)",
        restorationCyanFade: "rgba(2, 132, 199, 0.08)",
        restorationGoldGlow: "rgba(217, 119, 6, 0.25)",
        corruptionCrimsonGlow: "rgba(225, 29, 72, 0.25)",
        corruptionPurpleGlow: "rgba(126, 34, 206, 0.25)",

        archiveGridLine: "rgba(15, 23, 42, 0.08)",
        archiveGridLineSecondary: "rgba(15, 23, 42, 0.04)",
        archiveDataStream: "rgba(225, 29, 72, 0.06)",

        archiveNodeActive: "#059669",
        archiveNodeInactive: "#dc2626",
        hopper: "#059669",
        node: "#059669",
      },
      lore: {
        subtitle: "Daylight Spectrum Active",
      },
    });
  }

  if (skin === "sunset") {
    return createArchiveTheme({
      colorMap: {
        archiveVoidDark: "#fdf6e3",
        archiveSlate: "#fef3c7",
        archiveBorderDark: "#b45309",
        archiveBorderLight: "#d97706",

        restorationCyan: "#e11d48",
        player: "#e11d48",
        primary: "#e11d48",
        fragment: "#e11d48",

        corruptionCrimson: "#c026d3",
        enemy: "#c026d3",
        charger: "#c026d3",
        accent: "#c026d3",

        restorationGold: "#ea580c",
        secondary: "#ea580c",
        core: "#ea580c",

        corruptionPurple: "#8f12fd",
        sentinel: "#8f12fd",

        watcher: "#e11d48",
        shadowColor: "rgba(67, 20, 7, 0.18)",

        restorationCyanGlow: "rgba(225, 29, 72, 0.25)",
        restorationCyanFade: "rgba(225, 29, 72, 0.08)",
        restorationGoldGlow: "rgba(234, 88, 12, 0.25)",
        corruptionCrimsonGlow: "rgba(192, 38, 211, 0.25)",
        corruptionPurpleGlow: "rgba(143, 18, 253, 0.25)",

        archiveGridLine: "rgba(180, 83, 9, 0.10)",
        archiveGridLineSecondary: "rgba(180, 83, 9, 0.05)",
        archiveDataStream: "rgba(225, 29, 72, 0.06)",

        archiveNodeActive: "#10b981",
        archiveNodeInactive: "#e11d48",
        hopper: "#10b981",
        node: "#10b981",
      },
      lore: {
        subtitle: "Sunset Horizon Active",
      },
    });
  }

  return createArchiveTheme();
}
