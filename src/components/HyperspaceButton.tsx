import { StyleSheet, Pressable, Text } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import { hapticSelection } from "../utils/haptics";

export interface HyperspaceButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

/**
 * Pure UI component for Hyperspace action.
 * Minimum 56x56px touch target with hitSlop padding, semi-transparent cyan tint.
 */
export function HyperspaceButton({
  onPressIn,
  onPressOut,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: HyperspaceButtonProps) {
  const { t } = useTranslation();

  const handlePressIn = () => {
    if (disabled) return;
    hapticSelection();
    onPressIn();
  };

  const label = accessibilityLabel || t?.accessibility?.hyperspace_button_label || "Hyperspace jump";
  const hint = accessibilityHint || t?.accessibility?.hyperspace_button_hint || "Teleports ship to a random location";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPressIn={handlePressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        {
          backgroundColor: disabled
            ? "rgba(100, 100, 100, 0.2)"
            : pressed
            ? "rgba(0, 255, 255, 0.75)"
            : "rgba(0, 255, 255, 0.3)",
          transform: [{ scale: pressed && !disabled ? 0.92 : 1 }],
        },
      ]}
    >
      <Text style={[styles.label, disabled && styles.disabledLabel]}>H</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    minWidth: 48,
    minHeight: 48,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(0, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    borderColor: "#00FFFF",
  },
  disabled: {
    borderColor: "rgba(150, 150, 150, 0.4)",
  },
  label: {
    color: "cyan",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  disabledLabel: {
    color: "rgba(200, 200, 200, 0.5)",
  },
});
