import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, SlideInDown, ZoomIn } from "react-native-reanimated";
import { COLORS, typography, spacing, radius } from "../theme";
import { useTranslation } from "../hooks/useTranslation";
import { hapticSelection } from "../utils/haptics";

let Canvas: any = null;
let BackdropBlur: any = null;
let Fill: any = null;

if (Platform.OS !== "web") {
  try {
    const SkiaModule = require("@shopify/react-native-skia");
    Canvas = SkiaModule.Canvas;
    BackdropBlur = SkiaModule.BackdropBlur;
    Fill = SkiaModule.Fill;
  } catch (_err) {
    // Optional Skia fallback
  }
}

export interface GameOverNarrativeProps {
  gameTitle?: string;
  errorCode?: string;
  message?: string;
  score: number;
  highScore: number;
  newRecord?: boolean;
  onRestart?: () => void;
  subhead?: string;
}

const formatScore = (score: number) => String(Math.max(0, score)).padStart(8, "0");

export const GameOverNarrative: React.FC<GameOverNarrativeProps> = ({
  gameTitle = "ODISEA-7",
  errorCode = "ERR.SIG-07",
  message = "CONNECTION TERMINATED // UNKNOWN SECTOR",
  score,
  highScore,
  newRecord = false,
  onRestart,
  subhead,
}) => {
  const { t } = useTranslation();
  const isNewRecord = newRecord || score >= highScore;
  const accentColor = isNewRecord ? COLORS.warning : COLORS.error;

  const handleRestart = () => {
    hapticSelection();
    if (onRestart) onRestart();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(450)}
      style={styles.gameOverOverlay}
      accessibilityViewIsModal={true}
    >
      {Platform.OS !== "web" && Canvas && BackdropBlur && Fill && (
        <Canvas style={StyleSheet.absoluteFill}>
          <BackdropBlur blur={18}>
            <Fill color="rgba(0, 0, 0, 0.68)" />
          </BackdropBlur>
        </Canvas>
      )}

      <View style={[styles.gameOverNoiseLine, { backgroundColor: `${accentColor}55` }]} />

      <Animated.View
        entering={SlideInDown.delay(120).duration(520)}
        style={[styles.gameOverTerminal, { borderColor: accentColor }]}
        accessibilityViewIsModal={true}
      >
        <View style={styles.gameOverHeaderRow}>
          <Text style={styles.gameOverSystemLabel} accessibilityRole="header">
            {gameTitle} // FLIGHT RECORDER
          </Text>
          <Text style={[styles.gameOverErrorCode, { color: accentColor }]}>
            {errorCode}
          </Text>
        </View>

        <View style={[styles.gameOverDivider, { backgroundColor: `${accentColor}44` }]} />

        <Animated.Text
          entering={ZoomIn.delay(180).duration(480)}
          style={[
            styles.signalLostTitle,
            { color: accentColor },
            Platform.OS === "web"
              ? ({ textShadow: `0 0 18px ${accentColor}88` } as any)
              : { textShadowColor: `${accentColor}88`, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },
          ]}
        >
          SIGNAL LOST
        </Animated.Text>

        <Text style={styles.gameOverSubhead}>
          {subhead || "CONNECTION TERMINATED // MISSION ENDED"}
        </Text>

        <View style={[styles.gameOverStatsRow, { borderColor: `${accentColor}66` }]}>
          <View style={styles.gameOverStatBlock}>
            <Text style={styles.gameOverStatLabel}>LAST SCORE</Text>
            <Text style={styles.gameOverStatValue}>{formatScore(score)}</Text>
          </View>
          <View style={[styles.gameOverStatSeparator, { backgroundColor: `${accentColor}44` }]} />
          <View style={styles.gameOverStatBlock}>
            <Text style={styles.gameOverStatLabel}>ARCHIVE RECORD</Text>
            <Text
              style={[
                styles.gameOverStatValue,
                { color: isNewRecord ? COLORS.warning : COLORS.info },
              ]}
            >
              {formatScore(Math.max(score, highScore))}
            </Text>
          </View>
        </View>

        {isNewRecord && (
          <Text
            style={[styles.newRecordFlag, { color: COLORS.warning }]}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            accessibilityLabel="New Archive Record Achieved!"
          >
            // NEW ARCHIVE RECORD //
          </Text>
        )}

        <View style={[styles.transmissionBox, { borderLeftColor: accentColor }]}>
          <Text style={[styles.transmissionLabel, { color: accentColor }]}>
            FINAL TRANSMISSION
          </Text>
          <Text style={styles.transmissionText}>{message}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.restartButton,
            { borderColor: accentColor, backgroundColor: `${accentColor}18` },
          ]}
          onPress={handleRestart}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel={t?.accessibility?.restart_game_label || "Restart game"}
          accessibilityHint={t?.accessibility?.restart_game_hint || "Restarts the game"}
          accessibilityState={{ disabled: false }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={[styles.restartAccent, { backgroundColor: accentColor }]} />
          <Text style={styles.restartButtonMeta}>MISSION CONTROL</Text>
          <Text style={[styles.restartButtonText, { color: accentColor }]}>
            REINITIALIZE MISSION
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    pointerEvents: "auto",
    paddingHorizontal: spacing.lg,
    zIndex: 2000,
  },
  gameOverNoiseLine: {
    position: "absolute",
    top: "48%",
    left: 0,
    right: 0,
    height: 1,
  },
  gameOverTerminal: {
    width: "100%",
    maxWidth: 700,
    backgroundColor: COLORS.bgPanel,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  gameOverHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gameOverSystemLabel: {
    color: "#a0a5b5",
    fontFamily: typography.game,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
  },
  gameOverErrorCode: {
    fontFamily: typography.game,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.3,
  },
  gameOverDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  signalLostTitle: {
    fontFamily: typography.game,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    letterSpacing: 5,
    textAlign: "center",
  },
  gameOverSubhead: {
    color: "#a0a5b5",
    fontFamily: typography.game,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.6,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  gameOverStatsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
  },
  gameOverStatBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  gameOverStatSeparator: {
    width: 1,
  },
  gameOverStatLabel: {
    color: "#a0a5b5",
    fontFamily: typography.game,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
  },
  gameOverStatValue: {
    color: "#ffffff",
    fontFamily: typography.game,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
  },
  newRecordFlag: {
    fontFamily: typography.game,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.6,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  transmissionBox: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderLeftWidth: 3,
  },
  transmissionLabel: {
    fontFamily: typography.game,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  transmissionText: {
    color: "#d0d5e5",
    fontFamily: typography.game,
    fontSize: typography.sizes.body,
    lineHeight: 22,
  },
  restartButton: {
    alignSelf: "center",
    minWidth: 270,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: "center",
    overflow: "hidden",
  },
  restartAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
  },
  restartButtonMeta: {
    color: "#a0a5b5",
    fontFamily: typography.game,
    fontSize: 9,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  restartButtonText: {
    fontFamily: typography.game,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.6,
  },
});
