import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { ComboDisplay } from "@/src/components/ComboDisplay";
import { GameErrorBoundary } from "@/src/components/GameErrorBoundary";
import { useGeometryWarsGame } from "@/src/hooks/useGeometryWarsGame";
import { useTranslation } from "@/src/hooks/useTranslation";
import { VirtualJoystick } from "@/src/components/controls/VirtualJoystick";
import { useMultiplayer } from "@tiny-aster/react-native";
import { useTouchDevice } from "@/src/hooks/useTouchDevice";
import { hapticSelection } from "@/src/utils/haptics";
import { sharedScreenStyles } from "@/src/styles/SharedGameScreenStyles";
import { colors, effects } from "../../theme";
import {
  GameScreen,
  GameTitle,
  GameInstructions,
  PlayerNameInput,
  HighScoreText,
  BackButton,
  NeonButton,
} from "../../components/ui";

export default function GeometryWarsScreen() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [isMulti, setIsMulti] = useState(false);
  const [playerName, setPlayerName] = useState("");

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
  const insets = useSafeAreaInsets();
  const isTouchDevice = useTouchDevice();

  const {
    game,
    gameState,
    handleInput,
    isPaused,
    isReady,
    togglePause,
    highScore,
    seed,
    restartWithSeed
  } = useGeometryWarsGame(started, isMulti && started);

  const { room, connected, serverState, sendInput, inputBufferRef } = useMultiplayer("geometrywars", playerName, isMulti && started);

  useEffect(() => {
    if (isMulti && connected && game) {
      game.setMultiplayerMode(true);
    }
  }, [isMulti, connected, game]);

  useEffect(() => {
    if (isMulti && serverState && game) {
        const sessionId = room?.sessionId;
        const pendingInputs = inputBufferRef.current;

        game.updateFromServer(serverState, sessionId);

        // Re-apply pending inputs for reconciliation
        if (sessionId && pendingInputs.length > 0) {
            pendingInputs.forEach(frame => {
                game.predictLocalPlayer(frame, 16.66);
            });
        }
    }
  }, [isMulti, serverState, game, room?.sessionId, inputBufferRef]);

  const handleMultiplayerInput = useCallback((input: Partial<{
    moveX: number;
    moveY: number;
    aimX: number;
    aimY: number;
    fire: boolean;
    mouseAbsolute?: boolean;
  }>) => {
    if (isMulti && room) {
      const frame = sendInput({
        actions: input.fire ? ["fire"] : [],
        axes: {
          moveX: input.moveX ?? 0,
          moveY: input.moveY ?? 0,
          aimX: input.aimX ?? 0,
          aimY: input.aimY ?? 0
        }
      });
      if (frame) {
        game?.predictLocalPlayer(frame, 16.66);
      }
    } else {
      game?.setInputState(input);
    }
  }, [isMulti, room, sendInput, game]);

  // 1. Keyboard Controls for Web (WASD / Arrows)
  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) return;

    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      activeKeys.add(e.code);
      updateMovement();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.code);
      updateMovement();
    };

    const updateMovement = () => {
      let moveX = 0;
      let moveY = 0;
      if (activeKeys.has("KeyA") || activeKeys.has("ArrowLeft")) moveX -= 1;
      if (activeKeys.has("KeyD") || activeKeys.has("ArrowRight")) moveX += 1;
      if (activeKeys.has("KeyW") || activeKeys.has("ArrowUp")) moveY -= 1;
      if (activeKeys.has("KeyS") || activeKeys.has("ArrowDown")) moveY += 1;

      handleMultiplayerInput({ moveX, moveY });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [game, isReady]);

  // 2. Mouse / Pointer Controls for Web (Absolute cursor aiming, click to shoot)
  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) return;

    const handlePointerMove = (e: PointerEvent) => {
      const canvas = document.querySelector("canvas");
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const aimX = (e.clientX - rect.left) * scaleX;
        const aimY = (e.clientY - rect.top) * scaleY;

        handleMultiplayerInput({ aimX, aimY, mouseAbsolute: true });
      }
    };

    const handlePointerDown = () => {
      handleMultiplayerInput({ fire: true });
    };

    const handlePointerUp = () => {
      handleMultiplayerInput({ fire: false });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [game, isReady]);

  if (!started) {
    return (
      <GameScreen>
        <BackButton label={t.common.menu} />

        <GameTitle glowColor={colors.cyan}>GEOMETRY WARS</GameTitle>

        <GameInstructions>
          {isTouchDevice
            ? "Left area touch: Move ship\nRight area touch: Aim & shoot"
            : "WASD / Arrows to Move\nMove Mouse to Aim\nLeft Click to Shoot"}
        </GameInstructions>

        <PlayerNameInput
          label={t.accessibility.player_name_label}
          value={playerName}
          onChangeText={handlePlayerNameChange}
          placeholder={t.common.your_name}
        />

        <HighScoreText label={t.common.record} score={highScore} />

        <View style={styles.buttonRow}>
          <NeonButton
            variant="cyan"
            bordered
            onPress={() => { hapticSelection(); setIsMulti(false); setStarted(true); }}
            accessibilityLabel={t.common.solo}
            accessibilityHint="Inicia una partida individual de Geometry Wars"
          >
            {t.common.solo}
          </NeonButton>

          <View style={{ width: 20 }} />

          <NeonButton
            variant="pink"
            bordered
            onPress={() => { hapticSelection(); setIsMulti(true); setStarted(true); }}
            accessibilityLabel={t.common.multi}
            accessibilityHint="Inicia una sesión multijugador en línea"
          >
            {t.common.multi || "Multiplayer"}
          </NeonButton>
        </View>
      </GameScreen>
    );
  }

  if (!game || !isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.cyan} />
        <Text style={styles.loadingText}>Loading ECS simulation...</Text>
      </View>
    );
  }

  return (
    <GameErrorBoundary gameId="geometrywars">
      <SafeAreaProvider>
        <View style={styles.container}>
          {/* Back button */}
          <BackButton label={t.common.menu} style={{ top: Math.max(insets.top, 20) }} />

          {isMulti && !connected && (
            <View style={styles.overlay}>
              <Text style={styles.loadingText}>{t.common.connecting || "Connecting to server..."}</Text>
            </View>
          )}

          {/* Pause Button */}
          {!gameState.isGameOver && (
            <TouchableOpacity
              style={[styles.pauseButton, { top: Math.max(insets.top, 20) }]}
              onPress={togglePause}
            >
              <Text style={styles.pauseButtonText}>{isPaused ? "▶" : "II"}</Text>
            </TouchableOpacity>
          )}

          {/* Neon Retro HUD */}
          <View style={[styles.hud, { paddingTop: Math.max(insets.top, 16) }]} pointerEvents="none">
            <View style={styles.hudLeft}>
              <Text style={styles.hudText}>LIVES: {gameState.lives}</Text>
              <Text style={styles.hudText}>BOMBS: {gameState.bombs}</Text>
            </View>
            <View style={styles.hudCenter}>
              <Text style={[styles.hudText, styles.scoreText]}>SCORE: {gameState.score}</Text>
              <Text style={styles.hudSubText}>HIGH SCORE: {highScore}</Text>
            </View>
            <View style={styles.hudRight}>
              <Text style={styles.hudText}>WAVE: {gameState.wave}</Text>
            </View>
          </View>

          {/* High consecutive hit combo display */}
          <ComboDisplay multiplier={gameState.multiplier || 1} isActive={true} />

          {/* Render canvas */}
          <CanvasRenderer
            world={game.getWorld()}
            gameLoop={game.getGameLoop()}
            onInitialize={(renderer) => game.initializeRenderer(renderer)}
          />

          {/* Touch sticks for mobile */}
          {(isTouchDevice || Platform.OS !== "web") && (
            <View style={styles.controls} pointerEvents="box-none">
              <View style={styles.leftControlArea} pointerEvents="box-none">
                <VirtualJoystick
                  joystickId="movement_joystick"
                  type="movement"
                  onMove={(x, y) => {
                    handleMultiplayerInput({ moveX: x, moveY: y });
                  }}
                  onRelease={() => {
                    handleMultiplayerInput({ moveX: 0, moveY: 0 });
                  }}
                />
              </View>
              <View style={styles.rightControlArea} pointerEvents="box-none">
                <VirtualJoystick
                  joystickId="aim_joystick"
                  type="rotation"
                  onMove={(x, y) => {
                    const mag = Math.sqrt(x * x + y * y);
                    const isFiring = mag > 0.2;
                    handleMultiplayerInput({ aimX: x, aimY: y, fire: isFiring });
                  }}
                  onRelease={() => {
                    handleMultiplayerInput({ fire: false });
                  }}
                />
              </View>
            </View>
          )}

          {/* Pause overlay */}
          {isPaused && !gameState.isGameOver && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>PAUSED</Text>
              <TouchableOpacity style={styles.overlayButton} onPress={togglePause}>
                <Text style={styles.overlayButtonText}>RESUME</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Game Over overlay */}
          {gameState.isGameOver && (
            <View style={styles.overlay}>
              <Text style={styles.gameOverTitle}>GAME OVER</Text>
              <Text style={styles.finalScoreText}>Final Score: {gameState.score}</Text>
              <Text style={styles.bestScoreText}>
                {gameState.score >= highScore ? "NEW RECORD!" : `Best: ${highScore}`}
              </Text>
              <TouchableOpacity
                style={[styles.overlayButton, { backgroundColor: colors.cyan }]}
                onPress={() => game.restart()}
              >
                <Text style={[styles.overlayButtonText, { color: colors.background }]}>RESTART</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: "relative",
  },
  pauseButton: {
    position: "absolute",
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.cyan,
    backgroundColor: "rgba(0, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 101,
  },
  pauseButtonText: {
    color: colors.cyan,
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.cyan,
    marginTop: 20,
    fontFamily: "monospace",
    fontSize: 18,
  },
  hud: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  hudLeft: {
    flex: 1,
    alignItems: "flex-start",
    paddingTop: 40,
  },
  hudCenter: {
    flex: 2,
    alignItems: "center",
  },
  hudRight: {
    flex: 1,
    alignItems: "flex-end",
    paddingTop: 40,
  },
  hudText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: "monospace",
    fontWeight: "bold",
    textShadowColor: colors.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  hudSubText: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 2,
  },
  scoreText: {
    color: colors.cyan,
    fontSize: 20,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 15,
  },
  leftControlArea: {
    flex: 1,
    height: "100%",
    position: "relative",
  },
  rightControlArea: {
    flex: 1,
    height: "100%",
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  overlayTitle: {
    fontSize: 48,
    color: colors.cyan,
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 40,
    textShadowColor: colors.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  gameOverTitle: {
    fontSize: 54,
    color: colors.pink,
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 20,
    textShadowColor: colors.pink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  finalScoreText: {
    fontSize: 24,
    color: colors.white,
    fontFamily: "monospace",
    marginBottom: 10,
  },
  bestScoreText: {
    fontSize: 18,
    color: colors.gold,
    fontFamily: "monospace",
    marginBottom: 40,
  },
  overlayButton: {
    borderWidth: 2,
    borderColor: colors.cyan,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    ...effects.cyanGlow,
  },
  overlayButtonText: {
    color: colors.cyan,
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});
