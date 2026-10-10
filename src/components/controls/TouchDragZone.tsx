import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { TouchInputState, mapFingerToPaddle } from "@tiny-aster/core";
import Animated, { useSharedValue } from "react-native-reanimated";
import { useGestureHandlerRootViewCheck } from "./useGestureHandlerRootViewCheck";

export interface TouchDragZoneProps {
  /** TouchInputState reference. */
  touchState?: TouchInputState;
  /** Drag mode: "relative" (offset relative to touch down) or "absolute" (screen touch coords). Default: "relative". */
  mode?: "relative" | "absolute";
  /** Target destination in TouchInputState: "paddle" or "pointer". Default: "paddle". */
  target?: "paddle" | "pointer";
  /** Clamping bounds for coordinates. */
  bounds?: { minX: number; maxX: number; minY?: number; maxY?: number };
  /** Optional callback on drag position update. */
  onDrag?: (x: number, y: number, active: boolean) => void;
  /** Active horizontal gesture offset threshold, e.g. [-10, 10]. */
  activeOffsetX?: [number, number];
  /** Fail vertical gesture offset threshold, e.g. [-10, 10] (to isolate horizontal dragging from vertical jumps). */
  failOffsetY?: [number, number];
  /** Style for drag container. */
  style?: StyleProp<ViewStyle>;
  /** Children elements. */
  children?: React.ReactNode;
}

export function TouchDragZone({
  touchState,
  mode = "relative",
  target = "paddle",
  bounds,
  onDrag,
  activeOffsetX,
  failOffsetY,
  style,
  children,
}: TouchDragZoneProps) {
  useGestureHandlerRootViewCheck();
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const currentX = useSharedValue(0);
  const currentY = useSharedValue(0);

  const updatePosition = (rawX: number, rawY: number, active: boolean) => {
    let finalX = rawX;
    let finalY = rawY;

    if (bounds) {
      const mapped = mapFingerToPaddle(rawX, rawY, bounds);
      finalX = mapped.x;
      finalY = mapped.y;
    }

    if (touchState) {
      if (target === "pointer") {
        touchState.setPointer(finalX, finalY, active);
      } else {
        touchState.setPaddle(finalX, finalY, active);
      }
    }

    if (onDrag) {
      onDrag(finalX, finalY, active);
    }
  };

  let panGesture = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true);

  if (activeOffsetX) {
    panGesture = panGesture.activeOffsetX(activeOffsetX);
  }
  if (failOffsetY) {
    panGesture = panGesture.failOffsetY(failOffsetY);
  }

  panGesture = panGesture
    .onBegin((e) => {
      'worklet';
      if (mode === "relative") {
        startX.value = e.x;
        startY.value = e.y;
        currentX.value = e.x;
        currentY.value = e.y;
      } else {
        currentX.value = e.absoluteX;
        currentY.value = e.absoluteY;
      }
      updatePosition(currentX.value, currentY.value, true);
    })
    .onUpdate((e) => {
      'worklet';
      if (mode === "relative") {
        currentX.value = e.x;
        currentY.value = e.y;
      } else {
        currentX.value = e.absoluteX;
        currentY.value = e.absoluteY;
      }
      updatePosition(currentX.value, currentY.value, true);
    })
    .onFinalize(() => {
      'worklet';
      updatePosition(currentX.value, currentY.value, false);
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
