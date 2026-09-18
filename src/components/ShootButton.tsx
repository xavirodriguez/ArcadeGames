import { useTranslation } from "../hooks/useTranslation";
import { GestureActionButton } from "./controls/GestureActionButton";

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
 * Uses GestureActionButton for low-latency touch handling.
 */
export function ShootButton({
  onPressIn,
  onPressOut,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: ShootButtonProps) {
  const { t } = useTranslation();

  const label = accessibilityLabel || t?.accessibility?.shoot_button_label || "Fire weapon";
  const hint = accessibilityHint || t?.accessibility?.shoot_button_hint || "Fires primary weapon";

  return (
    <GestureActionButton
      label="FIRE"
      size={84}
      color="rgba(255, 80, 80, 0.4)"
      borderColor="rgba(255, 80, 80, 0.8)"
      pressedColor="rgba(255, 80, 80, 0.75)"
      pressedBorderColor="#FF8080"
      textColor="#FF8080"
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityLabel={label}
      accessibilityHint={hint}
      disabled={disabled}
    />
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
    userSelect: "none",
  },
  pressed: {
    borderColor: "#FF8080",
  },
  disabled: {
    borderColor: "rgba(150, 150, 150, 0.4)",
  },
  label: {
    color: "#FF8080",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
    userSelect: "none",
  },
  disabledLabel: {
    color: "rgba(200, 200, 200, 0.5)",
  },
});
