import React from "react";
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { colors, typography, radius, spacing, effects, semanticColors } from "../../theme";
import { usePressedButton } from "../../hooks/usePressedButton";
import { GameThemeContext } from "../../context/GameThemeContext";
import { hapticSelection } from "../../utils/haptics";

interface NeonButtonProps {
  children: string;
  onPress: () => void;
  variant?: "cyan" | "pink" | "green" | "white" | "system" | "warning" | "danger" | "success";
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  onPress,
  variant = "cyan",
  bordered = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const themeContext = React.useContext(GameThemeContext);
  const highContrast = themeContext?.highContrast ?? false;
  const reduceMotion = themeContext?.reduceMotion ?? false;

  const variantColor =
    variant === "system"
      ? semanticColors.system
      : variant === "warning"
        ? semanticColors.warning
        : variant === "danger"
          ? semanticColors.danger
          : variant === "success"
            ? semanticColors.success
            : (colors[variant as keyof typeof colors] || colors.cyan);

  const { pressProps, pressedStyle } = usePressedButton(variantColor);
  const glowStyle = reduceMotion
    ? {}
    : (effects[`${variant}Glow` as keyof typeof effects] || effects.cyanGlow);

  const handlePress = () => {
    hapticSelection();
    onPress();
  };

  const dynamicButtonStyle: ViewStyle = bordered
    ? {
        backgroundColor: "transparent",
        borderWidth: highContrast ? 3 : 2,
        borderColor: variantColor,
      }
    : {
        backgroundColor: variantColor,
        borderWidth: highContrast ? 2 : 0,
        borderColor: highContrast ? semanticColors.neutral[50] : "transparent",
      };

  const dynamicTextStyle: TextStyle = bordered
    ? {
        color: variantColor,
        textShadowColor: variantColor,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: reduceMotion ? 0 : 8,
      }
    : {
        color: semanticColors.background.dark,
        fontWeight: typography.weights.heavy,
      };

  return (
    <TouchableOpacity
      {...pressProps}
      style={[
        styles.button,
        dynamicButtonStyle,
        glowStyle,
        reduceMotion ? null : pressedStyle,
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || children}
      accessibilityHint={accessibilityHint}
    >
      <Text style={[styles.text, dynamicTextStyle, textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    minHeight: 48,
    borderRadius: radius.xl,
    minWidth: 130,
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
  },
  text: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.data,
    letterSpacing: typography.letterSpacing.wide,
    userSelect: "none",
  },
});
