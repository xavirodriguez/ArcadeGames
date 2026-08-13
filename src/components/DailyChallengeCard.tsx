import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { DailyChallengeService } from '../services/DailyChallengeService';
import { MutatorService } from '../services/MutatorService';
import { useTranslation } from '../hooks/useTranslation';
import { colors, spacing, typography } from '../theme';
import { hapticSelection } from '../utils/haptics';

interface DailyChallengeCardProps {
  onPlay: (gameId: string, seed: number) => void;
}

export const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({ onPlay }) => {
  const { t } = useTranslation();
  const [gameId, setGameId] = useState<string>("asteroids");
  const [played, setPlayed] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    // Reproducible daily game rotation based on seed
    const availableGames = ["asteroids", "pong", "flappybird", "space-invaders"];
    const dateKey = DailyChallengeService.getDateKey();
    const dateNum = parseInt(dateKey, 10);
    const todayGameId = availableGames[dateNum % availableGames.length];

    setGameId(todayGameId);

    DailyChallengeService.hasTodayAttemptBeenUsed(todayGameId).then(setPlayed);
    DailyChallengeService.getTodayScore(todayGameId).then(setScore);
  }, []);

  const handlePlay = () => {
    hapticSelection();
    const seed = DailyChallengeService.getDailySeed(gameId);
    onPlay(gameId, seed);
  };

  const mutators = MutatorService.getActiveMutatorsForGame(gameId);

  const accessibleLabel = `Desafío Diario: Jugar ${gameId.replace('-', ' ')}. ${played ? `Ya jugado. Puntuación de hoy: ${score ?? 0}. Presiona para mejorar tu puntuación.` : "No jugado aún. ¡Presiona para jugar ahora!"}`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePlay}
      accessibilityRole="button"
      accessibilityLabel={accessibleLabel}
      accessibilityHint="Inicia el juego del desafío diario con modificadores activos especiales"
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t.daily.title}</Text>
        {played && <View style={styles.playedBadge}><Text style={styles.playedText}>{t.daily.played}</Text></View>}
      </View>

      <Text style={styles.gameName}>{gameId.replace('-', '_').toUpperCase()}</Text>

      {mutators.length > 0 && (
          <Text style={styles.mutatorText}>{t.daily.mutator}: {t.mutators[mutators[0].id as keyof typeof t.mutators]?.name || mutators[0].name}</Text>
      )}

      {score !== null && (
        <Text style={styles.scoreText}>{t.daily.your_score}: {score}</Text>
      )}

      {!played ? (
        <Text style={styles.cta}>{t.daily.play_now}</Text>
      ) : (
        <Text style={styles.cta}>{t.daily.improve_score}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: 12,
    padding: spacing.lg,
    width: 300,
    marginTop: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.gold,
    fontSize: typography.sizes.lg,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
  },
  playedBadge: {
    backgroundColor: colors.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playedText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  gameName: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  mutatorText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontFamily: typography.game,
    marginBottom: spacing.sm,
  },
  scoreText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontFamily: typography.game,
    marginBottom: spacing.sm,
  },
  cta: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontFamily: typography.game,
    textAlign: 'right',
    textDecorationLine: 'underline',
  }
});
