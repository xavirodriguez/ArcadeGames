import React, { useState } from "react";
import { StyleSheet, View, LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchInputState, mapTouchToPaddlePosition, clamp } from "@tiny-aster/core";
import { colors } from "@/src/theme/colors";
import { useGestureHandlerRootViewCheck } from "./useGestureHandlerRootViewCheck";

export interface TouchDragZoneProps {
  inputState?: TouchInputState;
  onPaddleMove?: (position: number) => void;
  onDragUpdate?: (x: number, y: number) => void;
  mode?: "absolute" | "relative";
  paddleWidth?: number;
  activeOffsetX?: [number, number];
  failOffsetY?: [number, number];
  style?: StyleProp<ViewStyle>;
  showTrack?: boolean;
}

export function TouchDragZone({
  inputState,
  onPaddleMove,
  onDragUpdate,
  mode = "absolute",
  paddleWidth = 80,
  activeOffsetX,
  failOffsetY,
  style,
  showTrack = false,
}: TouchDragZoneProps) {
  useGestureHandlerRootViewCheck("TouchDragZone");
  const insets = useSafeAreaInsets();

  const [containerWidth, setContainerWidth] = useState<number>(300);
  const [containerHeight, setContainerHeight] = useState<number>(100);
  const startXRef = React.useRef<number>(0);
  const initialPaddlePosRef = React.useRef<number>(0.5);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0) setContainerWidth(width);
    if (height > 0) setContainerHeight(height);
  };

  const updatePosition = (touchX: number, touchY: number) => {
    const normPaddle = mapTouchToPaddlePosition(touchX, containerWidth, paddleWidth);

    if (inputState) {
      inputState.paddlePosition = normPaddle;
      inputState.pointerX = clamp(touchX, 0, containerWidth);
      inputState.pointerY = clamp(touchY, 0, containerHeight);
    }
    if (onPaddleMove) {
      onPaddleMove(normPaddle);
    }
    if (onDragUpdate) {
      onDragUpdate(touchX, touchY);
    }
  };

  let panGesture = Gesture.Pan().runOnJS(true).minDistance(0);

  if (activeOffsetX) {
    panGesture = panGesture.activeOffsetX(activeOffsetX);
  }
  if (failOffsetY) {
    panGesture = panGesture.failOffsetY(failOffsetY);
  }

  panGesture = panGesture
    .onBegin((e) => {
      startXRef.current = e.x;
      initialPaddlePosRef.current = inputState?.paddlePosition ?? 0.5;
      updatePosition(e.x, e.y);
    })
    .onUpdate((e) => {
      if (mode === "absolute") {
        updatePosition(e.x, e.y);
      } else {
        const deltaX = e.translationX;
        const deltaRatio = containerWidth > 0 ? deltaX / containerWidth : 0;
        const newPos = clamp(initialPaddlePosRef.current + deltaRatio, 0, 1);

        if (inputState) {
          inputState.paddlePosition = newPos;
        }
        if (onPaddleMove) {
          onPaddleMove(newPos);
        }
        if (onDragUpdate) {
          onDragUpdate(e.x, e.y);
        }
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={[
          styles.container,
          {
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
          style,
        ]}
        onLayout={handleLayout}
      >
        {showTrack && <View style={styles.trackBar} />}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  trackBar: {
    width: "90%",
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
});
