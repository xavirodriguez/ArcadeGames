import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';

// Cargar Skia condicionalmente (Pattern de GameUI.tsx)
let Canvas: any = null;
let BackdropBlur: any = null;
let Fill: any = null;

if (Platform.OS !== 'web') {
  try {
    const SkiaModule = require('@shopify/react-native-skia');
    Canvas = SkiaModule.Canvas;
    BackdropBlur = SkiaModule.BackdropBlur;
    Fill = SkiaModule.Fill;
  } catch (_err) {
    // Skia es opcional; UI funciona sin ella
  }
}

interface TransitionOverlayProps {
  blurRadius: SharedValue<number>;
  overlayOpacity: SharedValue<number>;
  children?: React.ReactNode;
}

/**
 * Overlay reusable con blur nativo Skia y opacidad animada.
 *
 * Maneja:
 * - Blur dinámico (pausa/game-over)
 * - Opacity animada
 * - pointerEvents reactivo (NO stuck en "none")
 * - Cross-platform (skip blur en web)
 */
export function TransitionOverlay({
  blurRadius,
  overlayOpacity,
  children
}: TransitionOverlayProps) {
  // Derivar pointerEvents reactivamente
  const pointerEventsValue = useDerivedValue(() => {
    return overlayOpacity.value > 0 ? 'auto' : 'none';
  });

  const animatedViewProps = useAnimatedProps(() => ({
    pointerEvents: pointerEventsValue.value as any,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Animated.View
      animatedProps={animatedViewProps}
      style={[
        StyleSheet.absoluteFill,
        {
          justifyContent: 'center',
          alignItems: 'center',
        },
        overlayStyle,
      ]}
    >
      {/* Blur nativo con Skia (solo iOS/Android) */}
      {Platform.OS !== 'web' && Canvas && BackdropBlur && Fill && (
        <Canvas style={StyleSheet.absoluteFill}>
          <BackdropBlur blur={blurRadius}>
            <Fill color="rgba(0, 0, 0, 0.5)" />
          </BackdropBlur>
        </Canvas>
      )}

      {/* Contenido del overlay */}
      {children}
    </Animated.View>
  );
}
