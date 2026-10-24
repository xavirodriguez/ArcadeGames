import React, { FC } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FROGGER_VISUAL_TOKENS } from "../rendering/FroggerVisualTokens";
import {
  formatFroggerScore,
  getFroggerTimeProgress,
} from "./FroggerHudModel";

export interface FroggerHudProps {
  score: number;
  lives: number;
  lifeSlots: number;
  level: number;
  occupiedLilyPads: number;
  totalLilyPads: number;
  timeRemaining: number;
  timeLimit: number;
}

const MAX_VISIBLE_LIFE_SLOTS = 5;

export const FroggerHud: FC<FroggerHudProps> = ({
  score,
  lives,
  lifeSlots,
  level,
  occupiedLilyPads,
  totalLilyPads,
  timeRemaining,
  timeLimit,
}) => {
  const visibleLifeSlots = Math.max(
    1,
    Math.min(MAX_VISIBLE_LIFE_SLOTS, Math.max(lifeSlots, Math.min(lives, MAX_VISIBLE_LIFE_SLOTS)))
  );
  const progress = getFroggerTimeProgress(timeRemaining, timeLimit);
  const seconds = Math.max(0, Math.ceil(Number.isFinite(timeRemaining) ? timeRemaining : 0));
  const timerColor = progress <= 0.25
    ? FROGGER_VISUAL_TOKENS.crocodile.eyes
    : FROGGER_VISUAL_TOKENS.surfaces.riverShallow;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.panel}>
        <View style={styles.topRow}>
          <View style={styles.scoreGroup}>
            <Text style={styles.eyebrow}>PUNTOS</Text>
            <Text style={styles.score} numberOfLines={1} adjustsFontSizeToFit>
              {formatFroggerScore(score)}
            </Text>
          </View>

          <View
            style={styles.livesGroup}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Vidas restantes: ${lives}`}
          >
            <Text style={styles.eyebrow}>VIDAS</Text>
            <View style={styles.lifeIcons}>
              {Array.from({ length: visibleLifeSlots }, (_, index) => (
                <FrogLifeIcon key={index} active={index < lives} />
              ))}
              {lives > MAX_VISIBLE_LIFE_SLOTS && (
                <Text style={styles.extraLives}>×{lives}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.levelRow}>
          <Text style={styles.levelLabel} numberOfLines={1}>
            NIVEL {level} · ATARDECER
          </Text>
          <Text style={styles.padsLabel} numberOfLines={1}>
            METAS {occupiedLilyPads}/{totalLilyPads}
          </Text>
        </View>

        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>TIEMPO {seconds}s</Text>
          <View
            style={styles.timerTrack}
            accessibilityRole="progressbar"
            accessibilityLabel="Tiempo disponible"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          >
            <View
              style={[
                styles.timerFill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: timerColor },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const FrogLifeIcon: FC<{ active: boolean }> = ({ active }) => (
  <View style={[styles.lifeIcon, !active && styles.lifeIconInactive]}>
    <View style={styles.lifeBody} />
    <View style={[styles.lifeEye, styles.lifeEyeLeft]} />
    <View style={[styles.lifeEye, styles.lifeEyeRight]} />
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 52,
    left: 10,
    right: 10,
    zIndex: 20,
    alignItems: "center",
  },
  panel: {
    width: "100%",
    maxWidth: 380,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: FROGGER_VISUAL_TOKENS.surfaces.hud,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(233, 185, 73, 0.38)",
    shadowColor: FROGGER_VISUAL_TOKENS.shadows.color,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 5,
    elevation: 4,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 30,
  },
  scoreGroup: {
    flexShrink: 1,
  },
  eyebrow: {
    color: "#A6B9B7",
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  score: {
    color: FROGGER_VISUAL_TOKENS.frog.body,
    fontFamily: "monospace",
    fontSize: 19,
    lineHeight: 22,
    fontWeight: "800",
    letterSpacing: 0.6,
    fontVariant: ["tabular-nums"],
  },
  livesGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginLeft: 8,
  },
  lifeIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minHeight: 18,
  },
  lifeIcon: {
    position: "relative",
    width: 17,
    height: 15,
  },
  lifeIconInactive: {
    opacity: 0.25,
  },
  lifeBody: {
    position: "absolute",
    left: 3,
    top: 5,
    width: 11,
    height: 9,
    borderRadius: 6,
    backgroundColor: FROGGER_VISUAL_TOKENS.frog.body,
  },
  lifeEye: {
    position: "absolute",
    top: 1,
    width: 6,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.2,
    borderColor: FROGGER_VISUAL_TOKENS.surfaces.hud,
    backgroundColor: FROGGER_VISUAL_TOKENS.frog.eyes,
  },
  lifeEyeLeft: {
    left: 3,
  },
  lifeEyeRight: {
    right: 3,
  },
  extraLives: {
    color: FROGGER_VISUAL_TOKENS.frog.body,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 2,
  },
  levelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    minHeight: 14,
  },
  levelLabel: {
    color: FROGGER_VISUAL_TOKENS.surfaces.bankHighlight,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
    letterSpacing: 0.45,
    flexShrink: 1,
  },
  padsLabel: {
    color: "#C9D4D0",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 9,
  },
  timerLabel: {
    width: 61,
    color: "#C9D4D0",
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
  timerTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(242, 238, 227, 0.14)",
    overflow: "hidden",
    flex: 1,
  },
  timerFill: {
    height: "100%",
    borderRadius: 2,
  },
});
