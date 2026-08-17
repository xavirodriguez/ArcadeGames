import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import { hapticSelection } from "../utils/haptics";
import { colors, spacing, typography } from "../theme";

interface DailyResultsOverlayProps {
  gameId: string;
  score: number;
  seed: number;
  onClose: () => void;
}

export const DailyResultsOverlay: React.FC<DailyResultsOverlayProps> = ({
  gameId,
  score,
  seed,
  onClose,
}) => {
  const { t } = useTranslation();

  const handleClose = () => {
    hapticSelection();
    onClose();
  };

  const sanitizedGameKey = gameId.replace("-", "_");
  const gameNameLocal = (t?.menu as any)?.[sanitizedGameKey] || gameId.toUpperCase();
  const dailyResultsTitle = t?.daily?.title ? `${t.daily.title} RESULTS` : "DAILY RESULTS";
  const continueText = t?.common?.back || "CONTINUE";

  return (
    <View style={styles.overlay} accessibilityViewIsModal={true}>
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          {dailyResultsTitle}
        </Text>
        <Text style={styles.gameText}>{gameNameLocal.toUpperCase()}</Text>
        <Text style={styles.scoreText}>
          {t?.daily?.your_score || "SCORE"}: {score}
        </Text>
        <Text style={styles.seedText}>SEED: {seed}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleClose}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={continueText}
          accessibilityHint="Closes daily challenge summary and returns to game menu"
        >
          <Text style={styles.buttonText}>{continueText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2500,
  },
  container: {
    backgroundColor: colors.backgroundDark,
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.gold,
    width: "85%",
    maxWidth: 400,
  },
  title: {
    color: colors.gold,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  gameText: {
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontFamily: typography.game,
    marginBottom: spacing.sm,
  },
  scoreText: {
    color: colors.white,
    fontSize: typography.sizes.xl,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  seedText: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontFamily: typography.game,
    marginBottom: spacing.xxxl,
  },
  button: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    minHeight: 44,
    minWidth: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: colors.background,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
    fontSize: typography.sizes.sm,
  },
});
