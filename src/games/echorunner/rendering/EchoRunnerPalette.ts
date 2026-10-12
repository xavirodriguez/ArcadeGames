import { Theme, createVisualTheme } from "@tiny-aster/core";

/**
 * EchoRunner "The Archive" Color Palette
 * Distinguishes Corrupted vs Restored Archive data and environments.
 */
// TODO(refactor): código duplicado detectado (bloque) con shared/rendering/PlatformerSharedVisualUtils.ts:41-61. Considerar extraer a función compartida. Ref: 47d6edc7
export const ECHO_PALETTE = {
  // Restoration & Restored Data (Player, Core, Active Pulse, Restored Nodes)
  restorationCyan: "#00f0ff",
  restorationCyanGlow: "rgba(0, 240, 255, 0.4)",
  restorationCyanFade: "rgba(0, 240, 255, 0.08)",
  restorationGold: "#fbbf24",
  restorationGoldGlow: "rgba(251, 191, 36, 0.5)",
  restorationWhite: "#ffffff",

  // Corruption & Corrupted Data (Enemies, Hazards, Alert States)
  corruptionCrimson: "#ff0055",
  corruptionCrimsonGlow: "rgba(255, 0, 85, 0.4)",
  corruptionAmber: "#f97316",
  corruptionPurple: "#a855f7",
  corruptionPurpleGlow: "rgba(168, 85, 247, 0.4)",

  // Neutral Archive Structure & Environment
  archiveVoidDark: "#060913",
  archiveSlate: "#1e293b",
  archiveBorderDark: "#0f172a",
  archiveBorderLight: "#334155",
  archiveGridLine: "rgba(0, 240, 255, 0.05)",
  archiveGridLineSecondary: "rgba(168, 85, 247, 0.03)",
  archiveDataStream: "rgba(255, 0, 85, 0.06)",
  archiveNodeActive: "#10b981",
  archiveNodeInactive: "#ef4444"
} as const;

/**
 * Guide & Workflow for Creating a Custom Theme / Skin for Echo Runner (e.g. Mario Bros skin):
 *
 * Echo Runner visual drawers read entity and environment colors dynamically from the active `Theme`
 * resource registered on the ECS `World` (via `resolveEchoRunnerPalette`).
 *
 * To instantiate Echo Runner with a custom theme:
 * ```ts
 * const marioTheme: Theme = {
 *   colorMap: {
 *     player: "#ff0000",          // Mario Red
 *     primary: "#0000ff",         // Overalls Blue
 *     secondary: "#facc15",       // Coin Yellow
 *     archiveVoidDark: "#5c94fc", // Mushroom Kingdom Sky Blue
 *     archiveSlate: "#d04800",    // Brick Red
 *     fragment: "#facc15",        // Question Block Yellow
 *     sentinel: "#00a800",        // Koopa Green
 *     hopper: "#804000",          // Goomba Brown
 *   },
 *   vfxProfile: {
 *     particleShape: "circle",
 *     backgroundLayers: ["sky", "clouds"],
 *   }
 * };
 *
 * const game = new EchoRunnerGame({ theme: marioTheme });
 * ```
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
      watcher: "#3b82f6",
      charger: ECHO_PALETTE.corruptionCrimson,
      fragment: ECHO_PALETTE.restorationCyan,
      core: ECHO_PALETTE.restorationGold,
      node: ECHO_PALETTE.archiveNodeActive,
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
