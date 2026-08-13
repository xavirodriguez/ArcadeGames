import React from "react";
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { router } from "expo-router";
import { colors, typography, spacing, radius } from "@/theme";
import { hapticSelection } from "@/utils/haptics";

interface BackButtonProps {
  label?: string;
  onPress?: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export const BackButton: React.FC<BackButtonProps> = ({
  label = "Menu",
  onPress,
  accessibilityHint = "Regresa a la pantalla principal",
  style,
}) => {
  const handlePress = () => {
    hapticSelection();
    if (onPress) {
      onPress();
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/");
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Atrás - ${label}`}
      accessibilityHint={accessibilityHint}
    >
      <Text style={styles.backButtonText}>← {label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 100,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.cyan,
    backgroundColor: "rgba(0, 240, 255, 0.15)",
    minHeight: 44,
    minWidth: 80,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  backButtonText: {
    color: colors.cyan,
    fontSize: typography.sizes.sm,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
  },
});
