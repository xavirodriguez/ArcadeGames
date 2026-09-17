import React, { ComponentType } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { colors } from "../theme/colors";

export interface LivesIconProps {
  color?: string;
  compact?: boolean;
}

export interface LivesIndicatorProps {
  lives: number;
  maxVisibleIcons?: number;
  iconComponent: ComponentType<LivesIconProps>;
  iconColor?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Generic Arcade HUD Lives Indicator.
 * Displays up to `maxVisibleIcons` (default 4) custom icon instances,
 * with a `+N` label for extra remaining lives.
 *
 * Enforces accessibility rules:
 * - Parent View announces total lives.
 * - Child icons are hidden from screen readers to prevent duplicate announcements.
 */
export function LivesIndicator({
  lives,
  maxVisibleIcons = 4,
  iconComponent: IconComponent,
  iconColor = colors.cyan,
  compact = false,
  style,
  accessibilityLabel,
}: LivesIndicatorProps) {
  const visibleCount = Math.max(0, Math.min(lives, maxVisibleIcons));
  const extraLives = Math.max(0, lives - maxVisibleIcons);

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      {lives > 0 ? (
        <View style={styles.iconRow}>
          {Array.from({ length: visibleCount }).map((_, index) => (
            <View
              key={`life-icon-${index}`}
              importantForAccessibility="no"
              accessibilityElementsHidden={true}
            >
              <IconComponent color={iconColor} compact={compact} />
            </View>
          ))}
          {extraLives > 0 && (
            <Text style={[styles.extraText, compact && styles.extraTextCompact]}>
              +{extraLives}
            </Text>
          )}
        </View>
      ) : (
        <Text style={[styles.signalLost, compact && styles.signalLostCompact]}>
          0
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  extraText: {
    color: colors.white,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  extraTextCompact: {
    fontSize: 10,
    marginLeft: 2,
  },
  signalLost: {
    color: colors.red,
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  signalLostCompact: {
    fontSize: 9,
  },
});
