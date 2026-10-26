/**
 * Synthwave Arkanoid — Module A HUD (React Native)
 */
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { colors } from "../../../theme/colors";

const FONT_LABEL = "Orbitron_400Regular";
const FONT_VALUE = "Orbitron_800ExtraBold";
const FONT_FALLBACK = "monospace";

export function HudStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.stat} accessibilityRole="text">
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function HighScorePanel({ score }: { score: number }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View
      style={styles.hiScore}
      accessibilityRole="text"
      accessibilityLabel={`High score ${score}`}
    >
      <Animated.Text style={[styles.label, { opacity }]}>
        HI-SCORE
      </Animated.Text>
      <Text style={styles.value}>{score}</Text>
    </View>
  );
}

export function LivesIndicator({
  lives,
  max = 3,
}: {
  lives: number;
  max?: number;
}) {
  const safeLives = Math.max(0, Math.min(lives, max));
  return (
    <View
      style={styles.livesColumn}
      accessibilityRole="text"
      accessibilityLabel={`Lives ${safeLives} of ${max}`}
    >
      <Text style={styles.label}>LIVES</Text>
      <View style={styles.livesRow}>
        {Array.from({ length: max }, (_, i) => (
          <View
            key={i}
            style={[styles.miniPaddle, i >= safeLives && styles.miniPaddleOff]}
          />
        ))}
      </View>
    </View>
  );
}

export function LevelProgressBar({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(clamped * 100)}%` },
        ]}
      />
    </View>
  );
}

export function ArkanoidHud({
  score,
  highScore,
  lives,
  level,
}: {
  score: number;
  highScore: number;
  lives: number;
  level: number;
}) {
  return (
    <View style={styles.hudRow}>
      <HudStat label="SCORE" value={score} />
      <HighScorePanel score={highScore} />
      <LivesIndicator lives={lives} />
      <HudStat label="LVL" value={level} />
    </View>
  );
}

const styles = StyleSheet.create({
  hudRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 8,
    gap: 4,
  },
  stat: {
    alignItems: "center",
    minWidth: 72,
  },
  hiScore: {
    alignItems: "center",
    minWidth: 88,
  },
  livesColumn: {
    alignItems: "center",
    minWidth: 72,
  },
  label: {
    fontFamily: FONT_LABEL,
    fontStyle: "italic",
    color: colors.cyan,
    opacity: 0.7,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "300",
  },
  value: {
    fontFamily: FONT_VALUE,
    fontStyle: "italic",
    color: colors.cyan,
    fontSize: 18,
    fontWeight: "800",
    textShadowColor: colors.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  livesRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  miniPaddle: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cyan,
    shadowColor: colors.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  miniPaddleOff: {
    backgroundColor: "#1a3340",
    shadowOpacity: 0,
    elevation: 0,
  },
  progressTrack: {
    height: 3,
    width: "100%",
    backgroundColor: "rgba(0,243,255,0.15)",
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.cyan,
  },
});

void FONT_FALLBACK;

export default ArkanoidHud;
