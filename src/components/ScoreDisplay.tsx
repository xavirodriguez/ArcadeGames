import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useGameTheme } from '../context/GameThemeContext';
import { colors } from '../theme/colors';

interface ScoreDisplayProps {
  score: number;
  maxDigits?: number;
  fontSize?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Score con monospace + color dinámico del tema del juego o prop explícito.
 *
 * - fontFamily: Space Mono (o fallback Courier New/monospace)
 * - Padded con zeros a la izquierda
 * - Color + glow del tema actual
 */
export function ScoreDisplay({
  score,
  maxDigits = 6,
  fontSize = 32,
  color,
  style,
}: ScoreDisplayProps) {
  const theme = useGameTheme();
  const textColor = color ?? theme?.accentColors?.primary ?? colors.cyan;
  const paddedScore = String(Math.max(0, score)).padStart(maxDigits, '0');

  return (
    <Text
      style={[
        styles.score,
        {
          fontSize,
          color: textColor,
          textShadowColor: textColor,
        },
        style,
      ]}
    >
      {paddedScore}
    </Text>
  );
}

const styles = StyleSheet.create({
  score: {
    fontFamily: 'Space Mono',
    fontWeight: '700',
    letterSpacing: 2,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
});
