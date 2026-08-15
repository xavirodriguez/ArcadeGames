import { useCallback } from "react";
import { StyleSheet, Text, Pressable, type PressableProps } from "react-native";
import { hapticSelection } from "../../utils/haptics";

export interface ActionButtonProps {
  label: string;
  onPressIn: () => void;
  onPressOut: () => void;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Reusable action button for mobile controls.
 * Uses Pressable for reliable onPressIn/onPressOut on Android.
 * No ECS knowledge.
 */
export function ActionButton({
  label,
  onPressIn,
  onPressOut,
  size = 56,
  color = "rgba(255,255,255,0.15)",
  accessibilityLabel,
  accessibilityHint,
}: ActionButtonProps) {
  const handlePressIn = useCallback<NonNullable<PressableProps["onPressIn"]>>(
    () => {
      hapticSelection();
      onPressIn();
    },
    [onPressIn]
  );
  const handlePressOut = useCallback<NonNullable<PressableProps["onPressOut"]>>(
    () => onPressOut(),
    [onPressOut]
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  pressed: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  label: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
