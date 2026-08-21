import React from "react";
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { colors, typography, radius, spacing, effects } from "@/theme";
import { usePressedButton } from "@/hooks/usePressedButton";

interface NeonButtonProps {
  children: string;
  onPress: () => void;
  variant?: "cyan" | "pink" | "green" | "white";
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
  const themeColor = colors[variant as keyof typeof colors] || colors.cyan;
  const { pressProps, pressedStyle } = usePressedButton(themeColor);
  const glowStyle = effects[`${variant}Glow` as keyof typeof effects] || effects.cyanGlow;

  const dynamicButtonStyle: ViewStyle = bordered
    ? {
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: themeColor,
      }
    : {
        backgroundColor: themeColor,
      };

  const dynamicTextStyle: TextStyle = bordered
    ? {
        color: themeColor,
        textShadowColor: themeColor,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
      }
    : {
        color: "#000000",
      };

  return (
    <TouchableOpacity
      {...pressProps}
      style={[
        styles.button,
        dynamicButtonStyle,
        glowStyle,
        pressedStyle,
        style,
      ]}
      onPress={onPress}
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
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    minWidth: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
  },
});
