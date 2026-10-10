import React, { useState } from "react";
import { StyleSheet, View, LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchInputState } from "@tiny-aster/core";
import { useGestureHandlerRootViewCheck } from "./useGestureHandlerRootViewCheck";

export interface TouchTapZoneProps {
  inputState?: TouchInputState;
  onTap?: (x: number, y: number) => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function TouchTapZone({
  inputState,
  onTap,
  style,
  children,
}: TouchTapZoneProps) {
  useGestureHandlerRootViewCheck("TouchTapZone");
  const insets = useSafeAreaInsets();
  const [, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      const tapX = e.x;
      const tapY = e.y;

      if (inputState) {
        inputState.pushTap(tapX, tapY, Date.now());
      }
      if (onTap) {
        onTap(tapX, tapY);
      }
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
          style,
        ]}
        onLayout={handleLayout}
      >
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
