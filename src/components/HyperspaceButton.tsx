import { useTranslation } from "../hooks/useTranslation";
import { GestureActionButton } from "./controls/GestureActionButton";

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
 * Uses GestureActionButton for modern Gesture API handling.
 */
export function HyperspaceButton({
  onPressIn,
  onPressOut,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: HyperspaceButtonProps) {
  const { t } = useTranslation();

  const label = accessibilityLabel || t?.accessibility?.hyperspace_button_label || "Hyperspace jump";
  const hint = accessibilityHint || t?.accessibility?.hyperspace_button_hint || "Teleports ship to a random location";

  return (
    <GestureActionButton
      label="H"
      size={56}
      color="rgba(0, 255, 255, 0.3)"
      borderColor="rgba(0, 255, 255, 0.8)"
      pressedColor="rgba(0, 255, 255, 0.75)"
      pressedBorderColor="#00FFFF"
      textColor="cyan"
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityLabel={label}
      accessibilityHint={hint}
      disabled={disabled}
    />
  );
}
