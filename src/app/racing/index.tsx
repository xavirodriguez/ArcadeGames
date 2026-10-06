import { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { VirtualJoystick } from "@/components/controls/VirtualJoystick";
import { GestureActionButton } from "@/components/controls/GestureActionButton";
import { useRacingGame } from "@/hooks/useRacingGame";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { GameLayoutShell, GameScreen, GameTitle, GameInstructions, BackButton, NeonButton } from "@/components/ui";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticSelection } from "@/utils/haptics";

export default function RacingScreen() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const { game, gameState, handleInput, isReady } = useRacingGame(started);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const countdownVal = Math.ceil(gameState.countdownRemaining);
  const isCountdownActive = gameState.phase === "countdown" || (gameState.phase === "racing" && gameState.raceTime < 1.0);

  useEffect(() => {
    if (isCountdownActive) {
      scale.value = withSequence(
        withTiming(0.7, { duration: 50 }),
        withSpring(1.15, { damping: 10, stiffness: 200 }),
        withTiming(1.0, { duration: 150 })
      );
      opacity.value = withTiming(1.0, { duration: 100 });

      // Audio feedback on countdown second change
      if (game?.audio) {
        try {
          if (countdownVal > 0) {
            void game.audio.playSFX("beep");
          } else {
            void game.audio.playSFX("select");
          }
        } catch {
          // ignore audio playback errors
        }
      }
    } else {
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [countdownVal, isCountdownActive, game?.audio, scale, opacity]);

  const animatedCountdownStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

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
              <View style={styles.h2hRow}>
                <Text style={[styles.hudText, { color: "#00e5ff" }]}>P1</Text>
                <View style={styles.pearlsRow}>
                  {[...Array(5)].map((_, i) => (
                    <View
                      key={`p1_${i}`}
                      style={[
                        styles.pearl,
                        { backgroundColor: i < (game?.getWorld().getSingleton("HeadToHeadState")?.scores.player_1 ?? 0) ? "#00e5ff" : "#1e293b" }
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.pearlsRow}>
                  {[...Array(5)].map((_, i) => (
                    <View
                      key={`p2_${i}`}
                      style={[
                        styles.pearl,
                        { backgroundColor: i < (game?.getWorld().getSingleton("HeadToHeadState")?.scores.player_2 ?? 0) ? "#f43f5e" : "#1e293b" }
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.hudText, { color: "#f43f5e" }]}>P2</Text>
              </View>
              <Text style={styles.lapHudText}>
                LAP {gameState.currentLap} / {gameState.totalLaps}
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
            <View style={styles.controls} pointerEvents="box-none">
              <View style={styles.leftControlArea} pointerEvents="box-none">
                <VirtualJoystick
                  joystickId="steering_joystick"
                  type="movement"
                  floating={false}
                  onMove={(x, y) => {
                    // Non-linear steering curve for precision center control
                    const curvedX = x * Math.abs(x);
                    input({ moveX: curvedX, moveY: y });
                  }}
                  onRelease={() => {
                    input({ moveX: 0, moveY: 0 });
                  }}
                />
              </View>
              <View style={styles.rightControlArea} pointerEvents="box-none">
                <GestureActionButton
                  label="BOOST"
                  accessibilityLabel="Boost nitro"
                  onPressIn={() => input({ boost: true })}
                  onPressOut={() => input({ boost: false })}
                  haptic="heavy"
                  color="rgba(242,201,76,0.25)"
                  borderColor="#F2C94C"
                />
              </View>
            </View>
          }
          debugSlot={<DebugOverlay game={game} />}
          overlaySlot={
            <>
              {isCountdownActive && (
                <View style={styles.countdownContainer} pointerEvents="none">
                  <Animated.Text
                    style={[
                      styles.countdownText,
                      countdownVal === 0 ? styles.goText : styles.numberText,
                      animatedCountdownStyle
                    ]}
                  >
                    {countdownVal > 0 ? countdownVal : "GO!"}
                  </Animated.Text>
                </View>
              )}
              {gameState.isGameOver && (
                <View style={styles.finished}>
                  <Text style={styles.finishedTitle}>FINISH!</Text>
                  <Text style={styles.text}>TIME {gameState.raceTime.toFixed(2)}s</Text>
                  <NeonButton variant="cyan" onPress={() => game.restart()}>RETRY</NeonButton>
                </View>
              )}
            </>
          }
        />
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

const styles = StyleSheet.create({
  hud: { padding: 10, borderWidth: 1, borderColor: "#55C9CE", backgroundColor: "rgba(0,0,0,0.8)", borderRadius: 10, alignItems: "center", gap: 6 },
  h2hRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pearlsRow: { flexDirection: "row", gap: 4 },
  pearl: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: "#475569" },
  vsText: { color: "#F2C94C", fontFamily: "monospace", fontWeight: "bold", fontSize: 12 },
  lapHudText: { color: "#FFFFFF", fontFamily: "monospace", fontSize: 22, fontWeight: "bold" },
  hudText: { color: "#55C9CE", fontFamily: "monospace", fontWeight: "bold" },
  controls: { ...StyleSheet.absoluteFillObject, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  leftControlArea: { flex: 1, height: "100%" },
  rightControlArea: { width: 140, height: "100%", justifyContent: "flex-end", alignItems: "center", paddingBottom: 40, paddingRight: 20 },
  boost: { width: 80, height: 58, borderRadius: 12, borderWidth: 2, borderColor: "#F2C94C", backgroundColor: "rgba(242,201,76,0.25)", justifyContent: "center", alignItems: "center" },
  buttonText: { color: "#fff", fontFamily: "monospace", fontWeight: "bold" },
  instructions: { marginBottom: 24 },
  text: { color: "#fff", fontFamily: "monospace", textAlign: "center" },
  countdownContainer: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  countdownText: { fontFamily: "monospace", fontWeight: "bold", textShadowColor: "rgba(0, 0, 0, 0.8)", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 6 },
  numberText: { fontSize: 80, color: "#F2C94C" },
  goText: { fontSize: 96, color: "#55C9CE" },
  finished: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", gap: 18 },
  finishedTitle: { color: "#F2C94C", fontSize: 40, fontWeight: "bold", fontFamily: "monospace" }
});
