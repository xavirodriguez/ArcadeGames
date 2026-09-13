import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { fonts, semanticColors, typography, spacing, radius } from "../../theme";
import { GameKey, getGameAccentColors } from "../../theme/gameAccents";
import { hapticSelection } from "../../utils/haptics";
import Animated, { SlideInRight } from "react-native-reanimated";

export interface StationItem {
  key: GameKey;
  title: string;
  subtitle: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXTREME";
  highScore?: number;
}

const ARCADE_STATIONS: StationItem[] = [
  { key: "asteroids", title: "ASTEROIDS", subtitle: "KEPLER DEBRIS CLEARANCE", difficulty: "MEDIUM" },
  { key: "space-invaders", title: "SPACE INVADERS", subtitle: "ENWARM SURGE DEFENSE", difficulty: "HARD" },
  { key: "flappy-bird", title: "FLAPPY BIRD", subtitle: "ATMOSPHERIC VENT FLIGHT", difficulty: "MEDIUM" },
  { key: "pong", title: "PONG", subtitle: "ENCRYPTED DEFLECTOR BUS", difficulty: "EASY" },
  { key: "platformer", title: "PLATFORMER", subtitle: "FACILITY ESCAPE VECTOR", difficulty: "MEDIUM" },
  { key: "geometrywars", title: "GEOMETRY WARS", subtitle: "VECTOR GRID ANTIMATTER", difficulty: "EXTREME" },
  { key: "arkanoid", title: "ARKANOID", subtitle: "DOH DEFENSE BARRIER", difficulty: "HARD" },
];

export interface MissionSelectorProps {
  onSelectStation: (gameKey: GameKey) => void;
  onClose: () => void;
  highScores?: Record<string, number>;
}

export const MissionSelector = React.memo(function MissionSelector({
  onSelectStation,
  onClose,
  highScores = {},
}: MissionSelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerKicker}>KEPLER-791 // STATION SELECTOR</Text>
          <Text style={styles.headerTitle}>ARCADE MISSIONS</Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            hapticSelection();
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel="Close Mission Selector"
        >
          <Text style={styles.closeButtonText}>CLOSE [X]</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {ARCADE_STATIONS.map((station, index) => {
          const accentColors = getGameAccentColors(station.key);
          const score = highScores[station.key] ?? 0;

          return (
            <Animated.View
              key={station.key}
              entering={SlideInRight.delay(index * 80).duration(300)}
            >
              <TouchableOpacity
                style={[styles.card, { borderColor: accentColors.primary }]}
                onPress={() => {
                  hapticSelection();
                  onSelectStation(station.key);
                }}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={`Launch ${station.title}`}
              >
                <View style={[styles.accentStrip, { backgroundColor: accentColors.primary }]} />

                <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardTitle, { color: accentColors.primary }]}>
                      {station.title}
                    </Text>

                    <View style={[styles.diffBadge, { borderColor: accentColors.accent }]}>
                      <Text style={[styles.diffText, { color: accentColors.accent }]}>
                        {station.difficulty}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardSub}>{station.subtitle}</Text>

                  <View style={styles.cardFooterRow}>
                    <Text style={styles.recordText}>
                      RECORD: {String(score).padStart(8, "0")}
                    </Text>

                    <Text style={[styles.launchText, { color: accentColors.primary }]}>
                      LAUNCH STATION ►
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 16, 15, 0.95)",
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    zIndex: 1050,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: semanticColors.background.panel,
  },
  headerLeft: {
    flex: 1,
  },
  headerKicker: {
    fontFamily: fonts.data,
    fontSize: 10,
    color: semanticColors.warning,
    letterSpacing: typography.letterSpacing.wide,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.heavy,
    color: semanticColors.system,
    letterSpacing: typography.letterSpacing.wide,
  },
  closeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(255, 49, 91, 0.12)",
    borderWidth: 1,
    borderColor: semanticColors.danger,
    borderRadius: radius.xs,
  },
  closeButtonText: {
    fontFamily: fonts.data,
    fontSize: 12,
    fontWeight: "bold",
    color: semanticColors.danger,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  card: {
    flexDirection: "row",
    backgroundColor: semanticColors.background.panelStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  accentStrip: {
    width: 6,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.wide,
  },
  diffBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: radius.xs,
  },
  diffText: {
    fontFamily: fonts.data,
    fontSize: 9,
    fontWeight: "bold",
  },
  cardSub: {
    fontFamily: fonts.data,
    fontSize: typography.sizes.small,
    color: semanticColors.neutral[300],
    marginBottom: spacing.md,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  recordText: {
    fontFamily: fonts.data,
    fontSize: typography.sizes.small,
    color: semanticColors.neutral[400],
  },
  launchText: {
    fontFamily: fonts.data,
    fontSize: typography.sizes.small,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
