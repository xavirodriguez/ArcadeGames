import { Platform } from "react-native";
import { colors } from "./colors";
import { createNeonGlow } from "../styles/Glow";

export function neonTextGlow(color: string, radius = 15) {
  if (Platform.OS === "web") {
    return {
      textShadow: `0 0 ${radius}px ${color}`,
    };
  }

  return {
    textShadowColor: color,
    textShadowOffset: {
      width: 0,
      height: 0,
    },
    textShadowRadius: radius,
  };
}

export const effects = {
  cyanGlow: createNeonGlow(colors.cyan, 1),
  pinkGlow: createNeonGlow(colors.pink, 1),
  greenGlow: createNeonGlow(colors.green, 1),
  goldGlow: createNeonGlow(colors.gold, 1),
  whiteGlow: createNeonGlow(colors.white, 0.8),
};
