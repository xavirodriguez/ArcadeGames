import React from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { colors, typography, spacing, radius } from "@/theme";

interface PlayerNameInputProps extends Omit<TextInputProps, "placeholderTextColor"> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}

export const PlayerNameInput: React.FC<PlayerNameInputProps> = ({
  label,
  value,
  onChangeText,
  style,
  ...props
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label} nativeID="playerNameLabel">
        {label}
      </Text>
      <TextInput
        style={[styles.input, style]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        accessibilityLabelledBy="playerNameLabel"
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  label: {
    color: colors.cyan,
    fontFamily: typography.game,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
    textAlign: "center",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.white,
    padding: 15,
    borderRadius: radius.lg,
    width: 260,
    fontFamily: typography.game,
    textAlign: "center",
    fontSize: typography.sizes.lg,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.2)",
  },
});
