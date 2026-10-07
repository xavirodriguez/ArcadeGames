import React, { useRef } from "react";
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { TouchInputState } from "@tiny-aster/core";
import { colors } from "../../theme/colors";
import { hapticImpactLight } from "../../utils/haptics";
import { useTouchInputState } from "./TouchInputProvider";

export interface TouchVirtualJoystickProps {
  /** TouchInputState instance (or pulled from TouchInputProvider context if omitted) */
  touchState?: TouchInputState;
  /** Radius of joystick base */
  size?: number;
  /** Radius of inner knob */
  knobSize?: number;
  /** Whether joystick base floats to initial touch position */
  floating?: boolean;
  /** Normalized deadzone threshold [0-1] */
  deadZone?: number;
  /** Base border/ring color */
  color?: string;
  /** Active knob/fill color */
  activeColor?: string;
  /** Container style overrides */
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional movement callback */
  onMove?: (x: number, y: number) => void;
  /** Optional release callback */
  onRelease?: () => void;
  /** Enable directional change haptics */
  enableHaptics?: boolean;
}

export const TouchVirtualJoystick: React.FC<TouchVirtualJoystickProps> = ({
  touchState: propTouchState,
  size,
  knobSize,
  floating = true,
  deadZone = 0.1,
  color = colors.border,
  activeColor = colors.system,
  containerStyle,
  onMove,
  onRelease,
  enableHaptics = true,
}) => {
  const contextTouchState = useTouchInputState();
  const touchState = propTouchState || contextTouchState;

  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;

  const BASE_RADIUS = size ?? (isTablet ? 80 : 65);
  const KNOB_RADIUS = knobSize ?? (isTablet ? 32 : 26);
  const MAX_OFFSET = BASE_RADIUS - KNOB_RADIUS;

  const idleOpacity = floating ? 0 : 0.5;
  const isVisible = useSharedValue(!floating);
  const visualOpacity = useSharedValue(idleOpacity);
  const basePos = useSharedValue({ x: 0, y: 0 });
  const knobX = useSharedValue(0);
  const knobY = useSharedValue(0);

  const lastHapticTimeRef = useRef<number>(0);
  const lastDirectionSectorRef = useRef<number>(-1);

  const triggerHaptic = (sector: number) => {
    if (!enableHaptics) return;
    const now = Date.now();
    if (sector !== lastDirectionSectorRef.current && now - lastHapticTimeRef.current >= 100) {
      lastHapticTimeRef.current = now;
      lastDirectionSectorRef.current = sector;
      hapticImpactLight();
    }
  };

  const handleMoveJS = (normX: number, normY: number, sector: number) => {
    if (touchState) {
      touchState.setMove(normX, normY);
    }
    if (onMove) {
      onMove(normX, normY);
    }
    if (enableHaptics && sector >= 0) {
      triggerHaptic(sector);
    }
  };

  const handleReleaseJS = () => {
    lastDirectionSectorRef.current = -1;
    if (touchState) {
      touchState.setMove(0, 0);
    }
    if (onRelease) {
      onRelease();
    }
  };

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    if (!floating) {
      const { width: layoutW, height: layoutH } = e.nativeEvent.layout;
      basePos.value = { x: layoutW / 2, y: layoutH / 2 };
      isVisible.value = true;
      visualOpacity.value = idleOpacity;
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .maxPointers(1)
    .onStart((e) => {
      'worklet';
      isVisible.value = true;
      visualOpacity.value = withTiming(0.85, { duration: 150 });
      if (floating) {
        basePos.value = { x: e.x, y: e.y };
      }
      knobX.value = 0;
      knobY.value = 0;

      runOnJS(handleMoveJS)(0, 0, -1);
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

      const rawNorm = clampDist === 0 ? 0 : clampDist / MAX_OFFSET;
      let norm = 0;
      if (rawNorm > deadZone) {
        norm = (rawNorm - deadZone) / (1 - deadZone);
      }

      const normX = norm === 0 ? 0 : norm * Math.cos(angle);
      const normY = norm === 0 ? 0 : norm * Math.sin(angle);

      // Compute 8-way sector for direction-change haptics
      let sector = -1;
      if (norm > 0.3) {
        const step = Math.PI / 4;
        const normAngle = angle < -step / 2 ? angle + 2 * Math.PI : angle;
        sector = Math.floor((normAngle + step / 2) / step) % 8;
      }

      runOnJS(handleMoveJS)(normX, normY, sector);
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

      runOnJS(handleReleaseJS)();
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
  }));

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={handleContainerLayout}
        style={[styles.container, containerStyle]}
        pointerEvents="box-none"
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
              backgroundColor: "rgba(0, 0, 0, 0.2)",
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
                backgroundColor: activeColor,
                borderColor: colors.white,
              },
            ]}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  base: {
    position: "absolute",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  knob: {
    position: "absolute",
    borderWidth: 1.5,
  },
});
