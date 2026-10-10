import React, { useState } from "react";
import { StyleSheet, Text, View, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchInputState } from "@tiny-aster/core";
import { colors } from "@/src/theme/colors";
import { hapticImpactMedium } from "@/src/utils/haptics";
import { useGestureHandlerRootViewCheck } from "./useGestureHandlerRootViewCheck";

export interface TouchActionButtonProps {
  name?: string;
  label?: string;
  inputState?: TouchInputState;
  onPress?: () => void;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export function TouchActionButton({
  name = "action",
  label = "A",
  inputState,
  onPress,
  size = 64,
  color = colors.system,
  style,
  labelStyle,
  accessibilityLabel,
}: TouchActionButtonProps) {
  useGestureHandlerRootViewCheck("TouchActionButton");
  const insets = useSafeAreaInsets();
  const [isPressed, setIsPressed] = useState(false);

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(5000)
    .onBegin(() => {
      setIsPressed(true);
      if (inputState) {
        inputState.setButton(name, true);
        inputState.pushTap(0, 0, Date.now());
      }
      hapticImpactMedium();
      if (onPress) {
        onPress();
      }
    })
    .onFinalize(() => {
      setIsPressed(false);
      if (inputState) {
        inputState.setButton(name, false);
      }
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
          },
          isPressed && { backgroundColor: color, opacity: 0.9 },
          { marginBottom: Math.max(insets.bottom, 4), marginRight: Math.max(insets.right, 4) },
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label || name}
      >
        <Text style={[styles.label, { color: isPressed ? colors.backgroundDark : color }, labelStyle]}>
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
    fontSize: 18,
    fontWeight: "bold",
  },
});
