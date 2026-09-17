import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useGameTheme } from '../context/GameThemeContext';

import { TextStyle, StyleProp } from 'react-native';

interface ScoreDisplayProps {
  score: number;
  maxDigits?: number;
  fontSize?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Score con monospace + color dinámico del tema del juego o prop explicito.
 *
 * - fontFamily: Space Mono (o fallback Courier New/monospace)
 * - Padded con zeros a la izquierda
 * - Color + glow del tema actual o color parametrizado
 */
export function ScoreDisplay({
  score,
  maxDigits = 6,
  fontSize = 32,
  color,
  style,
}: ScoreDisplayProps) {
  const { accentColors } = useGameTheme();
  const textColor = color ?? accentColors?.primary ?? '#00FFFF';
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
