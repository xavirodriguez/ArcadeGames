import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TextStyle } from 'react-native';

interface ComboDisplayProps {
  multiplier: number;
  isActive: boolean;
  timerRemaining?: number;
  timerDuration?: number;
}

export const ComboDisplay: React.FC<ComboDisplayProps> = ({
  multiplier,
  isActive,
  timerRemaining,
  timerDuration = 2.0,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isUrgent =
    timerRemaining !== undefined &&
    timerDuration > 0 &&
    timerRemaining / timerDuration < 0.3;

  useEffect(() => {
    if (isActive && multiplier > 1) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.5,
          useNativeDriver: true,
          tension: 100,
          friction: 3,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [multiplier, isActive, scaleAnim]);

  useEffect(() => {
    if (isUrgent && isActive && multiplier > 1) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isUrgent, isActive, multiplier, pulseAnim]);

  if (!isActive || multiplier <= 1) return null;

  const getComboColor = () => {
    if (isUrgent) return '#FF3333'; // Urgent Red Alert
    if (multiplier >= 10) return '#FFD700'; // Gold
    if (multiplier >= 5) return '#FF8C00'; // DarkOrange
    return '#FFFFFF';
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }}>
        <Text style={[
          styles.comboText,
          { color: getComboColor() },
          multiplier >= 10 && !isUrgent && styles.goldShadow,
          isUrgent && styles.urgentShadow
        ]}>
          x{multiplier}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 100,
  },
  comboText: Platform.select<TextStyle>({
    web: {
      fontSize: 32,
      fontWeight: '900',
      fontStyle: 'italic',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.75)',
    } as TextStyle,
    default: {
      fontSize: 32,
      fontWeight: '900',
      fontStyle: 'italic',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 2, height: 2 },
      textShadowRadius: 4,
    },
  })!,
  urgentShadow: Platform.select<TextStyle>({
    web: {
      textShadow: '0 0 12px rgba(255, 51, 51, 0.8)',
    } as TextStyle,
    default: {
      textShadowColor: 'rgba(255, 51, 51, 0.8)',
      textShadowRadius: 12,
    },
  })!,
  goldShadow: Platform.select<TextStyle>({
    web: {
      textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
    } as TextStyle,
    default: {
      textShadowColor: 'rgba(255, 215, 0, 0.5)',
      textShadowRadius: 10,
    },
  })!,
});
