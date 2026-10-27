import { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { TouchActionButton, TouchHoldButton } from "@/components/controls";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { useTranslation } from "@/hooks/useTranslation";
import { useEchoRunnerGame } from "@/hooks/useEchoRunnerGame";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { RadialBackground } from "@/components/RadialBackground";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { hapticSelection } from "@/utils/haptics";
import { colors, spacing, typography, effects } from "../../theme";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { EchoRunnerSkinId } from "@/games/echorunner/rendering/EchoRunnerPalette";
import {
  GameScreen,
  BackButton,
  GameTitle,
  GameInstructions,
  PlayerNameInput,
  HighScoreText,
  NeonButton,
  GameLayoutShell,
} from "../../components/ui";
import { neonTextGlow } from "../../theme/effects";

interface SkinUIStyle {
  hudBg: string;
  hudBorder: string;
  hudTextLabel: string;
  hudValue: string;
  touchControlColor: string;
  touchControlPressedColor: string;
  touchControlBorderColor: string;
  gameOverBg: string;
  gameOverTitle: string;
  gameOverText: string;
}

const SKIN_UI_STYLES: Record<EchoRunnerSkinId, SkinUIStyle> = {
  dark: {
    hudBg: "rgba(10, 10, 20, 0.75)",
    hudBorder: colors.borderDark,
    hudTextLabel: colors.textMuted,
    hudValue: colors.cyan,
    touchControlColor: "rgba(30, 41, 59, 0.7)",
    touchControlPressedColor: "rgba(30, 41, 59, 0.9)",
    touchControlBorderColor: colors.borderLight,
    gameOverBg: "rgba(10, 10, 20, 0.95)",
    gameOverTitle: colors.cyan,
    gameOverText: colors.white
  },
  light: {
    hudBg: "rgba(241, 245, 249, 0.88)",
    hudBorder: "#94a3b8",
    hudTextLabel: "#475569",
    hudValue: "#0284c7",
    touchControlColor: "rgba(226, 232, 240, 0.88)",
    touchControlPressedColor: "rgba(203, 213, 225, 0.95)",
    touchControlBorderColor: "#64748b",
    gameOverBg: "rgba(241, 245, 249, 0.95)",
    gameOverTitle: "#0284c7",
    gameOverText: "#0f172a"
  },
  sunset: {
    hudBg: "rgba(253, 246, 227, 0.88)",
    hudBorder: "#d97706",
    hudTextLabel: "#78350f",
    hudValue: "#e11d48",
    touchControlColor: "rgba(254, 243, 199, 0.88)",
    touchControlPressedColor: "rgba(253, 230, 138, 0.95)",
    touchControlBorderColor: "#b45309",
    gameOverBg: "rgba(253, 246, 227, 0.95)",
    gameOverTitle: "#e11d48",
    gameOverText: "#451a03"
  }
};

const SKINS_CONFIG: { id: EchoRunnerSkinId; previewColors: [string, string, string] }[] = [
  { id: "dark", previewColors: ["#060913", "#1e293b", "#00f0ff"] },
  { id: "light", previewColors: ["#f1f5f9", "#e2e8f0", "#0284c7"] },
  { id: "sunset", previewColors: ["#fdf6e3", "#fef3c7", "#e11d48"] },
];

function EchoRunnerContent() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState<EchoRunnerSkinId>("dark");
  const [playerName, setPlayerName] = useState("");
  const [initialSeed, setInitialSeed] = useState<number | undefined>();

  // Sync player name from profile
  useEffect(() => {
    PlayerProfileService.getProfile().then((p) => {
      setPlayerName(p.displayName);
    });
  }, []);

  const handlePlayerNameChange = (name: string) => {
    setPlayerName(name);
    PlayerProfileService.updateDisplayName(name);
  };
  const isTouchDevice = useTouchDevice();

  const { game, gameState, isReady, togglePause, highScore } =
    useEchoRunnerGame(started, initialSeed, selectedSkin);

  const activeUiStyle = SKIN_UI_STYLES[selectedSkin];

  // Keyboard controls for Web platforms (mapping move, jump, and pulse attack)
  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) return;

    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyP") {
        togglePause();
        return;
      }
      activeKeys.add(e.code);
      updateInput();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyP") return;
      activeKeys.delete(e.code);
      updateInput();
    };

    const handleBlur = () => {
      activeKeys.clear();
      updateInput();
    };

    const updateInput = () => {
      const moveLeft = activeKeys.has("ArrowLeft") || activeKeys.has("KeyA");
      const moveRight = activeKeys.has("ArrowRight") || activeKeys.has("KeyD");
      const jump = activeKeys.has("ArrowUp") || activeKeys.has("KeyW") || activeKeys.has("Space");
      const pulse = activeKeys.has("KeyF") || activeKeys.has("KeyJ") || activeKeys.has("KeyE") || activeKeys.has("ShiftLeft");

      game.setInputState({
        moveLeft,
        moveRight,
        jump,
        pulse
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [game, isReady, togglePause]);

  // Touch handlers
  const handleTouchLeft = (pressed: boolean) => {
    game?.setInputState({ moveLeft: pressed });
  };

  const handleTouchRight = (pressed: boolean) => {
    game?.setInputState({ moveRight: pressed });
  };

  const handleTouchJump = (pressed: boolean) => {
    game?.setInputState({ jump: pressed });
  };

  const handleTouchPulse = () => {
    game?.setInputState({ pulse: true });
    setTimeout(() => game?.setInputState({ pulse: false }), 50);
  };

  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    const ms = Math.floor((timeInSecs % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  if (!started) {
    return (
      <GameScreen>
        <BackButton label={t.common.menu} />

        <GameTitle glowColor={colors.pink}>ECHO // RUNNER</GameTitle>

        <PlayerNameInput
          label={t.accessibility.player_name_label}
          value={playerName}
          onChangeText={handlePlayerNameChange}
          placeholder={t.common.your_name}
        />

        <GameInstructions>
          {Platform.OS === "web"
            ? t.echorunner.instructions
            : t.common.touch_controls}
        </GameInstructions>

        <View style={styles.skinSection}>
          <Text style={styles.skinSectionTitle}>{t.echorunner.skin_select}</Text>
          <View style={styles.skinsRow}>
            {SKINS_CONFIG.map((s) => {
              const isSelected = selectedSkin === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.skinCard,
                    isSelected && styles.skinCardSelected
                  ]}
                  onPress={() => {
                    hapticSelection();
                    setSelectedSkin(s.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t.echorunner.skins[s.id]}
                  accessibilityHint="Selecciona esta apariencia visual"
                >
                  <View style={styles.swatchContainer}>
                    {s.previewColors.map((c, idx) => (
                      <View key={idx} style={[styles.swatchCircle, { backgroundColor: c }]} />
                    ))}
                  </View>
                  <Text style={[styles.skinCardLabel, isSelected && styles.skinCardLabelSelected]}>
                    {t.echorunner.skins[s.id]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <HighScoreText label={t.common.record} score={highScore} />

        <NeonButton
          variant="pink"
          onPress={() => {
            hapticSelection();
            setStarted(true);
          }}
          accessibilityLabel={t.echorunner.start_file}
          accessibilityHint="Inicia una nueva simulación de Echo Runner"
        >
          {t.echorunner.start_file}
        </NeonButton>
      </GameScreen>
    );
  }

  if (!game || !isReady) {
    return (
      <View style={sharedScreenStyles.container}>
        <RadialBackground />
        <ActivityIndicator size="large" color={colors.cyan} />
        <Text style={styles.loadingText}>
          {t.echorunner.syncing_files}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GameLayoutShell
        style={sharedScreenStyles.container}
        backgroundSlot={<RadialBackground />}
        topLeftSlot={<BackButton label={t.common.menu} />}
        centerHudSlot={
          <View style={[styles.hudContainer, { backgroundColor: activeUiStyle.hudBg, borderColor: activeUiStyle.hudBorder }]}>
            <View style={styles.hudItem}>
              <Text style={[styles.hudLabel, { color: activeUiStyle.hudTextLabel }]}>{t.echorunner.attempts}</Text>
              <Text style={[styles.hudValue, { color: activeUiStyle.hudValue, ...neonTextGlow(activeUiStyle.hudValue, 4) }]}>
                {gameState.attempts.toString().padStart(2, "0")}
              </Text>
            </View>
            <View style={styles.hudItem}>
              <Text style={[styles.hudLabel, { color: activeUiStyle.hudTextLabel }]}>{t.echorunner.fragments}</Text>
              <Text style={[styles.hudValue, styles.violetGlow]}>◆ {gameState.fragments}</Text>
            </View>
            <View style={styles.hudItem}>
              <Text style={[styles.hudLabel, { color: activeUiStyle.hudTextLabel }]}>{t.echorunner.cores}</Text>
              <Text style={[styles.hudValue, styles.goldGlow]}>◉ {gameState.cores}</Text>
            </View>
            <View style={styles.hudItem}>
              <Text style={[styles.hudLabel, { color: activeUiStyle.hudTextLabel }]}>{t.echorunner.chrono}</Text>
              <Text style={[styles.hudValue, { color: activeUiStyle.hudValue, ...neonTextGlow(activeUiStyle.hudValue, 4) }]}>
                {formatTime(gameState.elapsedTime)}
              </Text>
            </View>
          </View>
        }
        canvasSlot={
          <CanvasRenderer
            world={game.getWorld()}
            gameLoop={game.getGameLoop()}
            onInitialize={(renderer) => game.initializeRenderer(renderer)}
          />
        }
        controlsSlot={
          isTouchDevice ? (
            <View style={styles.touchControlsContainer} pointerEvents="box-none">
              {/* Left D-Pad */}
              <View style={styles.dpad} pointerEvents="box-none">
                <TouchHoldButton
                  label="◀"
                  size={65}
                  color={activeUiStyle.touchControlColor}
                  borderColor={activeUiStyle.touchControlBorderColor}
                  pressedColor={activeUiStyle.touchControlPressedColor}
                  onHoldStart={() => handleTouchLeft(true)}
                  onHoldEnd={() => handleTouchLeft(false)}
                  accessibilityLabel={t?.accessibility?.move_left_label || "Move left"}
                  accessibilityHint={t?.accessibility?.move_left_hint || "Moves runner to the left"}
                  style={{ marginHorizontal: spacing.sm }}
                />
                <TouchHoldButton
                  label="▶"
                  size={65}
                  color={activeUiStyle.touchControlColor}
                  borderColor={activeUiStyle.touchControlBorderColor}
                  pressedColor={activeUiStyle.touchControlPressedColor}
                  onHoldStart={() => handleTouchRight(true)}
                  onHoldEnd={() => handleTouchRight(false)}
                  accessibilityLabel={t?.accessibility?.move_right_label || "Move right"}
                  accessibilityHint={t?.accessibility?.move_right_hint || "Moves runner to the right"}
                  style={{ marginHorizontal: spacing.sm }}
                />
              </View>

              {/* Right Action buttons */}
              <View style={styles.actions} pointerEvents="box-none">
                <TouchActionButton
                  label="PULSE"
                  size={70}
                  color={activeUiStyle.touchControlColor}
                  borderColor={colors.pink}
                  pressedColor={activeUiStyle.touchControlPressedColor}
                  pressedBorderColor={colors.white}
                  onPressIn={() => handleTouchPulse()}
                  onPressOut={() => {}}
                  accessibilityLabel={t?.accessibility?.pulse_button_label || "Pulse wave attack"}
                  accessibilityHint={t?.accessibility?.pulse_button_hint || "Emits an acoustic pulse wave"}
                  style={{ marginHorizontal: spacing.sm }}
                />
                <TouchActionButton
                  label="JUMP"
                  size={75}
                  color={activeUiStyle.touchControlColor}
                  borderColor={colors.cyan}
                  pressedColor={activeUiStyle.touchControlPressedColor}
                  pressedBorderColor={colors.white}
                  onPressIn={() => handleTouchJump(true)}
                  onPressOut={() => handleTouchJump(false)}
                  accessibilityLabel={t?.accessibility?.jump_button_label || "Jump"}
                  accessibilityHint={t?.accessibility?.jump_button_hint || "Jumps over obstacles"}
                  style={{ marginHorizontal: spacing.sm }}
                />
              </View>
            </View>
          ) : undefined
        }
        debugSlot={<DebugOverlay game={game} />}
        overlaySlot={
          gameState.isGameOver ? (
            <View style={[styles.gameOverOverlay, { backgroundColor: activeUiStyle.gameOverBg }]}>
              <Text style={[styles.gameOverTitle, { color: activeUiStyle.gameOverTitle, ...neonTextGlow(activeUiStyle.gameOverTitle, 15) }]}>
                {t.echorunner.archive_restored}
              </Text>
              <Text style={styles.gameOverSubtitle}>{t.echorunner.archive_restored_sub}</Text>
              <Text style={[styles.gameOverStat, { color: activeUiStyle.gameOverText }]}>{t.echorunner.total_attempts}: {gameState.attempts}</Text>
              <Text style={[styles.gameOverStat, { color: activeUiStyle.gameOverText }]}>{t.echorunner.deaths}: {gameState.deaths}</Text>
              <Text style={[styles.gameOverStat, { color: activeUiStyle.gameOverText }]}>{t.echorunner.elapsed_time}: {formatTime(gameState.elapsedTime)}</Text>

              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => {
                  hapticSelection();
                  router.replace("/");
                }}
                accessibilityRole="button"
                accessibilityLabel={t.echorunner.return_repo}
                accessibilityHint="Regresa al menú principal del repositorio"
              >
                <Text style={styles.menuButtonText}>{t.echorunner.return_repo}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaProvider>
  );
}

export default function EchoRunnerScreen() {
  return (
    <GameErrorBoundary gameId="echorunner">
      <EchoRunnerContent />
    </GameErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    color: colors.white,
    marginTop: spacing.xl,
    fontFamily: typography.game,
    fontSize: typography.sizes.lg,
  },
  skinSection: {
    marginVertical: spacing.md,
    alignItems: "center",
    width: "100%",
  },
  skinSectionTitle: {
    color: colors.textMuted,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  skinsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  skinCard: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: "center",
    minWidth: 90,
  },
  skinCardSelected: {
    borderColor: colors.pink,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    ...effects.pinkGlow,
  },
  swatchContainer: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  swatchCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  skinCardLabel: {
    color: colors.textMuted,
    fontFamily: typography.game,
    fontSize: 9,
    textAlign: "center",
  },
  skinCardLabelSelected: {
    color: colors.pink,
    fontWeight: typography.weights.bold,
  },
  hudContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 10,
  },
  hudItem: {
    alignItems: "center",
  },
  hudLabel: {
    fontSize: 10,
    fontFamily: typography.game,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  hudValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
  },
  violetGlow: {
    color: colors.violet,
    ...neonTextGlow(colors.violet, 4),
  },
  goldGlow: {
    color: colors.gold,
    ...neonTextGlow(colors.gold, 4),
  },
  touchControlsContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 180,
    zIndex: 15,
  },
  dpad: {
    flexDirection: "row",
  },
  actions: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    padding: spacing.xxxl,
  },
  gameOverTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  gameOverSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontFamily: typography.game,
    textAlign: "center",
    marginBottom: spacing.xxxxl,
  },
  gameOverStat: {
    fontSize: typography.sizes.md,
    fontFamily: typography.game,
    marginBottom: spacing.md,
  },
  menuButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.pink,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: spacing.xxxxl,
    userSelect: "none",
    ...effects.pinkGlow,
  },
  menuButtonText: {
    color: colors.pink,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
    userSelect: "none",
  },
});
