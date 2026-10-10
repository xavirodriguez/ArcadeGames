import React, { useState } from "react";
import { StyleSheet, Text, View, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchInputState } from "@tiny-aster/core";
import { colors } from "@/src/theme/colors";
import { hapticImpactLight } from "@/src/utils/haptics";
import { useGestureHandlerRootViewCheck } from "./useGestureHandlerRootViewCheck";

export interface TouchHoldButtonProps {
  name?: string;
  label?: string;
  inputState?: TouchInputState;
  onHoldChange?: (active: boolean) => void;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export function TouchHoldButton({
  name = "hold",
  label = "HOLD",
  inputState,
  onHoldChange,
  size = 64,
  color = colors.success,
  style,
  labelStyle,
  accessibilityLabel,
}: TouchHoldButtonProps) {
  useGestureHandlerRootViewCheck("TouchHoldButton");
  const insets = useSafeAreaInsets();
  const [isHeld, setIsHeld] = useState(false);

  const longPressGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin(() => {
      setIsHeld(true);
      if (inputState) {
        inputState.setButton(name, true);
      }
      if (onHoldChange) {
        onHoldChange(true);
      }
      hapticImpactLight();
    })
    .onFinalize(() => {
      setIsHeld(false);
      if (inputState) {
        inputState.setButton(name, false);
      }
      if (onHoldChange) {
        onHoldChange(false);
      }
    });

  return (
    <GestureDetector gesture={longPressGesture}>
      <View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
          },
          isHeld && { backgroundColor: color, opacity: 0.9 },
          { marginBottom: Math.max(insets.bottom, 4), marginRight: Math.max(insets.right, 4) },
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label || name}
      >
        <Text style={[styles.label, { color: isHeld ? colors.backgroundDark : color }, labelStyle]}>
          {label}
        </Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.panel,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
