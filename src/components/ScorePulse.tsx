import React, { useState, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ScoreDisplay } from './ScoreDisplay';

interface ScorePulseProps {
  score: number;
  fontSize?: number;
}

/**
 * Score wrapper que anima pulse cuando el valor aumenta.
 *
 * - Scale: 1.0 → 1.15 → 1.0
 * - Sin setTimeout (todo en withSequence)
 */
export function ScorePulse({ score, fontSize = 32 }: ScorePulseProps) {
  const [prevScore, setPrevScore] = useState(score);

  const scoreScale = useSharedValue(1);

  useEffect(() => {
    if (score > prevScore) {
      // Scale: 1.0 → 1.15 → 1.0 (sin setTimeout)
      scoreScale.value = withSequence(
        withTiming(1.15, {
          duration: 100,
          easing: Easing.out(Easing.cubic)
        }),
        withTiming(1.0, {
          duration: 150,
          easing: Easing.out(Easing.quad)
        })
      );

      setPrevScore(score);
    } else if (score < prevScore) {
      setPrevScore(score);
    }
  }, [score, prevScore, scoreScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ScoreDisplay score={score} fontSize={fontSize} />
    </Animated.View>
  );
}
