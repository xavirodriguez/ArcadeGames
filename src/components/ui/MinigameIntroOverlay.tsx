import React, { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS
} from "react-native-reanimated";
import { useGameTheme } from "../../context/GameThemeContext";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

/**
 * Props for the MinigameIntroOverlay component.
 * @public
 */
export interface MinigameIntroOverlayProps {
  /** Target minigame string identifier. */
  gameId: string;
  /** Optional custom title override for the minigame intro. */
  title?: string;
  /** Optional intro animation effect specifier (e.g. node.meta.introEffect). */
  introEffect?: string;
  /** Duration of intro banner animation in milliseconds (default: 750ms, max 800ms). */
  durationMs?: number;
  /** Callback fired upon completion of intro phase. */
  onComplete: () => void;
}

/**
 * Reanimated intro banner displayed during the intro phase before minigame execution.
 *
 * @remarks
 * Presents the minigame title with neon pulsing styling and respects accessibility `reduceMotion`.
 * The game simulation remains paused/inactive during this intro phase.
 *
 * @public
 */
export const MinigameIntroOverlay: React.FC<MinigameIntroOverlayProps> = ({
  gameId,
  title,
  introEffect,
  durationMs = 750,
  onComplete
}) => {
  const { reduceMotion } = useGameTheme();

  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      if (onComplete) {
        onComplete();
      }
      return;
    }

    scale.value = withTiming(1, { duration: durationMs * 0.4 });
    opacity.value = withTiming(1, { duration: durationMs * 0.3 }, (finished) => {
      if (finished) {
        opacity.value = withTiming(
          0,
          { duration: durationMs * 0.4 },
          (fadeFinished) => {
            if (fadeFinished && onComplete) {
              runOnJS(onComplete)();
            }
          }
        );
      }
    });
  }, [reduceMotion, durationMs, scale, opacity, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  const displayTitle = title || gameId.toUpperCase();

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text style={styles.readyText}>READY?</Text>
        <Text style={styles.titleText}>{displayTitle}</Text>
        {introEffect ? (
          <Text style={styles.effectText}>⚡ {introEffect.toUpperCase()}</Text>
        ) : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(6, 16, 15, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 120
  },
  card: {
    backgroundColor: "rgba(10, 15, 30, 0.95)",
    borderColor: colors.cyan,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16
  },
  readyText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: spacing.xs
  },
  titleText: {
    color: colors.cyan,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center"
  },
  effectText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "600",
    marginTop: spacing.xs
  }
});
