import { StyleSheet } from "react-native";
import { GestureActionButton } from "./GestureActionButton";

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
 * Uses GestureActionButton for low-latency gesture input handling.
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
  return (
    <GestureActionButton
      label={label}
      size={size}
      color={color}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
    />
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
    userSelect: "none",
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
    userSelect: "none",
  },
  disabledLabel: {
    color: "rgba(255,255,255,0.4)",
  },
});
