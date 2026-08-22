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
  disabled?: boolean;
}

/**
 * Reusable action button for mobile controls.
 * Uses Pressable for reliable onPressIn/onPressOut on Android & Web.
 * Minimum size enforced to at least 48px touch target.
 */
export function ActionButton({
  label,
  onPressIn,
  onPressOut,
  size = 56,
  color = "rgba(255,255,255,0.15)",
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: ActionButtonProps) {
  const handlePressIn = useCallback<NonNullable<PressableProps["onPressIn"]>>(
    () => {
      if (disabled) return;
      hapticSelection();
      onPressIn();
    },
    [disabled, onPressIn]
  );
  const handlePressOut = useCallback<NonNullable<PressableProps["onPressOut"]>>(
    () => {
      if (disabled) return;
      onPressOut();
    },
    [disabled, onPressOut]
  );

  const finalSize = Math.max(48, size);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [
        styles.button,
        { width: finalSize, height: finalSize, borderRadius: finalSize / 2, backgroundColor: color },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, disabled && styles.disabledLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    minWidth: 48,
    minHeight: 48,
  },
  pressed: {
    backgroundColor: "rgba(255,255,255,0.45)",
    borderColor: "#FFFFFF",
    transform: [{ scale: 0.92 }],
  },
  disabled: {
    opacity: 0.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  label: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  disabledLabel: {
    color: "rgba(255,255,255,0.4)",
  },
});
