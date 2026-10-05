import { SOLAR_GARDEN_THEME, SOLAR_GARDEN_VARIANTS } from "../../../theme/solarGardenTheme";

/**
  * EchoRunner Solar Garden Palette
  * Map directly to central Solar Garden tokens: Porcelain/Gold/Cyan Restoration vs Biomechanical Chitin/Magenta/Acid Corruption.
  */
export const ECHO_PALETTE = {
  // Restoration & Restored Data (Player, Core, Active Pulse, Restored Nodes)
  restorationCyan: SOLAR_GARDEN_THEME.SOLAR_CYAN,
  restorationCyanGlow: "rgba(0, 229, 255, 0.4)",
  restorationCyanFade: "rgba(0, 229, 255, 0.08)",
  restorationGold: SOLAR_GARDEN_THEME.SOLAR_GOLD,
  restorationGoldGlow: SOLAR_GARDEN_VARIANTS.SOLAR_GOLD_GLOW,
  restorationWhite: SOLAR_GARDEN_THEME.SOLAR_WHITE,

  // Corruption & Corrupted Data (Enemies, Hazards, Alert States)
  corruptionCrimson: SOLAR_GARDEN_THEME.BIO_MAGENTA,
  corruptionCrimsonGlow: SOLAR_GARDEN_VARIANTS.BIO_MAGENTA_GLOW,
  corruptionAmber: SOLAR_GARDEN_THEME.THREAT_ORANGE,
  corruptionPurple: SOLAR_GARDEN_THEME.BIO_BLACK,
  corruptionPurpleGlow: "rgba(20, 24, 29, 0.5)",
  corruptionAcid: SOLAR_GARDEN_THEME.BIO_ACID,
  corruptionAcidGlow: SOLAR_GARDEN_VARIANTS.BIO_ACID_GLOW,

  // Environment & Architecture
  archiveVoidDark: SOLAR_GARDEN_THEME.BIO_BLACK,
  archiveSlate: SOLAR_GARDEN_THEME.GARDEN_GREEN,
  archiveBorderDark: "#0B0E12",
  archiveBorderLight: "#3D4F42",
  archiveGridLine: "rgba(0, 229, 255, 0.06)",
  archiveGridLineSecondary: "rgba(230, 184, 0, 0.04)",
  archiveDataStream: "rgba(255, 0, 127, 0.08)",
  archiveNodeActive: SOLAR_GARDEN_THEME.SOLAR_GOLD,
  archiveNodeInactive: SOLAR_GARDEN_THEME.THREAT_ORANGE
} as const;
