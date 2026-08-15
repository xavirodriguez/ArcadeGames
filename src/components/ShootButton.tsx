import { StyleSheet, Pressable, Text } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import { hapticSelection } from "../utils/haptics";

export interface ShootButtonProps {
  onPressIn: () => void;
  onPressOut: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Pure UI component for shooting.
 * Circular button, 84x84px, semi-transparent red tint.
 * Uses Pressable for visual feedback and touch handling.
 */
export function ShootButton({
  onPressIn,
  onPressOut,
  accessibilityLabel,
  accessibilityHint,
}: ShootButtonProps) {
  const { t } = useTranslation();

  const handlePressIn = () => {
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
      onPressIn={handlePressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed
            ? "rgba(255, 80, 80, 0.7)"
            : "rgba(255, 80, 80, 0.4)",
        },
      ]}
    >
      <Text style={styles.label}>FIRE</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "rgba(255, 80, 80, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#FF8080",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});
