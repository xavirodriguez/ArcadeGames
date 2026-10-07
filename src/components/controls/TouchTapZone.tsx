import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { TouchInputState } from "@tiny-aster/core";
import { useTouchInputState } from "./TouchInputProvider";

export interface TouchTapZoneProps {
  /** TouchInputState reference */
  touchState?: TouchInputState;
  /** Custom tap handler with screen coordinates */
  onTap?: (x: number, y: number) => void;
  /** Container style override */
  style?: StyleProp<ViewStyle>;
  /** Children nodes */
  children?: React.ReactNode;
}

export const TouchTapZone: React.FC<TouchTapZoneProps> = ({
  touchState: propTouchState,
  onTap,
  style,
  children,
}) => {
  const contextTouchState = useTouchInputState();
  const touchState = propTouchState || contextTouchState;

  const handleTapJS = (x: number, y: number) => {
    if (touchState) {
      touchState.addTap(x, y);
    }
    if (onTap) {
      onTap(x, y);
    }
  };

  const tap = Gesture.Tap()
    .onEnd((e) => {
      'worklet';
      runOnJS(handleTapJS)(e.x, e.y);
    });

  return (
    <GestureDetector gesture={tap}>
      <View style={[styles.container, style]} pointerEvents="box-none">
        {children}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
