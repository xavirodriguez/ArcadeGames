import React from "react";
import { Text, StyleSheet, TextProps } from "react-native";
import { colors, typography, spacing } from "@/theme";

interface GameTitleProps extends TextProps {
  children: string;
  glowColor?: string;
}

export const GameTitle: React.FC<GameTitleProps> = ({
  children,
  glowColor = colors.cyan,
  style,
  ...props
}) => {
  return (
    <Text
      style={[
        styles.title,
        { textShadowColor: glowColor },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: typography.sizes.title,
    color: colors.white,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xxxl,
    textAlign: "center",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
});
