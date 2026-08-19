import React, { useState } from "react";
import { StyleSheet, View, TextInput, TouchableOpacity, Text, ViewStyle } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import { hapticSelection } from "../utils/haptics";
import { colors, spacing, typography } from "../theme";

interface SeedWidgetProps {
  seed: number;
  onSeedEnter: (seed: number) => void;
  style?: ViewStyle;
}

export const SeedWidget: React.FC<SeedWidgetProps> = ({ seed, onSeedEnter, style }) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(seed.toString());
  const [isFocused, setIsFocused] = useState(false);

  const handleApply = () => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      hapticSelection();
      onSeedEnter(num);
    }
  };

  const seedLabel = t?.accessibility?.seed_input_label || "Simulation Seed";
  const seedHint = t?.accessibility?.seed_input_hint || "Enter a numeric seed value for deterministic generation";
  const applyLabel = t?.accessibility?.seed_apply_label || "Apply seed";
  const applyHint = t?.accessibility?.seed_apply_hint || "Applies the seed and resets game configuration";

  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={[styles.input, isFocused && styles.inputFocused]}
        value={value}
        onChangeText={setValue}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onSubmitEditing={handleApply}
        returnKeyType="done"
        placeholder="SEED"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        accessibilityLabel={seedLabel}
        accessibilityHint={seedHint}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleApply}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={applyLabel}
        accessibilityHint={applyHint}
      >
        <Text style={styles.buttonText}>APLICAR SEED</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.white,
    padding: spacing.sm,
    borderRadius: 8,
    width: 100,
    marginRight: spacing.sm,
    fontFamily: typography.game,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    minHeight: 44,
  },
  inputFocused: {
    borderColor: colors.cyan,
  },
  button: {
    backgroundColor: colors.borderDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
  },
});
