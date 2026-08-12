import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LeaderboardService } from '../services/LeaderboardService';
import { useTranslation } from '../hooks/useTranslation';
import { hapticSelection } from '../utils/haptics';

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
      setError("No se pudo cargar el ranking");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const sanitizedGameKey = gameId.replace('-', '_');
  const gameNameLocal = (t.menu as any)[sanitizedGameKey] || gameId.toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.card} accessibilityViewIsModal={true}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">RANKING {gameId.toUpperCase()}</Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close leaderboard overlay"
            accessibilityHint="Returns to the home screen menu"
          >
            <Text style={styles.closeButton}>X</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer} accessibilityLabel="Cargando ranking diario" accessibilityState={{ busy: true }}>
            <ActivityIndicator size="large" color="white" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchScores}
              accessibilityRole="button"
              accessibilityLabel="Reintentar cargar ranking"
              accessibilityHint="Vuelve a intentar cargar la lista de puntuaciones"
            >
              <Text style={styles.retryButtonText}>REINTENTAR</Text>
            </TouchableOpacity>
          </View>
        ) : scores.length === 0 ? (
          <Text style={styles.emptyText}>Sin puntuaciones hoy</Text>
        ) : (
          <ScrollView style={styles.content}>
            {scores.map((s, i) => (
              <View key={i} style={styles.row}>
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
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    marginTop: 15,
    backgroundColor: '#FFD700',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'black',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: 14,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
  },
  card: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#FFD700',
    fontSize: 20,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  closeTouchArea: {
    padding: 10,
    margin: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'monospace',
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  rank: {
    color: '#666',
    width: 30,
    fontFamily: 'monospace',
  },
  name: {
    color: 'white',
    flex: 1,
    fontFamily: 'monospace',
  },
  score: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontFamily: 'monospace',
  }
});
