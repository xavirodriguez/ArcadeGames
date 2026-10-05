import { SOLAR_GARDEN_PALETTE } from "../../shared/rendering/SolarGardenPalette";

/**
  * EchoRunner "Solar Garden" Color Palette
  * Map Echo Runner palette roles to the shared Bio-Mechanical Solarpunk design system.
  */
export const ECHO_PALETTE = {
  // Restoration & Restored Data (Player, Core, Active Pulse, Restored Nodes)
  restorationCyan: SOLAR_GARDEN_PALETTE.solarCyan,
  restorationCyanGlow: SOLAR_GARDEN_PALETTE.solarCyanGlow,
  restorationCyanFade: "rgba(0, 229, 255, 0.08)",
  restorationGold: SOLAR_GARDEN_PALETTE.solarGold,
  restorationGoldGlow: SOLAR_GARDEN_PALETTE.solarGoldGlow,
  restorationWhite: SOLAR_GARDEN_PALETTE.solarWhite,

  // Corruption & Corrupted Data (Enemies, Hazards, Alert States)
  corruptionCrimson: SOLAR_GARDEN_PALETTE.bioMagenta,
  corruptionCrimsonGlow: SOLAR_GARDEN_PALETTE.bioMagentaGlow,
  corruptionAmber: SOLAR_GARDEN_PALETTE.threatOrange,
  corruptionPurple: SOLAR_GARDEN_PALETTE.bioBlack,
  corruptionPurpleGlow: "rgba(28, 32, 38, 0.6)",
  bioAcid: SOLAR_GARDEN_PALETTE.bioAcid,

  // Solar Garden Structure & Environment
  archiveVoidDark: SOLAR_GARDEN_PALETTE.skyDawn,
  archiveSlate: SOLAR_GARDEN_PALETTE.gardenGreen,
  archiveBorderDark: "#152219",
  archiveBorderLight: SOLAR_GARDEN_PALETTE.gardenGreenLight,
  archiveGridLine: "rgba(0, 229, 255, 0.08)",
  archiveGridLineSecondary: "rgba(230, 184, 0, 0.05)",
  archiveDataStream: "rgba(255, 0, 127, 0.08)",
  archiveNodeActive: SOLAR_GARDEN_PALETTE.solarCyan,
  archiveNodeInactive: SOLAR_GARDEN_PALETTE.bioMagenta
} as const;
