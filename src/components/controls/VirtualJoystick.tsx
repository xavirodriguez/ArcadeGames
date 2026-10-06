import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { World, Component, VirtualJoystickProvider } from "@tiny-aster/core";
import { useTranslation } from "../../hooks/useTranslation";

export type JoystickType = "movement" | "rotation";

export interface VirtualJoystickComponent extends Component {
  type: "VirtualJoystick";
  active: boolean;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
  radius: number;
  joystickType: JoystickType;
  horizontalAxis: string;
  verticalAxis: string;
}

export interface VirtualJoystickProps {
  /** Unique ID for identifying the ECS entity. */
  joystickId?: string;
  /** Semantic purpose of the joystick. */
  type?: JoystickType;
  /** Radius of the joystick base (default: responsive 70/90). */
  size?: number;
  /** Radius of the knob (default: responsive 28/36). */
  knobSize?: number;
  /** Whether the joystick base floats to touch contact location or stays anchored (default: true). */
  floating?: boolean;
  /** Base color of the joystick elements. */
  color?: string;
  /** Color when active. */
  activeColor?: string;
  /** Base opacity of the joystick. */
  opacity?: number;
  /** Whether to show the background ring. */
  showBackgroundRing?: boolean;
  /** The ECS World to integrate with. */
  world?: World;
  /** Optional style for the touchable container. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional accessibility label override. */
  accessibilityLabel?: string;
  /** Optional accessibility hint override. */
  accessibilityHint?: string;
  /** Optional callback for movement. */
  onMove?: (x: number, y: number) => void;
  /** Optional callback for release. */
  onRelease?: () => void;
  /** Dead zone radius threshold (0-1 normalized, default: 0). */
  deadZone?: number;
  /**
   * Sensitivity scale factor for output values (default: 1.0).
   * Note: Avoid using sensitivity < 1.0 to smooth steering, as it clips the maximum output range.
   * Keep sensitivity = 1.0 and apply non-linear curves (e.g., x * |x|) in onMove instead.
   */
  sensitivity?: number;
  /** Optional VirtualJoystickProvider from @tiny-aster/core to automatically update. */
  provider?: VirtualJoystickProvider<string>;
  /** Which stick of the provider to write to (default: "left" for movement, "right" for rotation). */
  providerStick?: "left" | "right";
}

/**
 * Enhanced Virtual Joystick.
 *
 * Features:
 * - Floating Dynamic behavior (appears on touch) or Anchored Fixed position (`floating={false}`).
 * - Responsive sizing for phones vs tablets.
 * - Reanimated 3 for smooth, decoupled knob movement.
 * - Direct ECS integration via world.getMutableComponent.
 */
export function VirtualJoystick({
  joystickId = "joystick",
  type = "movement",
  size,
  knobSize,
  floating = true,
  color = "rgba(255,255,255,0.3)",
  activeColor = "rgba(255,255,255,0.7)",
  opacity = 0.6,
  showBackgroundRing = true,
  world,
  containerStyle,
  accessibilityLabel,
  accessibilityHint,
  onMove,
  onRelease,
  deadZone = 0,
  sensitivity = 1.0,
  provider,
  providerStick = type === "rotation" ? "right" : "left",
}: VirtualJoystickProps) {
  const { t } = useTranslation();
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

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const { width: layoutW, height: layoutH } = e.nativeEvent.layout;
    if (!floating) {
      basePos.value = { x: layoutW / 2, y: layoutH / 2 };
      isVisible.value = true;
      visualOpacity.value = idleOpacity;
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      'worklet';
      isVisible.value = true;
      visualOpacity.value = withTiming(opacity, { duration: 150 });
      if (floating) {
        basePos.value = { x: e.x, y: e.y };
      }
      knobX.value = 0;
      knobY.value = 0;

      if (onMove) {
        runOnJS(onMove)(0, 0);
      }
    })
    .onUpdate((e) => {
      'worklet';
      const dx = e.x - basePos.value.x;
      const dy = e.y - basePos.value.y;

      // Clamp visual knob to circle
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamp = Math.min(dist, MAX_OFFSET);
      const angle = Math.atan2(dy, dx);

      knobX.value = clamp * Math.cos(angle);
      knobY.value = clamp * Math.sin(angle);

      if (onMove) {
        const rawNorm = clamp === 0 ? 0 : clamp / MAX_OFFSET;
        let norm = 0;

        if (rawNorm > deadZone) {
          const remapped = (rawNorm - deadZone) / (1 - deadZone);
          norm = Math.min(1.0, remapped * sensitivity);
        }

        const normX = norm === 0 ? 0 : norm * Math.cos(angle);
        const normY = norm === 0 ? 0 : norm * Math.sin(angle);

        if (provider) {
          if (providerStick === "left") {
            provider.setLeftStick(normX, normY);
          } else {
            provider.setRightStick(normX, normY);
          }
        }

        runOnJS(onMove)(normX, normY);
      }
    })
    .onFinalize(() => {
      'worklet';
      knobX.value = withSpring(0, { damping: 20, stiffness: 300 });
      knobY.value = withSpring(0, { damping: 20, stiffness: 300 });
      visualOpacity.value = withTiming(idleOpacity, { duration: 250 }, () => {
        'worklet';
        if (floating) {
          isVisible.value = false;
        }
      });

      if (provider) {
        if (providerStick === "left") {
          provider.setLeftStick(0, 0);
        } else {
          provider.setRightStick(0, 0);
        }
      }

      if (onRelease) {
        runOnJS(onRelease)();
      }
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

  const defaultLabel =
    type === "rotation"
      ? t?.accessibility?.joystick_rotation_label || "Rotation joystick"
      : t?.accessibility?.joystick_movement_label || "Movement joystick";

  const defaultHint =
    type === "rotation"
      ? t?.accessibility?.joystick_rotation_hint || "Drag to aim or rotate"
      : t?.accessibility?.joystick_movement_hint || "Drag to steer or move in direction";

  const label = accessibilityLabel || defaultLabel;
  const hint = accessibilityHint || defaultHint;

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityHint={hint}
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
              borderColor: activeColor,
              backgroundColor: showBackgroundRing ? "rgba(255,255,255,0.08)" : "transparent"
            }
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
                borderColor: "#FFFFFF",
              }
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
