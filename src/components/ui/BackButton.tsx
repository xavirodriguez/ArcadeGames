import React from "react";
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { router } from "expo-router";
import { colors, typography, spacing, radius } from "@/theme";
import { hapticSelection } from "@/utils/haptics";
import { useTranslation } from "@/hooks/useTranslation";

interface BackButtonProps {
  label?: string;
  onPress?: () => void;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const BackButton: React.FC<BackButtonProps> = ({
  label,
  onPress,
  accessibilityHint,
  accessibilityLabel,
  style,
}) => {
  const { t } = useTranslation();
  const displayLabel = label || t?.common?.menu || "Menu";
  const defaultHint = accessibilityHint || t?.accessibility?.close_button_hint || "Returns to the previous screen";
  const defaultLabel = accessibilityLabel || `${t?.common?.back || "Back"} - ${displayLabel}`;

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
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={defaultLabel}
      accessibilityHint={defaultHint}
    >
      <Text style={styles.backButtonText}>← {displayLabel}</Text>
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
    borderWidth: 1.5,
    borderColor: colors.cyan,
    backgroundColor: "rgba(0, 240, 255, 0.15)",
    minHeight: 44,
    minWidth: 88,
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
