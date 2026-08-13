import React from "react";
import { Text, StyleSheet, TextProps } from "react-native";
import { colors, typography, spacing } from "@/theme";

interface HighScoreTextProps extends TextProps {
  label: string;
  score: number;
}

export const HighScoreText: React.FC<HighScoreTextProps> = ({
  label,
  score,
  style,
  ...props
}) => {
  return (
    <Text style={[styles.highScore, style]} {...props}>
      {label}: {score}
    </Text>
  );
};

const styles = StyleSheet.create({
  highScore: {
    fontSize: typography.sizes.xl,
    color: colors.gold,
    fontFamily: typography.game,
    marginBottom: spacing.xxxl,
  },
});
