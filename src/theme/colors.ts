export const COLORS = {
  // Semantic roles by state
  success: '#00FF41',     // Arcade green
  error: '#FF315B',       // Game Over red
  warning: '#FFB800',     // Record amber
  info: '#00FFFF',        // Info cyan

  // Structural roles
  ink: '#000000',
  bgDark: '#0A0E27',
  bgPanel: 'rgba(10, 14, 39, 0.85)',

  // Neon / glow accents
  neonCyan: '#00FFFF',
  neonPurple: '#FF00FF',
} as const;

export const colors = {
  background: "#06060c",
  backgroundDark: "#0a0a14",
  backgroundSlate: "#0f172a",

  cyan: "#00f0ff",
  pink: "#ff0055",
  green: "#00ff66",
  gold: "#ffd700",

  white: "#ffffff",
  textSecondary: "#cccccc",
  textMuted: "#aaaaaa",

  surface: "#161622",
  border: "#444444",
  borderDark: "#1e293b",
  borderLight: "#475569",

  overlay: "rgba(0, 0, 0, 0.75)",

  // Expanded neon palette for games
  violet: "#c084fc",
  purple: "#a855f7",
  violetDark: "#4a0082",
  magenta: "#ff00ff",
  magentaHot: "#ff0088",
  slate: "#334155",
  red: "#ef4444",
  redHot: "#ff2200",
  orange: "#f97316",
  orangeDark: "#ff4500",
  amber: "#f59e0b",
  yellow: "#fbbf24",
  blue: "#3b82f6",
  blueLight: "#60a5fa",
} as const;
