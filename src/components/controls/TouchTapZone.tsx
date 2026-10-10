import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { TouchInputState } from "@tiny-aster/core";
import Animated from "react-native-reanimated";
import { useGestureHandlerRootViewCheck } from "./useGestureHandlerRootViewCheck";

export interface TouchTapZoneProps {
  /** TouchInputState reference. */
  touchState?: TouchInputState;
  /** Optional tap callback with coordinates. */
  onTap?: (x: number, y: number) => void;
  /** Optional long press callback. */
  onLongPress?: (x: number, y: number) => void;
  /** LongPress min duration in ms (default: 500). Note: maxDuration is not used. */
  longPressMinDuration?: number;
  /** LongPress max allowed distance in pixels before failing (default: 20). */
  longPressMaxDistance?: number;
  /** Container style. */
  style?: StyleProp<ViewStyle>;
  /** Children elements. */
  children?: React.ReactNode;
}

export function TouchTapZone({
  touchState,
  onTap,
  onLongPress,
  longPressMinDuration = 500,
  longPressMaxDistance = 20,
  style,
  children,
}: TouchTapZoneProps) {
  useGestureHandlerRootViewCheck();
  const handleTap = (x: number, y: number) => {
    if (touchState) {
      touchState.pushTap({ x, y, timestamp: Date.now() });
    }
    if (onTap) {
      onTap(x, y);
    }
  };

  const handleLongPress = (x: number, y: number) => {
    if (onLongPress) {
      onLongPress(x, y);
    }
  };

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      'worklet';
      handleTap(e.x, e.y);
    });

  if (onLongPress) {
    const longPressGesture = Gesture.LongPress()
      .minDuration(longPressMinDuration)
      .maxDistance(longPressMaxDistance)
      .runOnJS(true)
      .onStart((e) => {
        'worklet';
        handleLongPress(e.x, e.y);
      });

    const combinedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

    return (
      <GestureDetector gesture={combinedGesture}>
        <Animated.View style={[styles.container, style]}>{children}</Animated.View>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[styles.container, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
