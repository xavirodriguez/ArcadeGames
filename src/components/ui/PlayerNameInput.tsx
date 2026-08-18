import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { colors, typography, spacing, radius } from "@/theme";
import { useTranslation } from "@/hooks/useTranslation";

interface PlayerNameInputProps extends Omit<TextInputProps, "placeholderTextColor"> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  accessibilityHint?: string;
}

export const PlayerNameInput: React.FC<PlayerNameInputProps> = ({
  label,
  value,
  onChangeText,
  accessibilityHint,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);

  const defaultHint = accessibilityHint || t?.accessibility?.player_name_hint || "Enter your pilot or player name for high scores";

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
        accessibilityHint={defaultHint}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="done"
        maxLength={16}
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
    borderWidth: 1.5,
    borderColor: "rgba(0, 240, 255, 0.3)",
  },
  inputFocused: {
    borderColor: colors.cyan,
    borderWidth: 2,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
});
