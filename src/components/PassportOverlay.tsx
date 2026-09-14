import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { PlayerProfile } from '../services/PlayerProfileService';
import { LEVEL_THRESHOLDS } from '../config/PassportConfig';
import { useGameServices } from "@tiny-aster/react-native";
import { useTranslation } from '../hooks/useTranslation';
import { hapticSelection } from '../utils/haptics';
import { colors, spacing, typography } from '../theme';

interface PassportOverlayProps {
  profile: PlayerProfile;
  onClose: () => void;
}

export const PassportOverlay: React.FC<PassportOverlayProps> = ({ profile, onClose }) => {
  const { t } = useTranslation();
  const nextLevelXP = LEVEL_THRESHOLDS[profile.level] || profile.xp;
  const prevLevelXP = LEVEL_THRESHOLDS[profile.level - 1] || 0;
  const progress = Math.min(1, (profile.xp - prevLevelXP) / (nextLevelXP - prevLevelXP));

  const services = useGameServices();
  const isMuted = services?.isMuted ?? false;

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

  const closeBtnLabel = t?.accessibility?.close_button || "Close";
  const closeBtnHint = t?.accessibility?.close_button_hint || "Closes the current window";
  const muteLabel = isMuted
    ? (t?.accessibility?.mute_button_off || "Unmute audio")
    : (t?.accessibility?.mute_button_on || "Mute audio");
  const muteHint = t?.accessibility?.mute_button_hint || "Toggles audio sound";

  return (
    <View style={styles.container}>
      <View style={styles.card} accessibilityViewIsModal={true}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {t?.accessibility?.passport_title || "ARCADE PASSPORT"}
          </Text>
          <TouchableOpacity
            style={styles.closeTouchArea}
            activeOpacity={0.8}
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

        <ScrollView style={styles.content}>
          <View style={styles.profileSection} accessibilityRole="header" accessibilityLabel={`Pilot ${profile.displayName}, ID ${profile.playerId.slice(0, 8)}`}>
            <Text style={styles.playerName}>{profile.displayName}</Text>
            <Text style={styles.playerId}>ID: {profile.playerId.slice(0, 8)}</Text>
          </View>

          <View style={styles.levelSection} accessibilityRole="text" accessibilityLabel={`Level ${profile.level}, total experience ${profile.xp}`}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{profile.level}</Text>
            </View>
            <View style={styles.xpInfo}>
              <Text style={styles.xpLabel}>XP TOTAL: {profile.xp}</Text>
              <View
                style={styles.progressBarContainer}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
                accessibilityLabel={`Level progress: ${Math.round(progress * 100)}%`}
              >
                <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.xpSublabel}>
                {profile.xp - prevLevelXP} / {nextLevelXP - prevLevelXP} for level {profile.level + 1}
              </Text>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t?.accessibility?.passport_stats || "STATISTICS"}
            </Text>
            <StatRow label={t?.accessibility?.stat_asteroids || "Asteroids Destroyed"} value={profile.stats.asteroidsDestroyed} />
            <StatRow label={t?.accessibility?.stat_pipes || "Pipes Passed"} value={profile.stats.pipesPassed} />
            <StatRow label={t?.accessibility?.stat_invaders || "Invaders Destroyed"} value={profile.stats.siKills} />
            <StatRow label={t?.accessibility?.stat_pong || "Pong Sets Won"} value={profile.stats.pongSetsWon} />
            <StatRow label={t?.accessibility?.stat_playtime || "Playtime Ticks"} value={profile.stats.totalPlaytimeTicks} />
          </View>

          <View style={styles.unlocksSection}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t?.accessibility?.passport_unlocks || "UNLOCKS"}
            </Text>
            <Text style={styles.unlockText}>
              {t?.accessibility?.palettes_unlocked || "Palettes"}: {profile.unlockedPalettes.length}
            </Text>
            <Text style={styles.unlockText}>
              {t?.accessibility?.trails_unlocked || "Trails"}: {profile.unlockedTrails.length}
            </Text>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t?.accessibility?.passport_settings || "SETTINGS"}
            </Text>
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel} nativeID="muteAudioLabel">
                  {t?.accessibility?.passport_mute || "MUTE AUDIO"}
                </Text>
                <Switch
                    value={isMuted}
                    onValueChange={(val) => {
                        hapticSelection();
                        services?.setMuted(val);
                    }}
                    accessibilityLabel={muteLabel}
                    accessibilityLabelledBy="muteAudioLabel"
                    accessibilityHint={muteHint}
                />
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const StatRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <View style={styles.statRow} accessibilityRole="text" accessibilityLabel={`${label}: ${value}`}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  card: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.backgroundDark,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
  },
  closeTouchArea: {
    padding: spacing.sm,
    margin: -spacing.sm,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  playerName: {
    color: colors.white,
    fontSize: typography.sizes.title,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
  },
  playerId: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontFamily: typography.game,
  },
  levelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  levelText: {
    color: colors.background,
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
  },
  xpInfo: {
    flex: 1,
  },
  xpLabel: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontFamily: typography.game,
    marginBottom: spacing.xs,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: colors.borderDark,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.green,
  },
  xpSublabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontFamily: typography.game,
  },
  statsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.gold,
    fontSize: typography.sizes.lg,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.game,
  },
  statValue: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
  },
  unlocksSection: {
    marginBottom: spacing.md,
  },
  unlockText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.game,
    marginBottom: spacing.xs,
  },
  settingsSection: {
    marginBottom: spacing.xxxl,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingLabel: {
    color: colors.white,
    fontFamily: typography.game,
    fontSize: typography.sizes.md,
  }
});
