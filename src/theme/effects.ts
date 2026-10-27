import { Platform, type TextStyle, type ViewStyle } from "react-native";
import { colors } from "./colors";
import { createNeonGlow } from "../styles/Glow";

export function neonTextGlow(
  color: string,
  radius = 15,
  offsetX = 0,
  offsetY = 0
): TextStyle & { textShadow?: string } {
  if (Platform.OS === "web") {
    return {
      textShadow: `${offsetX}px ${offsetY}px ${radius}px ${color}`,
    };
  }

  return {
    textShadowColor: color,
    textShadowOffset: {
      width: offsetX,
      height: offsetY,
    },
    textShadowRadius: radius,
  };
}

export const glowLevels = {
  soft: (color: string): ViewStyle => createNeonGlow(color, 0.4),
  medium: (color: string): ViewStyle => createNeonGlow(color, 0.6),
  strong: (color: string): ViewStyle => createNeonGlow(color, 0.8),
  intense: (color: string): ViewStyle => createNeonGlow(color, 1.0),
};

export const effects: Record<string, ViewStyle> = {
  cyanGlow: createNeonGlow(colors.cyan, 1),
  pinkGlow: createNeonGlow(colors.pink, 1),
  greenGlow: createNeonGlow(colors.green, 1),
  goldGlow: createNeonGlow(colors.gold, 1),
  whiteGlow: createNeonGlow(colors.white, 0.8),
};
