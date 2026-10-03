import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Pressable } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useRacingGame } from "@/hooks/useRacingGame";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { GameLayoutShell, GameScreen, GameTitle, GameInstructions, BackButton, NeonButton } from "@/components/ui";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticSelection } from "@/utils/haptics";

export default function RacingScreen() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const { game, gameState, handleInput, isReady, togglePause, isPaused } = useRacingGame(started);

  useKeyboardControls(game, isReady);

  const input = useCallback((patch: Partial<{ moveX: number; moveY: number; boost: boolean; brake: boolean }>) => {
    handleInput(patch);
    game?.setInputState(patch);
  }, [handleInput, game]);

  if (!started) {
    return (
      <GameScreen>
        <BackButton label={t.common.menu} />
        <GameTitle glowColor="#00e5ff">MICRO RACERS</GameTitle>
        <GameInstructions>
          WASD / arrows: steer and accelerate · Space: boost · R: restart
        </GameInstructions>
        <View style={styles.instructions}>
          <Text style={styles.text}>3 laps · checkpoints in order · drift through corners</Text>
        </View>
        <NeonButton variant="cyan" onPress={() => { hapticSelection(); setStarted(true); }}>
          RACE
        </NeonButton>
      </GameScreen>
    );
  }

  if (!game || !isReady) return null;

  return (
    <GameErrorBoundary gameId="racing">
      <SafeAreaProvider>
        <GameLayoutShell
          style={sharedScreenStyles.container}
          topLeftSlot={
            <TouchableOpacity style={sharedScreenStyles.backButton} onPress={() => router.back()}>
              <Text style={sharedScreenStyles.backButtonText}>← {t.common.menu}</Text>
            </TouchableOpacity>
          }
          centerHudSlot={
            <View style={styles.hud}>
              <Text style={styles.hudText}>
                LAP {gameState.currentLap}/{gameState.totalLaps} · {gameState.raceTime.toFixed(2)}s
              </Text>
              <Text style={styles.hudText}>
                {gameState.phase === "countdown" ? Math.ceil(gameState.countdownRemaining) : gameState.phase.toUpperCase()}
              </Text>
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
            <View style={styles.controls}>
              <View style={styles.steering}>
                <Pressable style={styles.button} onPressIn={() => input({ moveX: -1 })} onPressOut={() => input({ moveX: 0 })}>
                  <Text style={styles.buttonText}>◀</Text>
                </Pressable>
                <Pressable style={styles.button} onPressIn={() => input({ moveX: 1 })} onPressOut={() => input({ moveX: 0 })}>
                  <Text style={styles.buttonText}>▶</Text>
                </Pressable>
              </View>
              <View style={styles.pedals}>
                <Pressable style={styles.button} onPressIn={() => input({ moveY: -1 })} onPressOut={() => input({ moveY: 0 })}>
                  <Text style={styles.buttonText}>▲</Text>
                </Pressable>
                <Pressable style={styles.button} onPressIn={() => input({ brake: true })} onPressOut={() => input({ brake: false })}>
                  <Text style={styles.buttonText}>▼</Text>
                </Pressable>
                <Pressable style={styles.boost} onPressIn={() => input({ boost: true })} onPressOut={() => input({ boost: false })}>
                  <Text style={styles.buttonText}>BOOST</Text>
                </Pressable>
              </View>
            </View>
          }
          debugSlot={<DebugOverlay game={game} />}
          overlaySlot={
            gameState.isGameOver ? (
              <View style={styles.finished}>
                <Text style={styles.finishedTitle}>FINISH!</Text>
                <Text style={styles.text}>TIME {gameState.raceTime.toFixed(2)}s</Text>
                <NeonButton variant="cyan" onPress={() => game.restart()}>RETRY</NeonButton>
              </View>
            ) : null
          }
          onPause={togglePause}
          isPaused={isPaused}
        />
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

const styles = StyleSheet.create({
  hud: { padding: 10, borderWidth: 1, borderColor: "#00e5ff", backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 8 },
  hudText: { color: "#00e5ff", fontFamily: "monospace", fontWeight: "bold" },
  controls: { ...StyleSheet.absoluteFillObject, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 24 },
  steering: { flexDirection: "row", gap: 12 },
  pedals: { flexDirection: "row", gap: 12, alignItems: "flex-end" },
  button: { width: 58, height: 58, borderRadius: 12, borderWidth: 2, borderColor: "#00e5ff", backgroundColor: "rgba(0,229,255,0.18)", justifyContent: "center", alignItems: "center" },
  boost: { width: 80, height: 58, borderRadius: 12, borderWidth: 2, borderColor: "#fbbf24", backgroundColor: "rgba(251,191,36,0.2)", justifyContent: "center", alignItems: "center" },
  buttonText: { color: "#fff", fontFamily: "monospace", fontWeight: "bold" },
  instructions: { marginBottom: 24 },
  text: { color: "#fff", fontFamily: "monospace", textAlign: "center" },
  finished: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", gap: 18 },
  finishedTitle: { color: "#fbbf24", fontSize: 40, fontWeight: "bold", fontFamily: "monospace" }
});
