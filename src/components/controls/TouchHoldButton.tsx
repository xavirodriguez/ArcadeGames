import React, { useRef } from "react";
import { Text, ViewStyle, StyleProp } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { TouchInputState } from "@tiny-aster/core";
import { colors } from "../../theme/colors";
import { hapticImpactLight } from "../../utils/haptics";
import { useTouchInputState } from "./TouchInputProvider";
import { touchControlStyles } from "./TouchControlStyles";

export interface TouchHoldButtonProps {
  /** Name/id key for the hold button in TouchInputState.buttons */
  buttonName: string;
  /** Button text / icon label */
  label?: string;
  /** Size (diameter) of button in pixels */
  size?: number;
  /** Idle background color */
  color?: string;
  /** Pressed background color */
  pressedColor?: string;
  /** Idle border color */
  borderColor?: string;
  /** Text color */
  textColor?: string;
  /** TouchInputState reference */
  touchState?: TouchInputState;
  /** Custom press-in handler */
  onPressIn?: () => void;
  /** Custom press-out handler */
  onPressOut?: () => void;
  /** Style override */
  style?: StyleProp<ViewStyle>;
  /** Enable haptic feedback on hold begin */
  enableHaptics?: boolean;
}

export const TouchHoldButton: React.FC<TouchHoldButtonProps> = ({
  buttonName,
  label,
  size = 72,
  color = "rgba(0, 232, 210, 0.15)",
  pressedColor = "rgba(0, 232, 210, 0.55)",
  borderColor = colors.system,
  textColor = colors.white,
  touchState: propTouchState,
  onPressIn,
  onPressOut,
  style,
  enableHaptics = true,
}) => {
  const contextTouchState = useTouchInputState();
  const touchState = propTouchState || contextTouchState;

  const isHeld = useSharedValue(false);
  const lastHapticTimeRef = useRef<number>(0);

  const handleBeginJS = () => {
    if (touchState) {
      touchState.setButton(buttonName, true);
    }
    if (enableHaptics) {
      const now = Date.now();
      if (now - lastHapticTimeRef.current >= 100) {
        lastHapticTimeRef.current = now;
        hapticImpactLight();
      }
    }
    if (onPressIn) {
      onPressIn();
    }
  };

  const handleFinalizeJS = () => {
    if (touchState) {
      touchState.setButton(buttonName, false);
    }
    if (onPressOut) {
      onPressOut();
    }
  };

  const longPress = Gesture.LongPress()
    .minDuration(0)
    .maxDistance(100)
    .onBegin(() => {
      'worklet';
      isHeld.value = true;
      runOnJS(handleBeginJS)();
    })
    .onFinalize(() => {
      'worklet';
      isHeld.value = false;
      runOnJS(handleFinalizeJS)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: isHeld.value ? pressedColor : color,
    transform: [{ scale: withSpring(isHeld.value ? 0.94 : 1.0, { damping: 15, stiffness: 300 }) }],
  }));

  return (
    <GestureDetector gesture={longPress}>
      <Animated.View
        style={[
          touchControlStyles.buttonBase,
          animatedStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor,
          },
          style,
        ]}
      >
        {label && <Text style={[touchControlStyles.buttonText, { color: textColor }]}>{label}</Text>}
      </Animated.View>
    </GestureDetector>
  );
};
