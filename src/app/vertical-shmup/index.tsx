import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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

export default function VerticalShmupScreen() {
  const [started, setStarted] = useState(false);
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

  if (!started) return (
    <GameScreen>
      <BackButton label="Menu" />
      <GameTitle glowColor="#00e5ff">1942 // VERTICAL SHMUP</GameTitle>
      <GameInstructions>WASD / arrows: move · Space: fire continuously</GameInstructions>
      <NeonButton variant="cyan" onPress={() => setStarted(true)}>START MISSION</NeonButton>
    </GameScreen>
  );

  if (!game || !isReady) return null;

  const lives = gameState?.lives ?? 3;
  const livesDisplay = "❤️".repeat(Math.max(0, lives));

  return (
    <GameErrorBoundary gameId="vertical-shmup">
      <SafeAreaProvider>
        <GameLayoutShell
          style={sharedScreenStyles.container}
          topLeftSlot={<BackButton label="Menu" />}
          centerHudSlot={
            <View style={styles.hud}>
              <Text style={styles.hudText}>
                SCORE {gameState?.score ?? 0} · WAVE {gameState?.wave ?? 1} · LIVES {livesDisplay || "0"}
              </Text>
            </View>
          }
          canvasSlot={<CanvasRenderer world={game.getWorld()} gameLoop={game.getGameLoop()} onInitialize={(renderer) => game.initializeRenderer(renderer)} />}
          controlsSlot={
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
          }
          debugSlot={<DebugOverlay game={game} />}
        />
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

const styles = StyleSheet.create({
  hud: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.6)",
    borderRadius: 8,
    backgroundColor: "rgba(12, 22, 45, 0.85)",
  },
  hudText: {
    color: "#55e8ff",
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  controls: { ...StyleSheet.absoluteFill, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 24 },
  leftControlArea: { flex: 1, height: "100%" },
  rightControlArea: { width: 120, height: "100%", justifyContent: "flex-end", alignItems: "center", paddingBottom: 20 },
});
