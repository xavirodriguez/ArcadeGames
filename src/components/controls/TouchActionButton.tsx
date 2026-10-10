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
import {
  hapticSelection,
  hapticImpactLight,
  hapticImpactMedium,
  hapticImpactHeavy,
} from "@/utils/haptics";
import { useGestureHandlerRootViewCheck } from "./useGestureHandlerRootViewCheck";

export type TouchHapticType = "selection" | "light" | "medium" | "heavy" | "none";

export interface TouchActionButtonProps {
  /** Label text or emoji on the button. */
  label: string;
  /** Named button identifier in TouchInputState (e.g. "fire", "jump"). */
  buttonName?: string;
  /** TouchInputState reference. */
  touchState?: TouchInputState;
  /** Optional press start callback. */
  onPressIn?: () => void;
  /** Optional press end/release callback. */
  onPressOut?: () => void;
  /** Diameter of the button target in pixels (default: 56, min: 48). */
  size?: number;
  /** Base background color. Default: transparent panel. */
  color?: string;
  /** Border color. Default: cyan border. */
  borderColor?: string;
  /** Active pressed background color. */
  pressedColor?: string;
  /** Active pressed border color. */
  pressedBorderColor?: string;
  /** Text color. Default: white. */
  textColor?: string;
  /** Haptic feedback style. Default: "selection". */
  haptic?: TouchHapticType;
  /** Style override for button container. */
  style?: StyleProp<ViewStyle>;
  /** Style override for label. */
  labelStyle?: StyleProp<TextStyle>;
  /** Accessibility label. */
  accessibilityLabel?: string;
  /** Accessibility hint. */
  accessibilityHint?: string;
  /** Disabled state. */
  disabled?: boolean;
}

export function TouchActionButton({
  label,
  buttonName,
  touchState,
  onPressIn,
  onPressOut,
  size = 56,
  color = "rgba(0, 232, 210, 0.15)",
  borderColor = colors.border,
  pressedColor = "rgba(0, 232, 210, 0.45)",
  pressedBorderColor = colors.system,
  textColor = colors.white,
  haptic = "selection",
  style,
  labelStyle,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: TouchActionButtonProps) {
  useGestureHandlerRootViewCheck();
  const finalSize = Math.max(48, size);
  const isPressed = useSharedValue(false);
  const scale = useSharedValue(1);

  const triggerHaptic = () => {
    if (disabled || haptic === "none") return;
    if (haptic === "selection") hapticSelection();
    else if (haptic === "light") hapticImpactLight();
    else if (haptic === "medium") hapticImpactMedium();
    else if (haptic === "heavy") hapticImpactHeavy();
  };

  const handlePressBegin = () => {
    if (disabled) return;
    triggerHaptic();
    if (buttonName && touchState) {
      touchState.setButton(buttonName, true);
    }
    if (onPressIn) {
      onPressIn();
    }
  };

  const handlePressFinalize = () => {
    if (disabled) return;
    if (buttonName && touchState) {
      touchState.setButton(buttonName, false);
    }
    if (onPressOut) {
      onPressOut();
    }
  };

  // Uses Gesture.Tap or Gesture.Pan with minDistance 0, responding immediately onBegin
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onBegin(() => {
      'worklet';
      if (disabled) return;
      isPressed.value = true;
      scale.value = withTiming(0.92, { duration: 50 });
      handlePressBegin();
    })
    .onFinalize(() => {
      'worklet';
      if (disabled) return;
      isPressed.value = false;
      scale.value = withTiming(1, { duration: 100 });
      handlePressFinalize();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: disabled
      ? "rgba(100, 100, 100, 0.2)"
      : isPressed.value
      ? pressedColor
      : color,
    borderColor: disabled
      ? "rgba(150, 150, 150, 0.3)"
      : isPressed.value
      ? pressedBorderColor
      : borderColor,
  }));

  return (
    <GestureDetector gesture={tapGesture}>
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
        <Animated.Text
          style={[styles.label, { color: textColor }, disabled && styles.disabledLabel, labelStyle]}
        >
          {label}
        </Animated.Text>
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
  disabledLabel: {
    color: colors.neutral[500],
  },
});
