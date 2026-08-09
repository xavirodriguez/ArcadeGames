import React, { useState, useEffect, useRef, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { ComboDisplay } from "@/src/components/ComboDisplay";
import { GameErrorBoundary } from "@/src/components/GameErrorBoundary";
import { useGeometryWarsGame } from "@/src/hooks/useGeometryWarsGame";
import { useTranslation } from "@/src/hooks/useTranslation";
import { VirtualJoystick } from "@/src/components/controls/VirtualJoystick";
import { useMultiplayer } from "@tiny-aster/react-native";
import { useTouchDevice } from "@/src/hooks/useTouchDevice";

export default function GeometryWarsScreen() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [isMulti, setIsMulti] = useState(false);
  const [playerName, setPlayerName] = useState("Player");
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
      <SafeAreaProvider>
        <View style={styles.startScreen}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
          >
            <Text style={styles.backButtonText}>← {t.common.menu}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>GEOMETRY WARS</Text>

          <Text style={styles.instructions}>
            {isTouchDevice
              ? "Left area touch: Move ship\nRight area touch: Aim & shoot"
              : "WASD / Arrows to Move\nMove Mouse to Aim\nLeft Click to Shoot"}
          </Text>

          <TextInput
            style={styles.input}
            value={playerName}
            onChangeText={setPlayerName}
            placeholder={t.common.your_name || "Name"}
            placeholderTextColor="#AAAAAA"
          />

          <Text style={styles.highScoreText}>{t.common.record}: {highScore}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.startButton} onPress={() => { setIsMulti(false); setStarted(true); }}>
              <Text style={styles.startButtonText}>{t.common.solo}</Text>
            </TouchableOpacity>

            <View style={{ width: 20 }} />

            <TouchableOpacity style={styles.multiButton} onPress={() => { setIsMulti(true); setStarted(true); }}>
              <Text style={styles.multiButtonText}>{t.common.multi || "Multiplayer"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!game || !isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00FFFF" />
        <Text style={styles.loadingText}>Loading ECS simulation...</Text>
      </View>
    );
  }

  return (
    <GameErrorBoundary gameId="geometrywars">
      <SafeAreaProvider>
        <View style={styles.container}>
          {/* Back button */}
          <TouchableOpacity
            style={[styles.backButton, { top: Math.max(insets.top, 20) }]}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
          >
            <Text style={styles.backButtonText}>← {t.common.menu}</Text>
          </TouchableOpacity>

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
                style={[styles.overlayButton, { backgroundColor: "#00FFFF" }]}
                onPress={() => game.restart()}
              >
                <Text style={[styles.overlayButtonText, { color: "#000" }]}>RESTART</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "#00FFFF",
    color: "#FFFFFF",
    fontFamily: "monospace",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    width: 250,
    textAlign: "center",
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  multiButton: {
    borderWidth: 2,
    borderColor: "#FF00FF",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#FF00FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  multiButtonText: {
    color: "#FF00FF",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
  },
  startScreen: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  title: {
    fontSize: 48,
    color: "#00FFFF",
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
    textShadowColor: "rgba(0, 255, 255, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  instructions: {
    fontSize: 16,
    color: "#CCCCCC",
    fontFamily: "monospace",
    lineHeight: 24,
    marginBottom: 30,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  highScoreText: {
    fontSize: 20,
    color: "#FFD700",
    fontFamily: "monospace",
    marginBottom: 40,
    textShadowColor: "rgba(255, 215, 0, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  startButton: {
    borderWidth: 2,
    borderColor: "#00FFFF",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#00FFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  startButtonText: {
    color: "#00FFFF",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 100,
    padding: 10,
  },
  backButtonText: {
    color: "#AAAAAA",
    fontSize: 16,
    fontFamily: "monospace",
  },
  pauseButton: {
    position: "absolute",
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#00FFFF",
    backgroundColor: "rgba(0, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 101,
  },
  pauseButtonText: {
    color: "#00FFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#00FFFF",
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
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "monospace",
    fontWeight: "bold",
    textShadowColor: "rgba(0, 255, 255, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  hudSubText: {
    color: "#888888",
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 2,
  },
  scoreText: {
    color: "#00FFFF",
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
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  overlayTitle: {
    fontSize: 48,
    color: "#00FFFF",
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 40,
    textShadowColor: "rgba(0, 255, 255, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  gameOverTitle: {
    fontSize: 54,
    color: "#FF0055",
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 20,
    textShadowColor: "rgba(255, 0, 85, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  finalScoreText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontFamily: "monospace",
    marginBottom: 10,
  },
  bestScoreText: {
    fontSize: 18,
    color: "#FFD700",
    fontFamily: "monospace",
    marginBottom: 40,
  },
  overlayButton: {
    borderWidth: 2,
    borderColor: "#00FFFF",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#00FFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  overlayButtonText: {
    color: "#00FFFF",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});
