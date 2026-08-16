import React, { useState } from "react";
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
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label} nativeID="playerNameLabel">
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          style,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        accessibilityLabelledBy="playerNameLabel"
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
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
  inputFocused: {
    borderColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});
