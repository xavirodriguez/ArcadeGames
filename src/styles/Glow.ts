import { Platform, ViewStyle } from "react-native";
import { COLORS } from "../theme";

export function createNeonGlow(color = COLORS.neonCyan, intensity = 1): ViewStyle {
  if (Platform.OS === "web") {
    return {
      boxShadow: `0 0 ${12 * intensity}px ${color}`,
    } as any;
  }

  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: Math.min(1, 0.8 * intensity),
    shadowRadius: 12 * intensity,
    elevation: Math.round(8 * intensity),
  };
}
