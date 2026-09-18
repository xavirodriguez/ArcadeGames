import { useCallback } from "react";
import { StyleSheet, Text, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { hapticSelection } from "../../utils/haptics";

export interface GestureActionButtonProps {
  label: string;
  onPressIn: () => void;
  onPressOut: () => void;
  size?: number;
  color?: string;
  borderColor?: string;
  pressedColor?: string;
  pressedBorderColor?: string;
  disabledColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

/**
 * Modern Gesture-based action button.
 * Uses Gesture.Pan() with Reanimated SharedValues for scale & opacity.
 * Avoids JS thread jumps during visual updates for zero-latency feedback.
 */
export function GestureActionButton({
  label,
  onPressIn,
  onPressOut,
  size = 56,
  color = "rgba(255,255,255,0.15)",
  borderColor = "rgba(255,255,255,0.4)",
  pressedColor = "rgba(255,255,255,0.45)",
  pressedBorderColor = "#FFFFFF",
  disabledColor = "rgba(100,100,100,0.2)",
  textColor = "#FFFFFF",
  style,
  labelStyle,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: GestureActionButtonProps) {
  const finalSize = Math.max(48, size);
  const isPressed = useSharedValue(false);
  const scale = useSharedValue(1);

  const triggerHapticAndPressIn = useCallback(() => {
    if (disabled) return;
    hapticSelection();
    onPressIn();
  }, [disabled, onPressIn]);

  const triggerPressOut = useCallback(() => {
    if (disabled) return;
    onPressOut();
  }, [disabled, onPressOut]);

  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      'worklet';
      if (disabled) return;
      isPressed.value = true;
      scale.value = withTiming(0.92, { duration: 50 });
      runOnJS(triggerHapticAndPressIn)();
    })
    .onFinalize(() => {
      'worklet';
      if (disabled) return;
      isPressed.value = false;
      scale.value = withTiming(1, { duration: 100 });
      runOnJS(triggerPressOut)();
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: disabled
        ? disabledColor
        : isPressed.value
        ? pressedColor
        : color,
      borderColor: disabled
        ? "rgba(150,150,150,0.4)"
        : isPressed.value
        ? pressedBorderColor
        : borderColor,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={[
          styles.button,
          {
            width: finalSize,
            height: finalSize,
            borderRadius: finalSize / 2,
          },
          animatedStyle,
          disabled && styles.disabled,
          style,
        ]}
      >
        <Text style={[styles.label, { color: textColor }, disabled && styles.disabledLabel, labelStyle]}>
          {label}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    minWidth: 48,
    minHeight: 48,
    userSelect: "none",
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontWeight: "bold",
    fontSize: 14,
    fontFamily: "monospace",
    userSelect: "none",
  },
  disabledLabel: {
    color: "rgba(255,255,255,0.4)",
  },
});
