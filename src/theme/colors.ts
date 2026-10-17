/**
 * Centralized design system color tokens for ODISEA-7.
 */

export const semanticColors = {
  // Core System Roles
  system: "#00E8D2",       // HUD Cyan
  warning: "#F6C85F",      // Record / Threat Amber
  success: "#67F7A7",      // Intermission / Victory Green
  danger: "#FF315B",       // Alert / Damage / Game Over Red

  // Gameplay Roles
  ally: "#00FF41",         // Player / Shield Green
  enemy: "#FF006E",        // Hostile Pink/Magenta
  boss: "#FFD700",         // Boss Gold
  buff: "#00D9FF",         // Mutator / Powerup Cyan

  // Surface & Background Tokens
  background: {
    default: "#0A0E27",
    dark: "#06100F",
    slate: "#0F172A",
    panel: "rgba(3, 16, 15, 0.76)",
    panelStrong: "rgba(2, 10, 10, 0.92)",
    overlay: "rgba(0, 0, 0, 0.75)",
  },

  // Neutral Scale
  neutral: {
    50: "#FFFFFF",
    100: "#F3F7F6",
    200: "#E8E8E8",
    300: "#CCCCCC",
    400: "#AAAAAA",
    500: "#666666",
    600: "#444444",
    700: "#1E293B",
    800: "#161622",
    900: "#0A0E27",
  },
} as const;

export const colors = {
  // Direct semantic roles
  system: semanticColors.system,
  warning: semanticColors.warning,
  success: semanticColors.success,
  danger: semanticColors.danger,
  ally: semanticColors.ally,
  enemy: semanticColors.enemy,
  boss: semanticColors.boss,
  buff: semanticColors.buff,

  // Background aliases
  background: semanticColors.background.default,
  backgroundDark: semanticColors.background.dark,
  backgroundSlate: semanticColors.background.slate,
  panel: semanticColors.background.panel,
  panelStrong: semanticColors.background.panelStrong,
  overlay: semanticColors.background.overlay,

  // Text / UI roles
  primary: "#00FF41",
  secondary: "#FF006E",
  tertiary: "#00D9FF",
  neutral: "#E8E8E8",

  cyan: "#00D9FF",
  pink: "#FF006E",
  green: "#00FF41",
  gold: "#FFD700",

  white: "#FFFFFF",
  textSecondary: "#CCCCCC",
  textMuted: "rgba(243, 247, 246, 0.62)",

  surface: "#161622",
  border: "rgba(0, 232, 210, 0.32)",
  borderDark: "#1E293B",
  borderLight: "#475569",

  // Extended neon palette for games
  violet: "#C084FC",
  purple: "#A855F7",
  violetDark: "#4A0082",
  magenta: "#FF00FF",
  magentaHot: "#FF0088",
  slate: "#334155",
  red: "#EF4444",
  redHot: "#FF2200",
  orange: "#F97316",
  orangeDark: "#FF4500",
  amber: "#F59E0B",
  yellow: "#FBBF24",
  blue: "#3B82F6",
  blueLight: "#60A5FA",
} as const;

/**
 * Legacy COLORS object kept for backwards compatibility across existing style sheets.
 */
export const COLORS = {
  // Legacy aliases
  success: semanticColors.ally,
  error: semanticColors.danger,
  warning: semanticColors.warning,
  info: "#00FFFF",

  system: semanticColors.system,
  danger: semanticColors.danger,

  cyan: semanticColors.system,
  cyanFaint: "rgba(0, 232, 210, 0.08)",
  white: "#F3F7F6",
  whiteMuted: "rgba(243, 247, 246, 0.62)",
  amber: semanticColors.warning,
  green: semanticColors.success,
  red: semanticColors.danger,
  ink: "#000000",
  bgDark: "#0A0E27",
  bgPanel: "rgba(10, 14, 39, 0.85)",
  panel: semanticColors.background.panel,
  panelStrong: semanticColors.background.panelStrong,
  border: "rgba(0, 232, 210, 0.32)",

  // Space Invaders extended palette tokens
  primary: "#00FF41",
  secondary: "#FF006E",
  tertiary: "#00D9FF",
  neutral: "#E8E8E8",
  boss: "#FFD700",

  // Neon / glow accents
  neonCyan: "#00FFFF",
  neonPurple: "#FF00FF",
} as const;
