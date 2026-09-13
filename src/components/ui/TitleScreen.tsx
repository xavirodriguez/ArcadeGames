import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { colors, fonts, semanticColors, typography, spacing, radius } from "../../theme";
import { hapticSelection } from "../../utils/haptics";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

export interface TitleScreenProps {
  onStartCampaign: () => void;
  onOpenMissionSelector: () => void;
}

export const TitleScreen = React.memo(function TitleScreen({
  onStartCampaign,
  onOpenMissionSelector,
}: TitleScreenProps) {
  return (
    <View style={styles.container}>
      {/* Scanline background overlay */}
      <View style={styles.scanlines} />

      <Animated.View entering={FadeIn.duration(800)} style={styles.content}>
        <Text style={styles.kicker}>HELIOS SECTOR 791 // DEEP SPACE ARCADE</Text>

        <Animated.View entering={ZoomIn.duration(600)} style={styles.titleContainer}>
          <Text style={styles.title}>ODISEA-7</Text>
          <Text style={styles.subtitle}>KEPLER RECOVERY INCIDENT</Text>
        </Animated.View>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ARCADE ENGINE v1.0</Text>
          </View>
          <View style={[styles.badge, styles.badgeHighlight]}>
            <Text style={[styles.badgeText, styles.badgeHighlightText]}>ONLINE LINK</Text>
          </View>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              hapticSelection();
              onStartCampaign();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Start Kepler Campaign"
          >
            <Text style={styles.primaryButtonText}>INITIATE CAMPAIGN</Text>
            <Text style={styles.primaryButtonSub}>KEPLER-791 STORY MODE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              hapticSelection();
              onOpenMissionSelector();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open Arcade Mission Selector"
          >
            <Text style={styles.secondaryButtonText}>ARCADE STATIONS</Text>
            <Text style={styles.secondaryButtonSub}>MINIGAME SELECTOR</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>PRESS ANY CONTROL TO LINK PILOT SYSTEM</Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: semanticColors.background.dark,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    zIndex: 1000,
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 232, 210, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(0, 232, 210, 0.12)",
  },
  content: {
    alignItems: "center",
    maxWidth: 600,
    width: "100%",
  },
  kicker: {
    fontFamily: fonts.data,
    fontSize: typography.sizes.small,
    color: semanticColors.warning,
    letterSpacing: typography.letterSpacing.widest,
    marginBottom: spacing.sm,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: typography.sizes.bigTitle,
    fontWeight: typography.weights.heavy,
    color: semanticColors.system,
    letterSpacing: typography.letterSpacing.widest,
    ...(Platform.OS === "web"
      ? { textShadow: "0 0 20px rgba(0, 232, 210, 0.6)" }
      : {
          textShadowColor: "rgba(0, 232, 210, 0.6)",
          textShadowRadius: 15,
        }),
  },
  subtitle: {
    fontFamily: fonts.data,
    fontSize: typography.sizes.label,
    color: semanticColors.neutral[100],
    letterSpacing: typography.letterSpacing.wide,
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: spacing.xxl,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    marginHorizontal: spacing.xs,
  },
  badgeHighlight: {
    borderColor: semanticColors.success,
    backgroundColor: "rgba(103, 247, 167, 0.1)",
  },
  badgeText: {
    fontFamily: fonts.data,
    fontSize: 10,
    color: semanticColors.neutral[300],
  },
  badgeHighlightText: {
    color: semanticColors.success,
    fontWeight: "bold",
  },
  buttonGroup: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  primaryButton: {
    width: "100%",
    minHeight: 52,
    backgroundColor: semanticColors.system,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontFamily: fonts.display,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.heavy,
    color: semanticColors.background.dark,
    letterSpacing: typography.letterSpacing.wide,
  },
  primaryButtonSub: {
    fontFamily: fonts.data,
    fontSize: 10,
    color: semanticColors.background.dark,
    opacity: 0.8,
  },
  secondaryButton: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "rgba(0, 232, 210, 0.08)",
    borderWidth: 1,
    borderColor: semanticColors.system,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: fonts.display,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.heavy,
    color: semanticColors.system,
    letterSpacing: typography.letterSpacing.wide,
  },
  secondaryButtonSub: {
    fontFamily: fonts.data,
    fontSize: 10,
    color: semanticColors.neutral[300],
  },
  footer: {
    fontFamily: fonts.data,
    fontSize: typography.sizes.small,
    color: semanticColors.neutral[400],
    letterSpacing: typography.letterSpacing.wide,
  },
});
