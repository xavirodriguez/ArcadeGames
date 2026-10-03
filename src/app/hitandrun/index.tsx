import { useState, useEffect, useRef } from "react";
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
import { colors, spacing, typography } from "../../theme";
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

function pushBeltInput(
  game: { setInputState: (p: Record<string, boolean>) => void },
  keys: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
    attack: boolean;
    fire: boolean;
    special: boolean;
  }
) {
  game.setInputState({
    left: keys.left,
    right: keys.right,
    up: keys.up,
    down: keys.down,
    jump: keys.jump,
    attack: keys.attack,
    fire: keys.fire,
    special: keys.special,
    moveLeft: keys.left,
    moveRight: keys.right,
  });
}

function HitAndRunContent() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [initialSeed, setInitialSeed] = useState<number | undefined>();
  const touchHeld = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    attack: false,
    fire: false,
    special: false,
  });

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

  const { game, gameState, isReady, togglePause, highScore, restartWithSeed } =
    useHitAndRunGame(started, initialSeed);

  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) return;

    const activeKeys = new Set<string>();

    const updateInput = () => {
      pushBeltInput(game, {
        left: activeKeys.has("ArrowLeft") || activeKeys.has("KeyA"),
        right: activeKeys.has("ArrowRight") || activeKeys.has("KeyD"),
        up: activeKeys.has("ArrowUp") || activeKeys.has("KeyW"),
        down: activeKeys.has("ArrowDown") || activeKeys.has("KeyS"),
        jump: activeKeys.has("Space"),
        attack:
          activeKeys.has("KeyJ") ||
          activeKeys.has("KeyF") ||
          activeKeys.has("KeyE") ||
          activeKeys.has("ShiftLeft"),
        fire:
          activeKeys.has("KeyK") ||
          activeKeys.has("KeyC") ||
          activeKeys.has("KeyX") ||
          activeKeys.has("ControlLeft") ||
          activeKeys.has("ControlRight"),
        special: activeKeys.has("KeyI") || activeKeys.has("KeyQ"),
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyP") {
        togglePause();
        return;
      }
      if (e.code === "KeyR") {
        restartWithSeed?.();
        return;
      }
      if (e.code.startsWith("Arrow") || e.code === "Space") {
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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [game, isReady, togglePause, restartWithSeed]);

  const pushTouch = (partial: Partial<typeof touchHeld.current>) => {
    if (!game) return;
    Object.assign(touchHeld.current, partial);
    pushBeltInput(game, { ...touchHeld.current });
  };

  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    const ms = Math.floor((timeInSecs % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms
      .toString()
      .padStart(2, "0")}`;
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
            ? "\u2190\u2192/AD move \u00b7 \u2191\u2193 depth \u00b7 Space hop \u00b7 J/F melee \u00b7 K/C fire \u00b7 I special \u00b7 R restart"
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
            <Text style={styles.hudLabel}>HP</Text>
            <Text style={[styles.hudValue, styles.pinkGlow]}>
              {gameState.health ?? 5}/{gameState.maxHealth ?? 5}
            </Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>SCORE</Text>
            <Text style={styles.hudValue}>{gameState.score}</Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>TIME</Text>
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
                label="\u25C0"
                size={60}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.borderLight}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => pushTouch({ left: true })}
                onPressOut={() => pushTouch({ left: false })}
                accessibilityLabel="Move left"
              />
              <GestureActionButton
                label="\u25B6"
                size={60}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.borderLight}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => pushTouch({ right: true })}
                onPressOut={() => pushTouch({ right: false })}
                accessibilityLabel="Move right"
              />
              <GestureActionButton
                label="\u25B2"
                size={52}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.gold}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => pushTouch({ up: true })}
                onPressOut={() => pushTouch({ up: false })}
                accessibilityLabel="Move up"
              />
              <GestureActionButton
                label="\u25BC"
                size={52}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.gold}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => pushTouch({ down: true })}
                onPressOut={() => pushTouch({ down: false })}
                accessibilityLabel="Move down"
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
                onPressIn={() => {
                  pushTouch({ attack: true });
                  setTimeout(() => pushTouch({ attack: false }), 80);
                }}
                onPressOut={() => {}}
                accessibilityLabel="Melee"
              />
              <GestureActionButton
                label="FIRE"
                size={72}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.gold}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => pushTouch({ fire: true })}
                onPressOut={() => pushTouch({ fire: false })}
                accessibilityLabel="Hold to fire"
              />
              <GestureActionButton
                label="HOP"
                size={70}
                color="rgba(30, 41, 59, 0.7)"
                borderColor={colors.cyan}
                pressedColor="rgba(30, 41, 59, 0.9)"
                pressedBorderColor={colors.white}
                onPressIn={() => pushTouch({ jump: true })}
                onPressOut={() => pushTouch({ jump: false })}
                accessibilityLabel="Hop"
              />
            </View>
          </View>
        )}

        {gameState.isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverTitle}>RUN COMPLETE</Text>
            <Text style={styles.gameOverStat}>Score: {gameState.score}</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                hapticSelection();
                restartWithSeed?.();
              }}
            >
              <Text style={styles.menuButtonText}>AGAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuButton, { marginTop: spacing.md, borderColor: colors.cyan }]}
              onPress={() => {
                hapticSelection();
                router.replace("/");
              }}
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
  },
  pinkGlow: { color: colors.pink },
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
    marginBottom: spacing.sm,
  },
  gameOverStat: {
    color: colors.white,
    fontFamily: typography.game,
    marginBottom: spacing.sm,
  },
  menuButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.pink,
    borderRadius: 8,
  },
  menuButtonText: {
    color: colors.pink,
    fontFamily: typography.game,
    fontWeight: typography.weights.bold,
  },
});
