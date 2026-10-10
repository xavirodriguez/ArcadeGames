import React from "react";
import { StyleSheet, Text, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { TouchInputState } from "@tiny-aster/core";
import { colors } from "@/theme/colors";
import { hapticImpactLight } from "@/utils/haptics";
import { useGestureHandlerRootViewCheck } from "./useGestureHandlerRootViewCheck";

export interface TouchHoldButtonProps {
  label: string;
  buttonName?: string;
  touchState?: TouchInputState;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  size?: number;
  color?: string;
  borderColor?: string;
  pressedColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

export function TouchHoldButton({
  label,
  buttonName,
  touchState,
  onHoldStart,
  onHoldEnd,
  size = 56,
  color = "rgba(0, 232, 210, 0.15)",
  borderColor = colors.border,
  pressedColor = "rgba(0, 232, 210, 0.5)",
  textColor = colors.white,
  style,
  labelStyle,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: TouchHoldButtonProps) {
  useGestureHandlerRootViewCheck();
  const finalSize = Math.max(48, size);
  const isHeld = useSharedValue(false);
  const scale = useSharedValue(1);

  const handleHoldStart = () => {
    if (disabled) return;
    hapticImpactLight();
    if (buttonName && touchState) {
      touchState.setButton(buttonName, true);
    }
    if (onHoldStart) {
      onHoldStart();
    }
  };

  const handleHoldFinalize = () => {
    if (disabled) return;
    if (buttonName && touchState) {
      touchState.setButton(buttonName, false);
    }
    if (onHoldEnd) {
      onHoldEnd();
    }
  };

  // Uses Gesture.Pan with minDistance 0 to handle holding and releases in onFinalize
  const panGesture = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin(() => {
      'worklet';
      if (disabled) return;
      isHeld.value = true;
      scale.value = withTiming(0.92, { duration: 50 });
      handleHoldStart();
    })
    .onFinalize(() => {
      'worklet';
      if (disabled) return;
      isHeld.value = false;
      scale.value = withTiming(1, { duration: 100 });
      handleHoldFinalize();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: disabled
      ? "rgba(100, 100, 100, 0.2)"
      : isHeld.value
      ? pressedColor
      : color,
    borderColor: disabled ? "rgba(150, 150, 150, 0.3)" : borderColor,
  }));

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
        <Text style={[styles.label, { color: textColor }, labelStyle]}>{label}</Text>
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
    fontSize: 16,
    fontFamily: "monospace",
    userSelect: "none",
  },
});
