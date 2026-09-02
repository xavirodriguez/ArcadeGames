/**
  * EchoRunner "The Archive" Color Palette
  * Distinguishes Corrupted vs Restored Archive data and environments.
  */
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
