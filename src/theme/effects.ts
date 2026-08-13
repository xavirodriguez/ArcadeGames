import { Platform } from "react-native";
import { colors } from "./colors";

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
  cyanGlow: {
    shadowColor: colors.cyan,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  pinkGlow: {
    shadowColor: colors.pink,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  greenGlow: {
    shadowColor: colors.green,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: colors.gold,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  whiteGlow: {
    shadowColor: colors.white,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
};
