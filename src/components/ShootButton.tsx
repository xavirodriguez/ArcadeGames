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
