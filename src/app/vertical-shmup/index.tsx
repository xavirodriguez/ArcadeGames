import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useVerticalShmupGame } from "@/hooks/useVerticalShmupGame";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { TouchVirtualJoystick, TouchActionButton } from "@/components/controls";
import { TouchInputState } from "@tiny-aster/core";
import { GameLayoutShell, GameScreen, GameTitle, GameInstructions, BackButton, NeonButton } from "@/components/ui";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { hapticSelection } from "@/utils/haptics";

export default function VerticalShmupScreen() {
  const [started, setStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { game, gameState, handleInput, isReady } = useVerticalShmupGame(started);

  const touchStateRef = useRef<TouchInputState | null>(null);
  if (!touchStateRef.current) {
    touchStateRef.current = new TouchInputState();
  }

  useEffect(() => {
    if (game && touchStateRef.current) {
      game.getWorld().setResource("TouchInputState", touchStateRef.current);
    }
  }, [game]);

  useKeyboardControls(game, isReady);

  // Keep React pause flag in sync with BaseGame (Escape / kernel transitions).
  useEffect(() => {
    if (!game || !isReady) return;
    const id = setInterval(() => {
      const paused = typeof game.isPausedState === "function" ? game.isPausedState() : false;
      setIsPaused((prev) => (prev === paused ? prev : paused));
    }, 100);
    return () => clearInterval(id);
  }, [game, isReady]);

  // Web: Escape toggles pause (when not game over); R / Enter restart after Game Over.
  useEffect(() => {
    if (Platform.OS !== "web" || !game) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (gameState?.isGameOver) return;
        e.preventDefault();
        hapticSelection();
        if (game.isPausedState()) {
          game.resume();
          setIsPaused(false);
        } else {
          game.pause();
          setIsPaused(true);
        }
        return;
      }
      if (!gameState?.isGameOver) return;
      if (e.code === "KeyR" || e.code === "Enter") {
        e.preventDefault();
        hapticSelection();
        void game.restart();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game, gameState?.isGameOver]);

  const setInput = useCallback((patch: Partial<{ moveX: number; moveY: number; shoot: boolean }>) => {
    handleInput(patch as never);
    if (game) {
      const inputUpdate: Partial<import("@/games/vertical-shmup/types/ShmupTypes").ShmupInputState> = {};
      const axes: { moveX?: number; moveY?: number } = {};
      if (patch.moveX !== undefined) axes.moveX = patch.moveX;
      if (patch.moveY !== undefined) axes.moveY = patch.moveY;
      if (Object.keys(axes).length > 0) inputUpdate.axes = axes;
      if (patch.shoot !== undefined) inputUpdate.actions = patch.shoot ? ["shoot"] : [];
      game.setInputState(inputUpdate);
    }
  }, [game, handleInput]);

  const handleRestart = useCallback(() => {
    hapticSelection();
    if (game) void game.restart();
  }, [game]);

  const handleResume = useCallback(() => {
    hapticSelection();
    if (game) {
      game.resume();
      setIsPaused(false);
    }
  }, [game]);

  const handlePause = useCallback(() => {
    hapticSelection();
    if (game && !gameState?.isGameOver) {
      game.pause();
      setIsPaused(true);
    }
  }, [game, gameState?.isGameOver]);

  if (!started) return (
    <GameScreen>
      <BackButton label="Menu" />
      <GameTitle glowColor="#00e5ff">1942 // VERTICAL SHMUP</GameTitle>
      <GameInstructions>WASD / arrows: move · Space: fire continuously · Esc: pause</GameInstructions>
      <NeonButton variant="cyan" onPress={() => setStarted(true)}>START MISSION</NeonButton>
    </GameScreen>
  );

  if (!game || !isReady) return null;

  const lives = Math.max(0, gameState?.lives ?? 3);
  const isGameOver = gameState?.isGameOver === true;
  const showControls = !isGameOver && !isPaused;
  const world = game.getWorld();
  const bossEntity = world.query("ShmupEnemy", "Health").find(
    (entity) => world.getComponent(entity, "ShmupEnemy")?.archetype === "boss"
  );
  const bossHealth = bossEntity === undefined ? undefined : world.getComponent(bossEntity, "Health");
  const bossHealthPercent = bossHealth && bossHealth.max > 0
    ? Math.max(0, Math.min(100, (bossHealth.current / bossHealth.max) * 100))
    : 0;

  return (
    <GameErrorBoundary gameId="vertical-shmup">
      <SafeAreaProvider>
        <GameLayoutShell
          style={sharedScreenStyles.container}
          topLeftSlot={
            <View style={styles.topBar}>
              <BackButton label="Menu" />
              {!isGameOver && (
                <TouchableOpacity
                  style={styles.pauseChip}
                  onPress={isPaused ? handleResume : handlePause}
                  accessibilityRole="button"
                  accessibilityLabel={isPaused ? "Resume mission" : "Pause mission"}
                >
                  <Text style={styles.pauseChipText}>{isPaused ? "▶" : "❚❚"}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          centerHudSlot={
            <View style={styles.hudStack} pointerEvents="none">
              <View style={styles.hud}>
                <View style={styles.statGroup}>
                  <Text style={styles.statLabel}>SCORE</Text>
                  <Text style={styles.scoreValue}>{String(gameState?.score ?? 0).padStart(6, "0")}</Text>
                </View>
                <View style={styles.hudDivider} />
                <View style={styles.statGroup}>
                  <Text style={styles.statLabel}>WAVE</Text>
                  <Text style={styles.waveValue}>{String(gameState?.wave ?? 1).padStart(2, "0")}</Text>
                </View>
                <View style={styles.hudDivider} />
                <View style={styles.statGroup}>
                  <Text style={styles.statLabel}>LIVES</Text>
                  <Text style={styles.livesValue}>{String(lives).padStart(2, "0")}</Text>
                </View>
              </View>
              {bossHealth && (
                <View
                  style={styles.bossPanel}
                  accessibilityLabel={`Boss health: ${bossHealth.current} of ${bossHealth.max}`}
                >
                  <View style={styles.bossTopRow}>
                    <Text style={styles.bossTag}>WARNING</Text>
                    <Text style={styles.bossHeading}>BOSS ENCOUNTER</Text>
                    <Text style={styles.bossWave}>WAVE {String(gameState?.wave ?? 5).padStart(2, "0")}</Text>
                  </View>
                  <View style={styles.bossNameRow}>
                    <Text style={styles.bossName}>CELESTIAL WARDEN</Text>
                    <Text style={styles.bossHealthText}>
                      {Math.max(0, bossHealth.current)} / {bossHealth.max}
                    </Text>
                  </View>
                  <View style={styles.bossHealthTrack}>
                    <View style={[styles.bossHealthFill, { width: `${bossHealthPercent}%` }]} />
                  </View>
                </View>
              )}
            </View>
          }
          canvasSlot={<CanvasRenderer world={game.getWorld()} gameLoop={game.getGameLoop()} onInitialize={(renderer) => game.initializeRenderer(renderer)} />}
          controlsSlot={
            showControls ? (
              <View style={styles.controls} pointerEvents="box-none">
                <View style={styles.leftControlArea} pointerEvents="box-none">
                  <TouchVirtualJoystick
                    touchState={touchStateRef.current ?? undefined}
                    floating={true}
                    onMove={(x, y) => setInput({ moveX: x, moveY: y })}
                    onRelease={() => setInput({ moveX: 0, moveY: 0 })}
                    accessibilityLabel="Movement Joystick"
                  />
                </View>
                <View style={styles.rightControlArea} pointerEvents="box-none">
                  <TouchActionButton
                    label="🔥"
                    buttonName="shoot"
                    touchState={touchStateRef.current ?? undefined}
                    accessibilityLabel="Fire primary weapon"
                    onPressIn={() => setInput({ shoot: true })}
                    onPressOut={() => setInput({ shoot: false })}
                    haptic="light"
                    color="rgba(255,42,109,0.25)"
                    borderColor="#ff2a6d"
                  />
                </View>
              </View>
            ) : null
          }
          debugSlot={<DebugOverlay game={game} />}
          overlaySlot={
            isGameOver ? (
              <View style={sharedScreenStyles.overlay} accessibilityRole="summary">
                <Text style={sharedScreenStyles.overlayText}>GAME OVER</Text>
                <Text style={styles.gameOverMeta}>
                  SCORE {String(gameState?.score ?? 0).padStart(6, "0")} · WAVE {String(gameState?.wave ?? 1).padStart(2, "0")}
                </Text>
                <TouchableOpacity
                  style={styles.restartButton}
                  onPress={handleRestart}
                  accessibilityRole="button"
                  accessibilityLabel="Restart mission"
                >
                  <Text style={styles.restartButtonText}>REINICIAR</Text>
                </TouchableOpacity>
                {Platform.OS === "web" && (
                  <Text style={styles.restartHint}>R / Enter</Text>
                )}
              </View>
            ) : isPaused ? (
              <View style={sharedScreenStyles.overlay} accessibilityRole="summary">
                <Text style={sharedScreenStyles.overlayText}>PAUSA</Text>
                <Text style={styles.gameOverMeta}>MISSION SUSPENDED</Text>
                <TouchableOpacity
                  style={styles.restartButton}
                  onPress={handleResume}
                  accessibilityRole="button"
                  accessibilityLabel="Resume mission"
                >
                  <Text style={styles.restartButtonText}>CONTINUAR</Text>
                </TouchableOpacity>
                {Platform.OS === "web" && (
                  <Text style={styles.restartHint}>Esc</Text>
                )}
              </View>
            ) : null
          }
        />
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pauseChip: {
    marginLeft: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(85, 232, 255, 0.55)",
    backgroundColor: "rgba(8, 17, 42, 0.85)",
  },
  pauseChipText: {
    color: "#55E8FF",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "bold",
  },
  hudStack: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  hud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(85, 232, 255, 0.55)",
    borderRadius: 10,
    backgroundColor: "rgba(8, 17, 42, 0.92)",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 0px 10px rgba(8, 17, 42, 0.35)" }
      : {
          shadowColor: "#08112a",
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 5,
        }),
  },
  statGroup: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    color: "#A6C3DE",
    fontFamily: "monospace",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  scoreValue: {
    color: "#EAF5FF",
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  waveValue: {
    color: "#FFD18A",
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "bold",
  },
  livesValue: {
    color: "#55E8FF",
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "bold",
  },
  hudDivider: {
    width: 1,
    height: 26,
    backgroundColor: "rgba(166, 195, 222, 0.3)",
    marginHorizontal: 9,
  },
  bossPanel: {
    marginTop: 6,
    paddingHorizontal: 11,
    paddingTop: 8,
    paddingBottom: 9,
    borderWidth: 1,
    borderColor: "rgba(255, 209, 102, 0.68)",
    borderRadius: 9,
    backgroundColor: "rgba(20, 17, 39, 0.94)",
  },
  bossTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bossTag: {
    color: "#FFD166",
    fontFamily: "monospace",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1.4,
  },
  bossHeading: {
    color: "#F3FCFF",
    fontFamily: "monospace",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1.1,
  },
  bossWave: {
    color: "#A6C3DE",
    fontFamily: "monospace",
    fontSize: 8,
    fontWeight: "bold",
  },
  bossNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
  },
  bossName: {
    color: "#A6C3DE",
    fontFamily: "monospace",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1.1,
  },
  bossHealthText: {
    color: "#FFF4E6",
    fontFamily: "monospace",
    fontSize: 9,
    fontWeight: "bold",
  },
  bossHealthTrack: {
    height: 7,
    marginTop: 6,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: "rgba(166, 195, 222, 0.18)",
  },
  bossHealthFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#F25DBB",
  },
  controls: { ...StyleSheet.absoluteFill, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 24 },
  leftControlArea: { flex: 1, height: "100%" },
  rightControlArea: { width: 120, height: "100%", justifyContent: "flex-end", alignItems: "center", paddingBottom: 20 },
  gameOverMeta: {
    color: "#A6C3DE",
    fontFamily: "monospace",
    fontSize: 14,
    marginTop: 12,
    letterSpacing: 1,
  },
  restartButton: {
    marginTop: 24,
    backgroundColor: "#55E8FF",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  restartButtonText: {
    color: "#08112a",
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1.2,
  },
  restartHint: {
    color: "#8FA3C7",
    fontFamily: "monospace",
    fontSize: 12,
    marginTop: 10,
  },
});
