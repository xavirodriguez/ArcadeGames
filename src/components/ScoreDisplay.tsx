import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useGameTheme } from '@/context/GameThemeContext';

interface ScoreDisplayProps {
  score: number;
  maxDigits?: number;
  fontSize?: number;
}

/**
 * Score con monospace + color dinámico del tema del juego.
 *
 * - fontFamily: Space Mono (o fallback Courier New / monospace)
 * - Padded con zeros a la izquierda
 * - Color + glow del tema actual
 */
export function ScoreDisplay({
  score,
  maxDigits = 6,
  fontSize = 32,
}: ScoreDisplayProps) {
  const { accentColors } = useGameTheme();
  const paddedScore = String(score).padStart(maxDigits, '0');

  return (
    <Text
      style={[
        styles.score,
        {
          fontSize,
          color: accentColors.primary,
          textShadowColor: accentColors.primary,
        },
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
