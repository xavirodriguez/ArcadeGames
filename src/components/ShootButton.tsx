import { StyleSheet, Pressable, Text } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import { hapticSelection } from "../utils/haptics";

export interface ShootButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

/**
 * Pure UI component for shooting.
 * Circular button, min 84x84px, semi-transparent red tint.
 * Uses Pressable for visual feedback and touch handling.
 */
export function ShootButton({
  onPressIn,
  onPressOut,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: ShootButtonProps) {
  const { t } = useTranslation();

  const handlePressIn = () => {
    if (disabled) return;
    hapticSelection();
    onPressIn();
  };

  const label = accessibilityLabel || t?.accessibility?.shoot_button_label || "Fire weapon";
  const hint = accessibilityHint || t?.accessibility?.shoot_button_hint || "Fires primary weapon";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPressIn={handlePressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        {
          backgroundColor: disabled
            ? "rgba(100, 100, 100, 0.2)"
            : pressed
            ? "rgba(255, 80, 80, 0.7)"
            : "rgba(255, 80, 80, 0.4)",
          transform: [{ scale: pressed && !disabled ? 0.94 : 1 }],
        },
      ]}
    >
      <Text style={[styles.label, disabled && styles.disabledLabel]}>FIRE</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 84,
    height: 84,
    minWidth: 84,
    minHeight: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "rgba(255, 80, 80, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    borderColor: "rgba(150, 150, 150, 0.4)",
  },
  label: {
    color: "#FF8080",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  disabledLabel: {
    color: "rgba(200, 200, 200, 0.5)",
  },
});
