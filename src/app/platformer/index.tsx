import { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Pressable, Platform, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { useTranslation } from "@/hooks/useTranslation";
import { usePlatformerGame } from "@/hooks/usePlatformerGame";
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

function PlatformerContent() {
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

  const { game, gameState, handleInput, isPaused, isReady, togglePause, highScore, seed, restartWithSeed } =
    usePlatformerGame(started, initialSeed);

  // Keyboard controls for Web platforms
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

    const handleBlur = () => {
      activeKeys.clear();
      updateInput();
    };

    const updateInput = () => {
      const moveLeft = activeKeys.has("ArrowLeft") || activeKeys.has("KeyA");
      const moveRight = activeKeys.has("ArrowRight") || activeKeys.has("KeyD");
      const jump = activeKeys.has("ArrowUp") || activeKeys.has("KeyW") || activeKeys.has("Space");

      game.setInputState({
        moveLeft,
        moveRight,
        jump,
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

  if (!started) {
    return (
      <GameScreen>
        <BackButton label={t.common.menu} />

        <GameTitle glowColor={colors.cyan}>{t.menu.platformer || "PLATAFORMAS // 2D"}</GameTitle>

        <PlayerNameInput
          label={t.accessibility.player_name_label}
          value={playerName}
          onChangeText={handlePlayerNameChange}
          placeholder={t.common.your_name}
        />

        <GameInstructions>
          {Platform.OS === "web"
            ? (t.platformer?.instructions || "A/D o Flechas: Mover | W/Espacio/Flecha Arriba: Saltar")
            : t.common.touch_controls}
        </GameInstructions>

        <HighScoreText label={t.common.record} score={highScore} />

        <NeonButton
          variant="cyan"
          onPress={() => {
            hapticSelection();
            setStarted(true);
          }}
          accessibilityLabel={t.platformer?.start_run || "INICIAR NIVEL"}
          accessibilityHint="Inicia una nueva partida de Plataformas"
        >
          {t.platformer?.start_run || "INICIAR NIVEL"}
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
          {t.platformer?.syncing_level || "Cargando Nivel de Plataformas..."}
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

        {/* HUD */}
        <View style={styles.hudContainer}>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>{t.platformer?.score || "PUNTAJE"}</Text>
            <Text style={styles.hudValue}>{gameState.score}</Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>{t.platformer?.lives || "VIDAS"}</Text>
            <Text style={styles.hudValue}>{"❤️ ".repeat(Math.max(0, gameState.lives))}</Text>
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
              <Pressable
                style={({ pressed }) => [styles.touchButton, pressed && styles.touchButtonPressed]}
                onPressIn={() => {
                  hapticSelection();
                  handleTouchLeft(true);
                }}
                onPressOut={() => handleTouchLeft(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t?.accessibility?.move_left_label || "Move left"}
                accessibilityHint={t?.accessibility?.move_left_hint || "Moves player left"}
              >
                <Text style={styles.touchButtonText}>◀</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.touchButton, pressed && styles.touchButtonPressed]}
                onPressIn={() => {
                  hapticSelection();
                  handleTouchRight(true);
                }}
                onPressOut={() => handleTouchRight(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t?.accessibility?.move_right_label || "Move right"}
                accessibilityHint={t?.accessibility?.move_right_hint || "Moves player right"}
              >
                <Text style={styles.touchButtonText}>▶</Text>
              </Pressable>
            </View>

            {/* Right Action buttons */}
            <View style={styles.actions} pointerEvents="box-none">
              <Pressable
                style={({ pressed }) => [
                  styles.touchButton,
                  styles.jumpButton,
                  pressed && styles.touchButtonPressed,
                ]}
                onPressIn={() => {
                  hapticSelection();
                  handleTouchJump(true);
                }}
                onPressOut={() => handleTouchJump(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t?.accessibility?.jump_button_label || "Jump"}
                accessibilityHint={t?.accessibility?.jump_button_hint || "Jumps"}
              >
                <Text style={styles.touchButtonText}>JUMP</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Game Over Screen */}
        {gameState.isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverTitle}>{t.common.game_over}</Text>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                hapticSelection();
                router.replace("/");
              }}
              accessibilityRole="button"
              accessibilityLabel={t.common.menu}
              accessibilityHint="Regresa al menú principal"
            >
              <Text style={styles.menuButtonText}>{t.common.menu}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Real-time Debug Overlay */}
        <DebugOverlay game={game} />
      </View>
    </SafeAreaProvider>
  );
}

export default function PlatformerScreen() {
  return (
    <GameErrorBoundary gameId="platformer">
      <PlatformerContent />
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
  touchButtonPressed: {
    transform: [{ scale: 0.92 }],
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    borderColor: colors.white,
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
  menuButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.cyan,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: spacing.xxxxl,
    ...effects.cyanGlow,
  },
  menuButtonText: {
    color: colors.cyan,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontFamily: typography.game,
  }
});
