import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LeaderboardService } from '../services/LeaderboardService';
import { useTranslation } from '../hooks/useTranslation';
import { hapticSelection } from '../utils/haptics';
import { colors, spacing, typography } from '../theme';

interface LeaderboardEntry {
  playerId: string;
  score: number;
  displayName?: string;
}

interface LeaderboardOverlayProps {
  gameId: string;
  onClose: () => void;
}

export const LeaderboardOverlay: React.FC<LeaderboardOverlayProps> = ({ gameId, onClose }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dateKey = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const data = await LeaderboardService.fetchDailyLeaderboard(gameId, dateKey);
      setScores(data as LeaderboardEntry[]);
    } catch (_e) {
      setError(t?.accessibility?.leaderboard_error || "Could not load leaderboard rankings");
    } finally {
      setLoading(false);
    }
  }, [gameId, t]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.addEventListener) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          hapticSelection();
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [onClose]);

  const sanitizedGameKey = gameId.replace('-', '_');
  const gameNameLocal = (t?.menu as any)?.[sanitizedGameKey] || gameId.toUpperCase();
  const headerSuffix = t?.accessibility?.lead_header_suffix || "RANKING";
  const closeBtnLabel = t?.accessibility?.close_button || "Close";
  const closeBtnHint = t?.accessibility?.close_button_hint || "Closes the leaderboard window";

  return (
    <View style={styles.container}>
      <View style={styles.card} accessibilityViewIsModal={true}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {headerSuffix} {gameNameLocal.toUpperCase()}
          </Text>
          <TouchableOpacity
            style={styles.closeTouchArea}
            onPress={() => {
              hapticSelection();
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel={closeBtnLabel}
            accessibilityHint={closeBtnHint}
          >
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer} accessibilityLabel="Loading daily leaderboard" accessibilityState={{ busy: true }}>
            <ActivityIndicator size="large" color={colors.white} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.8}
              onPress={() => {
                hapticSelection();
                fetchScores();
              }}
              accessibilityRole="button"
              accessibilityLabel={t?.common?.retry || "RETRY"}
              accessibilityHint="Retries loading the daily leaderboard"
            >
              <Text style={styles.retryButtonText}>{t?.common?.retry || "RETRY"}</Text>
            </TouchableOpacity>
          </View>
        ) : scores.length === 0 ? (
          <Text style={styles.emptyText}>{t?.accessibility?.leaderboard_empty || "No scores recorded today"}</Text>
        ) : (
          <ScrollView style={styles.content}>
            {scores.map((s, i) => (
              <View
                key={i}
                style={styles.row}
                accessibilityRole="text"
                accessibilityLabel={`Rank ${i + 1}, ${s.displayName || s.playerId.slice(0, 8)}, score ${s.score}`}
              >
                <Text style={styles.rank}>{i + 1}.</Text>
                <Text style={styles.name}>{s.displayName || s.playerId.slice(0, 8)}</Text>
                <Text style={styles.score}>{s.score}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.gold,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    minHeight: 44,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: colors.background,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  card: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: 12,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.gold,
    fontSize: typography.sizes.xl,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
    flex: 1,
  },
  closeTouchArea: {
    padding: spacing.sm,
    margin: -spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    color: colors.white,
    fontSize: typography.sizes.xl,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  rank: {
    color: colors.textMuted,
    width: 30,
    fontFamily: typography.game,
  },
  name: {
    color: colors.white,
    flex: 1,
    fontFamily: typography.game,
  },
  score: {
    color: colors.gold,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
  },
  errorText: {
    color: colors.red,
    textAlign: 'center',
    fontFamily: typography.game,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: typography.game,
  }
});
