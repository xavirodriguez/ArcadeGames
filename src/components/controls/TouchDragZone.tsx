import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { TouchInputState } from "@tiny-aster/core";
import { useTouchInputState } from "./TouchInputProvider";

export interface TouchDragZoneProps {
  /** Touch mode: absolute screen coordinates or relative offset delta */
  mode?: "absolute" | "relative";
  /** TouchInputState reference */
  touchState?: TouchInputState;
  /** Active horizontal offset range e.g. [-10, 10] for horizontal platformer drag */
  activeOffsetX?: [number, number];
  /** Fail vertical offset range e.g. [-10, 10] to allow vertical gestures to cancel */
  failOffsetY?: [number, number];
  /** Target position setter: "paddlePos" | "pointerPos" | "move" */
  targetProperty?: "paddlePos" | "pointerPos" | "move";
  /** Custom drag callback */
  onDrag?: (x: number, y: number) => void;
  /** Custom release callback */
  onRelease?: () => void;
  /** Container style override */
  style?: StyleProp<ViewStyle>;
  /** Children nodes */
  children?: React.ReactNode;
}

export const TouchDragZone: React.FC<TouchDragZoneProps> = ({
  mode = "absolute",
  touchState: propTouchState,
  activeOffsetX,
  failOffsetY,
  targetProperty = "paddlePos",
  onDrag,
  onRelease,
  style,
  children,
}) => {
  const contextTouchState = useTouchInputState();
  const touchState = propTouchState || contextTouchState;

  const handleDragJS = (x: number, y: number) => {
    if (touchState) {
      if (targetProperty === "paddlePos") {
        touchState.setPaddlePos(x, y);
      } else if (targetProperty === "pointerPos") {
        touchState.setPointerPos(x, y);
      } else if (targetProperty === "move") {
        touchState.setMove(x, y);
      }
    }
    if (onDrag) {
      onDrag(x, y);
    }
  };

  const handleReleaseJS = () => {
    if (onRelease) {
      onRelease();
    }
  };

  let pan = Gesture.Pan().minDistance(0);

  if (activeOffsetX) {
    pan = pan.activeOffsetX(activeOffsetX);
  }
  if (failOffsetY) {
    pan = pan.failOffsetY(failOffsetY);
  }

  pan = pan
    .onBegin((e) => {
      'worklet';
      const targetX = mode === "absolute" ? e.absoluteX : e.translationX;
      const targetY = mode === "absolute" ? e.absoluteY : e.translationY;
      runOnJS(handleDragJS)(targetX, targetY);
    })
    .onUpdate((e) => {
      'worklet';
      const targetX = mode === "absolute" ? e.absoluteX : e.translationX;
      const targetY = mode === "absolute" ? e.absoluteY : e.translationY;
      runOnJS(handleDragJS)(targetX, targetY);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(handleReleaseJS)();
    });

  return (
    <GestureDetector gesture={pan}>
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
