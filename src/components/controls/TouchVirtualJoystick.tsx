import React, { useRef } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { TouchInputState, applyDeadzone2D } from "@tiny-aster/core";
import { colors } from "@/theme/colors";
import { hapticImpactLight } from "@/utils/haptics";

export interface TouchVirtualJoystickProps {
  /** Reference to mutable TouchInputState instance. */
  touchState?: TouchInputState;
  /** Axis to write to: "move" (moveX, moveY) or "aim" (aimX, aimY). Default: "move". */
  axisTarget?: "move" | "aim";
  /** Size / radius of the base ring (default: 70 on phone, 90 on tablet). */
  size?: number;
  /** Size / radius of the knob (default: 28 on phone, 36 on tablet). */
  knobSize?: number;
  /** Whether the joystick base floats to contact position or stays anchored (default: true). */
  floating?: boolean;
  /** Deadzone threshold in [0, 1] (default: 0.1). */
  deadZone?: number;
  /** Primary accent color. Defaults to colors.system (#00E8D2). */
  color?: string;
  /** Active accent color. Defaults to colors.cyan (#00D9FF). */
  activeColor?: string;
  /** Base opacity. Defaults to 0.6. */
  opacity?: number;
  /** Style override for touch zone container. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional movement callback. */
  onMove?: (x: number, y: number) => void;
  /** Optional release callback. */
  onRelease?: () => void;
  /** Accessibility label. */
  accessibilityLabel?: string;
}

export function TouchVirtualJoystick({
  touchState,
  axisTarget = "move",
  size,
  knobSize,
  floating = true,
  deadZone = 0.1,
  color = colors.system,
  activeColor = colors.cyan,
  opacity = 0.6,
  containerStyle,
  onMove,
  onRelease,
  accessibilityLabel = "Virtual Joystick",
}: TouchVirtualJoystickProps) {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;

  const BASE_RADIUS = size ?? (isTablet ? 90 : 70);
  const KNOB_RADIUS = knobSize ?? (isTablet ? 36 : 28);
  const MAX_OFFSET = BASE_RADIUS - KNOB_RADIUS;

  const idleOpacity = floating ? 0 : opacity * 0.5;
  const isVisible = useSharedValue(!floating);
  const visualOpacity = useSharedValue(idleOpacity);
  const basePos = useSharedValue({ x: 0, y: 0 });
  const knobX = useSharedValue(0);
  const knobY = useSharedValue(0);

  // Throttled haptics for direction changes
  const lastHapticTimeRef = useRef<number>(0);
  const lastDirectionRef = useRef<string>("none");

  const triggerDirectionHaptic = (normX: number, normY: number) => {
    if (normX === 0 && normY === 0) {
      lastDirectionRef.current = "none";
      return;
    }

    const angle = Math.atan2(normY, normX);
    // 4 cardinal directions: R, D, L, U
    let dir = "none";
    if (angle >= -Math.PI / 4 && angle < Math.PI / 4) dir = "right";
    else if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) dir = "down";
    else if (angle >= (-3 * Math.PI) / 4 && angle < -Math.PI / 4) dir = "up";
    else dir = "left";

    const now = Date.now();
    if (dir !== lastDirectionRef.current && now - lastHapticTimeRef.current >= 100) {
      lastDirectionRef.current = dir;
      lastHapticTimeRef.current = now;
      hapticImpactLight();
    }
  };

  const updateState = (normX: number, normY: number) => {
    if (touchState) {
      if (axisTarget === "aim") {
        touchState.setAimAxis(normX, normY);
      } else {
        touchState.setMoveAxis(normX, normY);
      }
    }
    if (onMove) {
      onMove(normX, normY);
    }
    triggerDirectionHaptic(normX, normY);
  };

  const releaseState = () => {
    if (touchState) {
      if (axisTarget === "aim") {
        touchState.setAimAxis(0, 0);
      } else {
        touchState.setMoveAxis(0, 0);
      }
    }
    if (onRelease) {
      onRelease();
    }
    triggerDirectionHaptic(0, 0);
  };

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const { width: layoutW, height: layoutH } = e.nativeEvent.layout;
    if (!floating) {
      basePos.value = { x: layoutW / 2, y: layoutH / 2 };
      isVisible.value = true;
      visualOpacity.value = idleOpacity;
    }
  };

  // Mono-dedo: Gesture.Pan ignores additional pointers by locking on the first touch
  const pan = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onStart((e) => {
      'worklet';
      isVisible.value = true;
      visualOpacity.value = withTiming(opacity, { duration: 120 });
      if (floating) {
        basePos.value = { x: e.x, y: e.y };
      }
      knobX.value = 0;
      knobY.value = 0;

      updateState(0, 0);
    })
    .onUpdate((e) => {
      'worklet';
      const dx = e.x - basePos.value.x;
      const dy = e.y - basePos.value.y;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const clampDist = Math.min(dist, MAX_OFFSET);
      const angle = Math.atan2(dy, dx);

      knobX.value = clampDist * Math.cos(angle);
      knobY.value = clampDist * Math.sin(angle);

      const rawNormX = clampDist === 0 ? 0 : (clampDist / MAX_OFFSET) * Math.cos(angle);
      const rawNormY = clampDist === 0 ? 0 : (clampDist / MAX_OFFSET) * Math.sin(angle);

      const deadzoned = applyDeadzone2D(rawNormX, rawNormY, deadZone);
      updateState(deadzoned.x, deadzoned.y);
    })
    .onFinalize(() => {
      'worklet';
      knobX.value = withSpring(0, { damping: 20, stiffness: 300 });
      knobY.value = withSpring(0, { damping: 20, stiffness: 300 });
      visualOpacity.value = withTiming(idleOpacity, { duration: 200 }, () => {
        'worklet';
        if (floating) {
          isVisible.value = false;
        }
      });

      releaseState();
    });

  const baseStyle = useAnimatedStyle(() => ({
    opacity: visualOpacity.value,
    transform: [
      { translateX: basePos.value.x - BASE_RADIUS },
      { translateY: basePos.value.y - BASE_RADIUS },
    ],
    display: isVisible.value ? "flex" : "none",
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: knobX.value },
      { translateY: knobY.value },
    ],
    backgroundColor: activeColor,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        onLayout={handleContainerLayout}
        style={[styles.container, containerStyle]}
      >
        <Animated.View
          style={[
            styles.base,
            baseStyle,
            {
              width: BASE_RADIUS * 2,
              height: BASE_RADIUS * 2,
              borderRadius: BASE_RADIUS,
              borderColor: color,
              backgroundColor: "rgba(255,255,255,0.06)",
            },
          ]}
        >
          <Animated.View
            style={[
              styles.knob,
              knobStyle,
              {
                width: KNOB_RADIUS * 2,
                height: KNOB_RADIUS * 2,
                borderRadius: KNOB_RADIUS,
                borderWidth: 1.5,
                borderColor: colors.white,
              },
            ]}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  base: {
    position: "absolute",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  knob: {
    position: "absolute",
  },
});
