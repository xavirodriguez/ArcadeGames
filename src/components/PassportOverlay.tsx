import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { PlayerProfile } from '../services/PlayerProfileService';
import { LEVEL_THRESHOLDS } from '../config/PassportConfig';
import { useGameServices } from "@tiny-aster/react-native";
import { useTranslation } from '../hooks/useTranslation';
import { hapticSelection } from '../utils/haptics';

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
          <Text style={styles.title} accessibilityRole="header">ARCADE PASSPORT</Text>
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
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.xpSublabel}>
                {profile.xp - prevLevelXP} / {nextLevelXP - prevLevelXP} for level {profile.level + 1}
              </Text>
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle} accessibilityRole="header">STATISTICS</Text>
            <StatRow label="Asteroids Destroyed" value={profile.stats.asteroidsDestroyed} />
            <StatRow label="Pipes Passed" value={profile.stats.pipesPassed} />
            <StatRow label="Invaders Destroyed" value={profile.stats.siKills} />
            <StatRow label="Pong Sets Won" value={profile.stats.pongSetsWon} />
            <StatRow label="Playtime Ticks" value={profile.stats.totalPlaytimeTicks} />
          </View>

          <View style={styles.unlocksSection}>
            <Text style={styles.sectionTitle} accessibilityRole="header">UNLOCKS</Text>
            <Text style={styles.unlockText}>Palettes: {profile.unlockedPalettes.length}</Text>
            <Text style={styles.unlockText}>Trails: {profile.unlockedTrails.length}</Text>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle} accessibilityRole="header">SETTINGS</Text>
            <View style={styles.settingRow}>
                <Text style={styles.settingLabel} nativeID="muteAudioLabel">MUTE AUDIO</Text>
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  card: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  closeTouchArea: {
    padding: 10,
    margin: -10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    color: 'white',
    fontSize: 24,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  playerName: {
    color: 'white',
    fontSize: 28,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  playerId: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  levelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  levelText: {
    color: 'black',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  xpInfo: {
    flex: 1,
  },
  xpLabel: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#444',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00FF00',
  },
  xpSublabel: {
    color: '#AAA',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    color: '#CCC',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  statValue: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  unlocksSection: {
      marginBottom: 10,
  },
  unlockText: {
      color: '#CCC',
      fontSize: 14,
      fontFamily: 'monospace',
      marginBottom: 5,
  },
  settingsSection: {
      marginBottom: 30,
  },
  settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
  },
  settingLabel: {
      color: 'white',
      fontFamily: 'monospace',
      fontSize: 16,
  }
});
