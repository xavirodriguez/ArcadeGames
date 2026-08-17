import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { DailyChallengeService } from "../services/DailyChallengeService";
import { useTranslation } from "../hooks/useTranslation";
import { hapticSelection } from "../utils/haptics";
import { colors, spacing, typography } from "../theme";

interface DailyChallengeBannerProps {
  gameId: string;
  onPlay: (seed: number) => void;
}

export const DailyChallengeBanner: React.FC<DailyChallengeBannerProps> = ({ gameId, onPlay }) => {
  const { t } = useTranslation();
  const [seed, setSeed] = useState<number | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const fetchChallenge = async () => {
      const currentSeed = DailyChallengeService.getDailySeed(gameId);
      const hasUsed = await DailyChallengeService.hasTodayAttemptBeenUsed(gameId);
      setSeed(currentSeed);
      setHasPlayed(hasUsed);
    };
    fetchChallenge();
  }, [gameId]);

  if (seed === null || hasPlayed) return null;

  const handlePlay = () => {
    hapticSelection();
    onPlay(seed);
  };

  const titleText = t?.daily?.title ? `${t.daily.title}!` : "DAILY CHALLENGE AVAILABLE!";
  const playText = t?.daily?.play_now ? t.daily.play_now.toUpperCase() : "PLAY NOW";

  return (
    <View style={styles.container} accessibilityRole="summary">
      <Text style={styles.title}>{titleText}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handlePlay}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${titleText}. ${playText}`}
        accessibilityHint="Starts the daily challenge for this game"
      >
        <Text style={styles.buttonText}>{playText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gold,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: spacing.lg,
    width: "80%",
  },
  title: {
    color: colors.background,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
    marginBottom: spacing.sm,
    textAlign: "center",
    fontSize: typography.sizes.sm,
  },
  button: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    minHeight: 44,
    minWidth: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: colors.gold,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
  },
});
