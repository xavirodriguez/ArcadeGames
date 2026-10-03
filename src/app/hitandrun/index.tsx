import { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { GestureActionButton } from "@/components/controls/GestureActionButton";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { useTranslation } from "@/hooks/useTranslation";
import { useHitAndRunGame } from "@/hooks/useHitAndRunGame";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { RadialBackground } from "@/components/RadialBackground";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { hapticSelection } from "@/utils/haptics";
import { colors, spacing, typography, effects } from "../../theme";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import {
  GameScreen,
  BackButton,
  GameTitle,
  GameInstructions,
  PlayerNameInput,
  HighScoreText,
  NeonButton,
} from "../../components/ui";
import { DEATH_FLOW_RESOURCE } from "../../games/hitandrun/systems/HitRunDeathFlowSystem";
import type { HitRunDeathFlowState } from "../../games/hitandrun/systems/HitRunDeathFlowSystem";

function HitAndRunContent() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [initialSeed, setInitialSeed] = useState<number | undefined>();

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

  const { game, gameState, isPaused, isReady, togglePause, highScore, restartWithSeed } =
    useHitAndRunGame(started, initialSeed);

  useEffect(() => {
    if (!game || !isReady) return;
    const id = setInterval(() => {
      const flow = game.getWorld().getResource(DEATH_FLOW_RESOURCE) as HitRunDeathFlowState | undefined;
      if (flow?.requestRestart) {
        flow.requestRestart = false;
        restartWithSeed?.();
      }
    }, 100);
    return () => clearInterval(id);
  }, [game, isReady, restartWithSeed]);

  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) return;

    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyP") {
        togglePause();
        return;
      }
      if (e.code === "KeyR") {
        restartWithSeed?.();
        return;
      }
      // Prevent page scroll on arrows / space while playing
      if (
        e.code === "ArrowUp" ||
        e.code === "ArrowDown" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowRight" ||
        e.code === "Space"
      ) {
        e.preventDefault();
      }
      activeKeys.add(e.code);
      updateInput();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyP" || e.code === "KeyR") return;
      activeKeys.delete(e.code);
      updateInput();
    };

    const handleBlur = () => {
      activeKeys.clear();
      updateInput();
    };

    const updateInput = () => {
      // ←→ / A D = move (+ horizontal aim). ↑↓ = aim only. Space / W = jump.
      const moveLeft = activeKeys.has("ArrowLeft") || activeKeys.has("KeyA");
      const moveRight = activeKeys.has("ArrowRight") || activeKeys.has("KeyD");
      const jump = activeKeys.has("Space") || activeKeys.has("KeyW");
      const aimUp = activeKeys.has("ArrowUp");
      const aimDown = activeKeys.has("ArrowDown") || activeKeys.has("KeyS");
      const pulse =
        activeKeys.has("KeyF") ||
        activeKeys.has("KeyJ") ||
        activeKeys.has("KeyE") ||
        activeKeys.has("ShiftLeft");
      const attack =
        activeKeys.has("KeyC") ||
        activeKeys.has("KeyX") ||
        activeKeys.has("KeyK") ||
        activeKeys.has("ControlLeft") ||
        activeKeys.has("ControlRight");

      game.setInputState({
        moveLeft,
        moveRight,
        jump,
        pulse,
        attack,
        aimUp,
        aimDown
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
  }, [game, isReady, togglePause, restartWithSeed]);

  const handleTouchLeft = (pressed: boolean) => game?.setInputState({ moveLeft: pressed });
  const handleTouchRight = (pressed: boolean) => game?.setInputState({ moveRight: pressed });
  const handleTouchJump = (pressed: boolean) => game?.setInputState({ jump: pressed });
  const handleTouchPulse = () => {
    game?.setInputState({ pulse: true });
    setTimeout(() => game?.setInputState({ pulse: false }), 50);
  };
  const handleTouchFire = (pressed: boolean) => game?.setInputState({ attack: pressed });
  const handleTouchAimUp = (pressed: boolean) => game?.setInputState({ aimUp: pressed });
  const handleTouchAimDown = (pressed: boolean) => game?.setInputState({ aimDown: pressed });

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
        <GameTitle glowColor={colors.pink}>HIT & RUN</GameTitle>
        <PlayerNameInput
          label={t.accessibility.player_name_label}
          value={playerName}
          onChangeText={handlePlayerNameChange}
          placeholder={t.common.your_name}
        />
        <GameInstructions>
          {Platform.OS === "web"
            ? "←→/AD move · ↑↓ aim · Space jump · F melee · C/X fire · R restart"
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
        >
          START RUN
        </NeonButton>
      </GameScreen>
    );
  }

  if (!game || !isReady) {
    return (
      <View style={sharedScreenStyles.container}>
        <RadialBackground />
        <ActivityIndicator size="large" color={colors.cyan} />
        <Text style={styles.loadingText}>{t.echorunner.syncing_files}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={sharedScreenStyles.container}>
        <RadialBackground />
        <BackButton label={t.common.menu} />
        <View style={styles.hudContainer}>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>{t.echorunner.attempts}</Text>
            <Text style={styles.hudValue}>{gameState.attempts.toString().padStart(2, "0")}</Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>HP</Text>
            <Text style={[styles.hudValue, styles.pinkGlow]}>
              {gameState.health ?? 3}/{gameState.maxHealth ?? 3}
            </Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>{t.echorunner.fragments}</Text>
            <Text style={[styles.hudValue, styles.violetGlow]}>◆ {gameState.fragments}</Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>{t.echorunner.chrono}</Text>
            <Text style={styles.hudValue}>{formatTime(gameState.elapsedTime)}</Text>
          </View>
        </View>

        <CanvasRenderer
          world={game.getWorld()}
          gameLoop={game.getGameLoop()}
          onInitialize={(renderer) => game.initializeRenderer(renderer)}
        />

        {isTouchDevice && (
          <View style={styles.touchControlsContainer} pointerEvents="box-none">
            <View style={styles.dpad} pointerEvents="box-none">
              <GestureActionButton
                label="◀"
                size={60}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.borderLight}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => handleTouchLeft(true)}
                onPressOut={() => handleTouchLeft(false)}
                accessibilityLabel="Move left"
                style={{ marginHorizontal: spacing.sm }}
              />
              <GestureActionButton
                label="▶"
                size={60}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.borderLight}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => handleTouchRight(true)}
                onPressOut={() => handleTouchRight(false)}
                accessibilityLabel="Move right"
                style={{ marginHorizontal: spacing.sm }}
              />
              <GestureActionButton
                label="▲"
                size={52}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.gold}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => handleTouchAimUp(true)}
                onPressOut={() => handleTouchAimUp(false)}
                accessibilityLabel="Aim up"
                style={{ marginHorizontal: spacing.sm }}
              />
              <GestureActionButton
                label="▼"
                size={52}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.gold}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => handleTouchAimDown(true)}
                onPressOut={() => handleTouchAimDown(false)}
                accessibilityLabel="Aim down"
                style={{ marginHorizontal: spacing.sm }}
              />
            </View>
            <View style={styles.actions} pointerEvents="box-none">
              <GestureActionButton
                label="MELEE"
                size={64}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.pink}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => handleTouchPulse()}
                onPressOut={() => {}}
                accessibilityLabel="Melee"
                style={{ marginHorizontal: spacing.sm }}
              />
              <GestureActionButton
                label="FIRE"
                size={72}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.gold}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => handleTouchFire(true)}
                onPressOut={() => handleTouchFire(false)}
                accessibilityLabel="Hold to fire"
                style={{ marginHorizontal: spacing.sm }}
              />
              <GestureActionButton
                label="JUMP"
                size={70}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.cyan}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => handleTouchJump(true)}
                onPressOut={() => handleTouchJump(false)}
                accessibilityLabel="Jump"
                style={{ marginHorizontal: spacing.sm }}
              />
            </View>
          </View>
        )}

        {gameState.isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverTitle}>RUN COMPLETE</Text>
            <Text style={styles.gameOverSubtitle}>Core secured</Text>
            <Text style={styles.gameOverStat}>Score: {gameState.score}</Text>
            <Text style={styles.gameOverStat}>{t.echorunner.deaths}: {gameState.deaths}</Text>
            <Text style={styles.gameOverStat}>{t.echorunner.elapsed_time}: {formatTime(gameState.elapsedTime)}</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                hapticSelection();
                restartWithSeed?.();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.menuButtonText}>AGAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuButton, { marginTop: spacing.md, borderColor: colors.cyan }]}
              onPress={() => {
                hapticSelection();
                router.replace("/");
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.menuButtonText, { color: colors.cyan }]}>{t.common.menu}</Text>
            </TouchableOpacity>
          </View>
        )}

        <DebugOverlay game={game} />
      </View>
    </SafeAreaProvider>
  );
}

export default function HitAndRunScreen() {
  return (
    <GameErrorBoundary gameId="hitandrun">
      <HitAndRunContent />
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
  hudItem: { alignItems: "center" },
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
  violetGlow: { color: colors.violet, textShadowColor: colors.violet },
  pinkGlow: { color: colors.pink, textShadowColor: colors.pink },
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
  dpad: { flexDirection: "row", flexWrap: "wrap", maxWidth: 280 },
  actions: { flexDirection: "row", alignItems: "flex-end" },
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
  },
});
