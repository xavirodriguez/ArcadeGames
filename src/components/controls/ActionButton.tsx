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
