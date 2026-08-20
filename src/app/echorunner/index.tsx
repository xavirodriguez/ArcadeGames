import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
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
import {
  GameScreen,
  BackButton,
  GameTitle,
  GameInstructions,
  PlayerNameInput,
  HighScoreText,
  NeonButton,
} from "../../components/ui";

function EchoRunnerContent() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
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

  const { game, gameState, handleInput, isPaused, isReady, togglePause, highScore, seed, restartWithSeed } =
    useEchoRunnerGame(started, initialSeed);

  // Keyboard controls for Web platforms (customized to map pulse attack correctly)
  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) return;

    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      activeKeys.add(e.code);
      updateInput();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.code);
      updateInput();
    };

    const updateInput = () => {
      const moveLeft = activeKeys.has("ArrowLeft") || activeKeys.has("KeyA");
      const moveRight = activeKeys.has("ArrowRight") || activeKeys.has("KeyD");
      const jump = activeKeys.has("ArrowUp") || activeKeys.has("KeyW") || activeKeys.has("Space");
      const pulse = activeKeys.has("KeyF") || activeKeys.has("KeyJ") || activeKeys.has("KeyE");

      game.setInputState({
        moveLeft,
        moveRight,
        jump,
        pulse
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [game, isReady]);

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
    // Clear trigger after 50ms
    setTimeout(() => game?.setInputState({ pulse: false }), 50);
  };

  // Helper to format elapsed time
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
      <View style={sharedScreenStyles.container}>
        <RadialBackground />

        {/* Back to menu */}
        <BackButton label={t.common.menu} />

        {/* Gorgeous Neon HUD */}
        <View style={styles.hudContainer}>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>{t.echorunner.attempts}</Text>
            <Text style={styles.hudValue}>{gameState.attempts.toString().padStart(2, "0")}</Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>{t.echorunner.fragments}</Text>
            <Text style={[styles.hudValue, styles.violetGlow]}>◆ {gameState.fragments}</Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>{t.echorunner.cores}</Text>
            <Text style={[styles.hudValue, styles.goldGlow]}>◉ {gameState.cores}</Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>{t.echorunner.chrono}</Text>
            <Text style={styles.hudValue}>{formatTime(gameState.elapsedTime)}</Text>
          </View>
        </View>

        {/* Canvas Renderer */}
        <CanvasRenderer
          world={game.getWorld()}
          gameLoop={game.getGameLoop()}
          onInitialize={(renderer) => game.initializeRenderer(renderer)}
        />

        {/* Virtual controls for touch devices */}
        {isTouchDevice && (
          <View style={styles.touchControlsContainer} pointerEvents="box-none">
            {/* Left D-Pad */}
            <View style={styles.dpad} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.touchButton}
                onPressIn={() => {
                  hapticSelection();
                  handleTouchLeft(true);
                }}
                onPressOut={() => handleTouchLeft(false)}
                accessibilityRole="button"
                accessibilityLabel="Mover izquierda"
              >
                <Text style={styles.touchButtonText}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.touchButton}
                onPressIn={() => {
                  hapticSelection();
                  handleTouchRight(true);
                }}
                onPressOut={() => handleTouchRight(false)}
                accessibilityRole="button"
                accessibilityLabel="Mover derecha"
              >
                <Text style={styles.touchButtonText}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Right Action buttons */}
            <View style={styles.actions} pointerEvents="box-none">
              <TouchableOpacity
                style={[styles.touchButton, styles.pulseButton]}
                onPressIn={() => {
                  hapticSelection();
                  handleTouchPulse();
                }}
                accessibilityRole="button"
                accessibilityLabel="Ataque de pulso"
              >
                <Text style={styles.touchButtonText}>PULSE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.touchButton, styles.jumpButton]}
                onPressIn={() => {
                  hapticSelection();
                  handleTouchJump(true);
                }}
                onPressOut={() => handleTouchJump(false)}
                accessibilityRole="button"
                accessibilityLabel="Saltar"
              >
                <Text style={styles.touchButtonText}>JUMP</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Level Complete / Game Over Screen */}
        {gameState.isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverTitle}>{t.echorunner.archive_restored}</Text>
            <Text style={styles.gameOverSubtitle}>{t.echorunner.archive_restored_sub}</Text>
            <Text style={styles.gameOverStat}>{t.echorunner.total_attempts}: {gameState.attempts}</Text>
            <Text style={styles.gameOverStat}>{t.echorunner.deaths}: {gameState.deaths}</Text>
            <Text style={styles.gameOverStat}>{t.echorunner.elapsed_time}: {formatTime(gameState.elapsedTime)}</Text>

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
        )}
      </View>
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
  hudContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(10, 10, 20, 0.75)",
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
    zIndex: 10,
  },
  hudItem: {
    alignItems: "center",
  },
  hudLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: typography.game,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  hudValue: {
    color: colors.cyan,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
    textShadowColor: colors.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  violetGlow: {
    color: colors.violet,
    textShadowColor: colors.violet,
  },
  goldGlow: {
    color: colors.gold,
    textShadowColor: colors.gold,
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
  touchButton: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    width: 65,
    height: 65,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: spacing.sm,
  },
  touchButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
  },
  jumpButton: {
    borderColor: colors.cyan,
    width: 75,
    height: 75,
  },
  pulseButton: {
    borderColor: colors.pink,
    width: 70,
    height: 70,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 20, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    padding: spacing.xxxl,
  },
  gameOverTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.cyan,
    fontFamily: typography.game,
    textShadowColor: colors.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
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
    color: colors.white,
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
    ...effects.pinkGlow,
  },
  menuButtonText: {
    color: colors.pink,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
  }
});
