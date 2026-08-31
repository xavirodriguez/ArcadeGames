import { useState, useEffect } from "react";
import { router } from "expo-router";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Href } from "expo-router";
import { PlayerProfileService, PlayerProfile } from "../services/PlayerProfileService";
import { AudioSettingsService } from "../services/AudioSettingsService";
import { I18nService } from "../services/I18nService";
import { useTranslation } from "../hooks/useTranslation";
import { useGameServices } from "@tiny-aster/react-native";
import { PassportOverlay } from "../components/PassportOverlay";
import { DailyChallengeCard } from "../components/DailyChallengeCard";
import { LeaderboardOverlay } from "../components/LeaderboardOverlay";
import { SoundIcon, TrophyIcon } from "../components/icons";
import { hapticSelection } from "../utils/haptics";
import { colors, spacing, typography, effects, neonTextGlow, COLORS } from "../theme";

interface GameEntry {
  id: string;
  key: "asteroids" | "space_invaders" | "flappybird" | "pong" | "geometrywars" | "echorunner" | "platformer" | "cyoa" | "blindstation" | "campaign";
  href: Href<string>;
}

const GAMES: GameEntry[] = [
  { id: "campaign", key: "campaign", href: "/campaign" },
  { id: "asteroids", key: "asteroids", href: "/asteroids" },
  { id: "space-invaders", key: "space_invaders", href: "/space-invaders" },
  { id: "flappybird", key: "flappybird", href: "/flappybird" },
  { id: "pong", key: "pong", href: "/pong" },
  { id: "geometrywars", key: "geometrywars", href: "/geometrywars" },
  { id: "echorunner", key: "echorunner", href: "/echorunner" },
  { id: "platformer", key: "platformer", href: "/platformer" },
  { id: "cyoa", key: "cyoa", href: "/cyoa" },
  { id: "blindstation", key: "blindstation", href: "/blindstation" },
];

export default function HomeScreen() {
  const { t, locale, toggleLanguage } = useTranslation();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const services = useGameServices();
  const isMuted = services?.isMuted ?? false;
  const [showPassport, setShowPassport] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState<string | null>(null);

  const refreshProfile = () => {
    PlayerProfileService.getProfile().then(setProfile);
  };

  useEffect(() => {
    refreshProfile();
    I18nService.init();
    AudioSettingsService.init();

    // Listen for level up events to refresh the profile summary
    // Since index.tsx is the entry point, we can rely on it being mounted
    // but the EventBus is usually per-game.
    // However, PlayerProfileService is a singleton.

    // We'll refresh when focusing the screen too
    const interval = setInterval(refreshProfile, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleMute = async () => {
    hapticSelection();
    if (services) {
      await services.toggleMute();
    } else {
      await AudioSettingsService.toggleMute();
    }
  };

  const handlePlayDaily = (gameId: string, seed: number) => {
      const path = gameId === "asteroids" ? "/asteroids" :
                 gameId === "pong" ? "/pong" :
                 gameId === "flappybird" ? "/flappybird" :
                 "/space-invaders";

      // For MVP we just navigate to asteroids with the seed
      router.push({
          pathname: path as any,
          params: { seed: seed.toString(), isDaily: "true" }
      } as any);
  };

  return (
    <SafeAreaProvider>
      <View style={styles.menuContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title} accessibilityRole="header">{t.menu.title}</Text>

          <View style={styles.headerRow}>
            {profile && (
              <TouchableOpacity
                style={styles.profileSummary}
                activeOpacity={0.8}
                onPress={() => {
                  hapticSelection();
                  setShowPassport(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${t?.accessibility?.profile_summary || "Player profile passport"}. ${profile.displayName}, ${t.menu.level} ${profile.level}`}
                accessibilityHint={t?.accessibility?.profile_summary_hint || "Opens your arcade achievements and stats"}
              >
                <Text style={styles.profileText}>{profile.displayName} - {t.menu.level} {profile.level}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.muteButton}
              activeOpacity={0.8}
              onPress={toggleMute}
              accessibilityRole="button"
              accessibilityLabel={isMuted ? (t?.accessibility?.mute_button_off || "Unmute audio") : (t?.accessibility?.mute_button_on || "Mute audio")}
              accessibilityState={{ checked: !isMuted }}
              accessibilityHint={t?.accessibility?.mute_button_hint || "Toggles audio sound"}
            >
              <SoundIcon size={20} color={COLORS.info} muted={isMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.langButton}
              activeOpacity={0.8}
              onPress={() => {
                hapticSelection();
                toggleLanguage();
              }}
              accessibilityRole="button"
              accessibilityLabel={t?.accessibility?.language_button || "Change language"}
              accessibilityHint={t?.accessibility?.language_button_hint || "Toggles language between English and Spanish"}
            >
              <Text style={styles.langButtonText}>{locale.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {GAMES.map((game) => (
            <View key={game.id} style={styles.menuRow}>
              <TouchableOpacity
                style={styles.menuButton}
                activeOpacity={0.8}
                onPress={() => {
                  hapticSelection();
                  router.push(game.href as any);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${t.menu[game.key]}`}
                accessibilityHint={`Launches the ${t.menu[game.key]} game start screen`}
              >
                <Text style={styles.menuButtonText}>{t.menu[game.key]}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rankButton}
                activeOpacity={0.8}
                onPress={() => {
                  hapticSelection();
                  setShowLeaderboard(game.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={(t?.accessibility?.leaderboard_button || "View leaderboard for {game}").replace("{game}", t.menu[game.key])}
                accessibilityHint={t?.accessibility?.leaderboard_button_hint || "Opens the daily ranking of scores"}
              >
                <TrophyIcon size={22} color={COLORS.warning} />
              </TouchableOpacity>
            </View>
          ))}

          <DailyChallengeCard onPlay={handlePlayDaily} />

          <View style={{ height: 50 }} />
        </ScrollView>

        {showPassport && profile && (
          <PassportOverlay
            profile={profile}
            onClose={() => {
                hapticSelection();
                setShowPassport(false);
                PlayerProfileService.getProfile().then(setProfile);
            }}
          />
        )}

        {showLeaderboard && (
          <LeaderboardOverlay
            gameId={showLeaderboard}
            onClose={() => {
                hapticSelection();
                setShowLeaderboard(null);
            }}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxxl,
  },
  title: {
    fontSize: typography.sizes.title,
    color: colors.white,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xl,
    textAlign: "center",
    ...neonTextGlow(colors.cyan, 16),
  },
  profileSummary: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileText: {
    color: colors.gold,
    fontFamily: typography.game,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  muteButton: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 24,
    marginLeft: spacing.sm,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  muteButtonText: {
    fontSize: typography.sizes.xl,
  },
  langButton: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 24,
    marginLeft: spacing.sm,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  langButtonText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  menuButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.cyan,
    paddingHorizontal: spacing.xxxxl,
    paddingVertical: spacing.lg,
    borderRadius: 8,
    width: 280,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    ...effects.cyanGlow,
  },
  rankButton: {
    marginLeft: spacing.sm,
    backgroundColor: colors.surface,
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankButtonText: {
    fontSize: typography.sizes.xxl,
  },
  menuButtonText: {
    color: colors.cyan,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
  },
});
