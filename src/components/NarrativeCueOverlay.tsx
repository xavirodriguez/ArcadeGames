import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, AccessibilityInfo } from "react-native";
import { NarrativeCue } from "@tiny-aster/core";
import { colors } from "../theme/colors";

export interface NarrativeCueOverlayProps {
  cue: NarrativeCue | null;
  onCueDismissed?: (cueId: string) => void;
  onAudioCue?: (audioCueId: string) => void;
}

/**
 * Decoupled React overlay component rendering mid-game narrative cues during arcade gameplay.
 *
 * @remarks
 * Renders radio messages, warnings, visual glitch effects, and triggers audio callbacks.
 * Respects `prefers-reduced-motion` settings.
 */
export const NarrativeCueOverlay: React.FC<NarrativeCueOverlayProps> = ({
  cue,
  onCueDismissed,
  onAudioCue
}) => {
  const [activeCue, setActiveCue] = useState<NarrativeCue | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);

  useEffect(() => {
    if (!cue) return;

    setActiveCue(cue);

    if (cue.audioCueId && onAudioCue) {
      onAudioCue(cue.audioCueId);
    }

    const timer = setTimeout(() => {
      setActiveCue(null);
      if (onCueDismissed) {
        onCueDismissed(cue.id);
      }
    }, cue.durationMs || 3500);

    return () => clearTimeout(timer);
  }, [cue, onCueDismissed, onAudioCue]);

  if (!activeCue) return null;

  const isWarning = activeCue.type === "warning";
  const isGlitch = activeCue.type === "glitch" || activeCue.type === "hud_distortion";

  return (
    <View
      style={[
        styles.container,
        isGlitch && !reducedMotion && styles.glitchContainer,
        isWarning && styles.warningContainer
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.badgeRow}>
        <Text style={[styles.typeBadge, isWarning && styles.warningBadge]}>
          {activeCue.type.toUpperCase()} CUE
        </Text>
      </View>

      <Text style={styles.titleText}>{activeCue.titleKey || "TRANSMISSION RECEIVED"}</Text>
      <Text style={styles.messageText}>{activeCue.rawText || activeCue.messageKey || ""}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(10, 10, 20, 0.9)",
    borderWidth: 1,
    borderColor: colors.cyan,
    borderRadius: 6,
    padding: 12,
    zIndex: 100
  },
  glitchContainer: {
    borderColor: colors.pink,
    backgroundColor: "rgba(255, 0, 85, 0.15)"
  },
  warningContainer: {
    borderColor: colors.gold,
    backgroundColor: "rgba(255, 215, 0, 0.15)"
  },
  badgeRow: {
    marginBottom: 4
  },
  typeBadge: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  warningBadge: {
    color: colors.gold
  },
  titleText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  messageText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 4
  }
});
