import React, { useRef } from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchInputState, applyDeadzone, snapDirection } from "@tiny-aster/core";
import { colors } from "@/src/theme/colors";
import { hapticImpactLight } from "@/src/utils/haptics";
import { useGestureHandlerRootViewCheck } from "./useGestureHandlerRootViewCheck";

export interface TouchVirtualJoystickProps {
  /** Reference to the mutable TouchInputState instance. */
  inputState?: TouchInputState;
  /** Optional custom update callback for joystick state updates. */
  onUpdate?: (moveX: number, moveY: number) => void;
  /** Outer base radius in pixels. Default: 60. */
  radius?: number;
  /** Inner thumb radius in pixels. Default: 25. */
  thumbRadius?: number;
  /** Deadzone threshold [0.0 - 1.0]. Default: 0.15. */
  deadzone?: number;
  /** Whether joystick base re-centers to touch position. Default: true (floating). */
  floating?: boolean;
  /** Snapping behavior (none, 4, or 8 directions). Default: "none". */
  snap?: "none" | 4 | 8;
  /** Container style overrides. */
  style?: StyleProp<ViewStyle>;
  /** Accessibility label. */
  accessibilityLabel?: string;
}

/**
 * Zero-setState TouchVirtualJoystick component using Reanimated SharedValues
 * for 60FPS UI updates without triggering React component re-renders.
 */
export function TouchVirtualJoystick({
  inputState,
  onUpdate,
  radius = 60,
  thumbRadius = 25,
  deadzone = 0.15,
  floating = true,
  snap = "none",
  style,
  accessibilityLabel = "Virtual Joystick",
}: TouchVirtualJoystickProps) {
  useGestureHandlerRootViewCheck("TouchVirtualJoystick");
  const insets = useSafeAreaInsets();

  // Reanimated shared values for high-performance visual updates without React re-renders
  const thumbX = useSharedValue(0);
  const thumbY = useSharedValue(0);
  const baseX = useSharedValue(0);
  const baseY = useSharedValue(0);
  const activeVal = useSharedValue(0);

  const lastDirectionRef = useRef<string>("0,0");
  const lastHapticTimeRef = useRef<number>(0);

  const updateInput = (rawX: number, rawY: number) => {
    const deadzoneProcessed = applyDeadzone(rawX, rawY, deadzone);
    let finalX = deadzoneProcessed.x;
    let finalY = deadzoneProcessed.y;

    if (snap !== "none") {
      const snapped = snapDirection(finalX, finalY, snap);
      finalX = snapped.x;
      finalY = snapped.y;
    }

    if (inputState) {
      inputState.moveX = finalX;
      inputState.moveY = finalY;
    }
    if (onUpdate) {
      onUpdate(finalX, finalY);
    }

    const currentDirectionKey = `${Math.sign(Math.round(finalX * 2))},${Math.sign(Math.round(finalY * 2))}`;
    if (currentDirectionKey !== lastDirectionRef.current) {
      const now = Date.now();
      if (now - lastHapticTimeRef.current >= 100 && currentDirectionKey !== "0,0") {
        hapticImpactLight();
        lastHapticTimeRef.current = now;
      }
      lastDirectionRef.current = currentDirectionKey;
    }
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => {
      activeVal.value = 1;
      if (floating) {
        baseX.value = e.x - radius;
        baseY.value = e.y - radius;
      }
      thumbX.value = 0;
      thumbY.value = 0;
    })
    .onUpdate((e) => {
      const translationX = e.translationX;
      const translationY = e.translationY;

      const distance = Math.sqrt(translationX * translationX + translationY * translationY);
      const maxDistance = radius;

      let clampedX = translationX;
      let clampedY = translationY;

      if (distance > maxDistance && distance > 0) {
        clampedX = (translationX / distance) * maxDistance;
        clampedY = (translationY / distance) * maxDistance;
      }

      thumbX.value = clampedX;
      thumbY.value = clampedY;

      const normX = clampedX / maxDistance;
      const normY = clampedY / maxDistance;

      updateInput(normX, normY);
    })
    .onFinalize(() => {
      activeVal.value = 0;
      thumbX.value = 0;
      thumbY.value = 0;
      baseX.value = 0;
      baseY.value = 0;
      updateInput(0, 0);
    });

  const animatedBaseStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: floating ? baseX.value : 0 },
      { translateY: floating ? baseY.value : 0 },
    ],
    borderColor: activeVal.value > 0 ? colors.system : colors.border,
    backgroundColor: activeVal.value > 0 ? "rgba(0, 232, 210, 0.15)" : colors.panel,
  }));

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: thumbX.value },
      { translateY: thumbY.value },
    ],
    opacity: activeVal.value > 0 ? 1 : 0.7,
    backgroundColor: activeVal.value > 0 ? colors.primary : colors.system,
  }));

  const size = radius * 2;

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={[
          styles.container,
          { width: size, height: size },
          { paddingLeft: Math.max(insets.left, 8), paddingBottom: Math.max(insets.bottom, 8) },
          style,
        ]}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
      >
        <Animated.View
          style={[
            styles.base,
            { width: size, height: size, borderRadius: radius },
            animatedBaseStyle,
          ]}
        >
          <Animated.View
            style={[
              styles.thumb,
              {
                width: thumbRadius * 2,
                height: thumbRadius * 2,
                borderRadius: thumbRadius,
              },
              animatedThumbStyle,
            ]}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  base: {
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  thumb: {},
});
