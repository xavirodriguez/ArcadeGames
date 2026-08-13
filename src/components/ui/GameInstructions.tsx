import React from "react";
import { Text, StyleSheet, TextProps } from "react-native";
import { colors, typography, spacing } from "@/theme";

interface GameInstructionsProps extends TextProps {
  children: string;
}

export const GameInstructions: React.FC<GameInstructionsProps> = ({
  children,
  style,
  ...props
}) => {
  return (
    <Text style={[styles.instructions, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  instructions: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontFamily: typography.game,
    marginBottom: spacing.md,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
});
