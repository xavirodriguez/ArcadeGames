import { Platform } from "react-native";
import { colors, COLORS } from "./colors";

/**
 * HUD Typography Scale.
 * Enforces strict hierarchy for retro spacecraft and arcade HUD displays.
 */
export const hudTypography = {
  sizes: {
    micro: 8,
    label: 10,
    value: 16,
    primary: 24,
    hero: 38,
  },
  weights: {
    regular: "400" as const,
    medium: "600" as const,
    bold: "700" as const,
    heavy: "900" as const,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1.2,
    widest: 2.5,
  },
} as const;

/**
 * HUD Neon Glow Intensity Levels (0 to 3).
 * Level 0: Pure flat vector (no shadow)
 * Level 1: Subtle HUD outline glow (4px)
 * Level 2: Standard arcade neon glow (10px)
 * Level 3: Intense alarm / hero glow (18px)
 */
export function getHudGlow(color: string, level: 0 | 1 | 2 | 3) {
  if (level === 0) {
    return Platform.OS === "web"
      ? { textShadow: "none" }
      : {
          textShadowColor: "transparent",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 0,
        };
  }

  const radiusMap: Record<1 | 2 | 3, number> = {
    1: 4,
    2: 10,
    3: 18,
  };

  const radius = radiusMap[level];

  if (Platform.OS === "web") {
    return {
      textShadow: `0 0 ${radius}px ${color}`,
    };
  }

  return {
    textShadowColor: color,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: radius,
  };
}

export const hudTokens = {
  typography: hudTypography,
  colors: {
    system: colors.cyan,
    warning: colors.amber,
    danger: colors.red,
    success: colors.green,
    textMuted: COLORS.whiteMuted,
    background: colors.panel,
    panelStrong: colors.panelStrong,
  },
  glow: {
    level0: (color: string) => getHudGlow(color, 0),
    level1: (color: string) => getHudGlow(color, 1),
    level2: (color: string) => getHudGlow(color, 2),
    level3: (color: string) => getHudGlow(color, 3),
  },
} as const;
