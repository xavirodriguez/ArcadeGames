import { useState, useEffect, useCallback, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { TouchVirtualJoystick, TouchHoldButton, TouchActionButton } from "@/components/controls";
import { TouchInputState } from "@tiny-aster/core";
import { useRacingGame } from "@/hooks/useRacingGame";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { GameLayoutShell, GameScreen, GameTitle, GameInstructions, BackButton, NeonButton } from "@/components/ui";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticSelection } from "@/utils/haptics";
import { getRacingSkin } from "@/games/racing/rendering/RacingSkin";
import { TRACK_LIST, DEFAULT_TRACK_ID } from "@/games/racing/config/tracks";
import { computeRacingSpeedMetrics } from "@/games/racing/RacingHudMetrics";

function formatRaceTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "--:--.--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(2).padStart(5, "0");
  return `${String(minutes).padStart(2, "0")}:${remainingSeconds}`;
}

export default function RacingScreen() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string>(DEFAULT_TRACK_ID);
  const { game, gameState, handleInput, isReady } = useRacingGame(started, undefined, selectedTrackId);

  const touchStateRef = useRef<TouchInputState | null>(null);
  if (!touchStateRef.current) {
    touchStateRef.current = new TouchInputState();
  }

  useEffect(() => {
    if (game && touchStateRef.current) {
      game.getWorld().setResource("TouchInputState", touchStateRef.current);
    }
  }, [game]);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const skin = game && isReady ? getRacingSkin(game.getWorld()) : undefined;
  const glowColor = skin?.ui?.glowColor ?? "#0B9EAD";
  const accentColor = skin?.ui?.accentColor ?? "#E4AB42";

  const headToHead = game?.getWorld().getSingleton("HeadToHeadState");
  const targetScore = Math.max(1, headToHead?.targetScore ?? 4);
  const scorePlayer1 = headToHead?.scores.player_1 ?? 0;
  const scorePlayer2 = headToHead?.scores.player_2 ?? 0;

  const world = game?.getWorld();
  const localPlayerEntity = world?.query("LocalPlayer", "Velocity")[0];
  const playerVelocity = localPlayerEntity === undefined ? undefined : world?.getComponent(localPlayerEntity, "Velocity");
  const playerInput = localPlayerEntity === undefined ? undefined : world?.getComponent(localPlayerEntity, "Input");
  const racingConfig = world?.getResource<{ CAR_MAX_SPEED?: number; CAR_BOOST_MULTIPLIER?: number }>("GameConfig");
  const maxSpeed = (racingConfig?.CAR_MAX_SPEED ?? 420) * (racingConfig?.CAR_BOOST_MULTIPLIER ?? 1.35);
  const speedMetrics = computeRacingSpeedMetrics(
    playerVelocity?.vx ?? 0,
    playerVelocity?.vy ?? 0,
    maxSpeed
  );
  const isBoosting = playerInput?.actions.boost === true;

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

      if (game?.audio) {
        try {
          if (countdownVal > 0) {
            void game.audio.playSFX("beep");
          } else {
            void game.audio.playSFX("select");
          }
        } catch {
          // Audio feedback is optional; a failed device playback must not stop a race.
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
        <GameTitle glowColor={glowColor}>MICRO RACERS</GameTitle>
        <GameInstructions>
          WASD / arrows: steer and accelerate · Space: boost · R: restart
        </GameInstructions>
        <View style={styles.instructions}>
          <Text style={styles.text}>3 laps · checkpoints in order · drift through corners</Text>
        </View>
        <View style={styles.trackSelectorContainer}>
          <Text style={styles.trackSelectorLabel}>SELECT TRACK:</Text>
          <View style={styles.trackButtonsRow}>
            {TRACK_LIST.map((track) => {
              const isSelected = selectedTrackId === track.id;
              return (
                <NeonButton
                  key={track.id}
                  variant={isSelected ? "cyan" : "white"}
                  bordered={!isSelected}
                  style={styles.trackButton}
                  textStyle={styles.trackButtonText}
                  onPress={() => {
                    hapticSelection();
                    setSelectedTrackId(track.id);
                  }}
                >
                  {track.name}
                </NeonButton>
              );
            })}
          </View>
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
            <TouchableOpacity
              style={[styles.menuButton, { borderColor: glowColor }]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t.common.menu}
              hitSlop={8}
            >
              <Text style={styles.menuButtonText}>‹  MENU</Text>
            </TouchableOpacity>
          }
          centerHudSlot={
            <View style={styles.hudWrap} pointerEvents="none">
              <View style={[styles.hud, { borderColor: `${glowColor}99` }]}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>POS</Text>
                  <Text style={[styles.metricValue, { color: glowColor }]}>P{gameState.position}</Text>
                </View>
                <View style={styles.separator} />
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>LAP</Text>
                  <Text style={styles.metricValue}>{gameState.currentLap}/{gameState.totalLaps}</Text>
                </View>
                <View style={styles.separator} />
                <View style={[styles.metric, styles.timeMetric]}>
                  <Text style={styles.metricLabel}>TIME</Text>
                  <Text style={[styles.timeValue, { color: glowColor }]}>{formatRaceTime(gameState.raceTime)}</Text>
                </View>
                <View style={styles.separator} />
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>BEST</Text>
                  <Text style={styles.metricValue}>{formatRaceTime(gameState.bestLapTime)}</Text>
                </View>
              </View>
              <View style={styles.scoreStrip}>
                <Text style={[styles.scoreLabel, { color: glowColor }]}>P1</Text>
                <View style={styles.scorePips}>
                  {Array.from({ length: targetScore }, (_, index) => (
                    <View
                      key={`p1-${index}`}
                      style={[
                        styles.scorePip,
                        { backgroundColor: index < scorePlayer1 ? glowColor : "rgba(226,232,240,0.12)", borderColor: glowColor }
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.scorePips}>
                  {Array.from({ length: targetScore }, (_, index) => (
                    <View
                      key={`p2-${index}`}
                      style={[
                        styles.scorePip,
                        { backgroundColor: index < scorePlayer2 ? "#E87968" : "rgba(226,232,240,0.12)", borderColor: "#E87968" }
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.scoreLabel, { color: "#E87968" }]}>P2</Text>
              </View>
              <View style={[styles.speedometer, { borderColor: `${glowColor}66` }]}>
                <View style={styles.speedReadout}>
                  <Text style={styles.speedLabel}>SPD</Text>
                  <Text style={[styles.speedValue, { color: isBoosting ? accentColor : glowColor }]}>
                    {speedMetrics.display}
                  </Text>
                </View>
                <View style={styles.speedTrack}>
                  <View
                    style={[
                      styles.speedFill,
                      {
                        width: `${Math.round(speedMetrics.ratio * 100)}%`,
                        backgroundColor: isBoosting ? accentColor : glowColor,
                        opacity: 0.72 + speedMetrics.ratio * 0.28
                      }
                    ]}
                  />
                </View>
              </View>
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
                <TouchVirtualJoystick
                  floating={true}
                  color={glowColor}
                  activeColor={glowColor}
                  opacity={0.72}
                  onMove={(x) => {
                    const steerX = Math.max(-1, Math.min(1, x));
                    if (touchStateRef.current) {
                      touchStateRef.current.setMoveAxis(steerX, touchStateRef.current.moveY);
                    }
                    input({ moveX: steerX });
                  }}
                  onRelease={() => {
                    if (touchStateRef.current) {
                      touchStateRef.current.setMoveAxis(0, touchStateRef.current.moveY);
                    }
                    input({ moveX: 0 });
                  }}
                  accessibilityLabel="Steering joystick"
                />
              </View>
              <View style={styles.rightControlArea} pointerEvents="box-none">
                <TouchHoldButton
                  label={"▲\nGAS"}
                  buttonName="thrust"
                  touchState={touchStateRef.current ?? undefined}
                  size={60}
                  color="rgba(15,23,42,0.54)"
                  pressedColor="rgba(15,23,42,0.86)"
                  borderColor={glowColor}
                  textColor="#FFFDF5"
                  labelStyle={styles.controlLabel}
                  onHoldStart={() => input({ moveY: -1 })}
                  onHoldEnd={() => input({ moveY: 0 })}
                  accessibilityLabel="Accelerate"
                />
                <TouchActionButton
                  label={"✦\nBOOST"}
                  buttonName="boost"
                  touchState={touchStateRef.current ?? undefined}
                  size={56}
                  color="rgba(15,23,42,0.54)"
                  pressedColor="rgba(15,23,42,0.86)"
                  borderColor={accentColor}
                  pressedBorderColor={accentColor}
                  textColor="#FFFDF5"
                  labelStyle={styles.controlLabel}
                  accessibilityLabel="Boost nitro"
                  onPressIn={() => input({ boost: true })}
                  onPressOut={() => input({ boost: false })}
                  haptic="heavy"
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
                      countdownVal === 0 ? [styles.goText, { color: glowColor }] : [styles.numberText, { color: accentColor }],
                      animatedCountdownStyle
                    ]}
                  >
                    {countdownVal > 0 ? countdownVal : "GO!"}
                  </Animated.Text>
                </View>
              )}
              {gameState.isGameOver && (
                <View style={styles.finished}>
                  <Text style={[styles.finishedTitle, { color: accentColor }]}>FINISH!</Text>
                  <Text style={styles.text}>TIME {formatRaceTime(gameState.raceTime)}</Text>
                  {gameState.bestLapTime !== null && (
                    <Text style={styles.finishedBest}>BEST LAP {formatRaceTime(gameState.bestLapTime)}</Text>
                  )}
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
  menuButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 7,
    backgroundColor: "rgba(12,18,27,0.78)",
    opacity: 0.9
  },
  menuButtonText: {
    color: "#F8F4E8",
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1
  },
  hudWrap: {
    alignItems: "center",
    gap: 4,
    maxWidth: 520,
    alignSelf: "center"
  },
  hud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 9,
    backgroundColor: "rgba(12,18,27,0.84)"
  },
  metric: {
    minWidth: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  timeMetric: {
    minWidth: 72
  },
  metricLabel: {
    color: "rgba(248,244,232,0.58)",
    fontFamily: "monospace",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1
  },
  metricValue: {
    color: "#F8F4E8",
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2
  },
  timeValue: {
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 2,
    fontVariant: ["tabular-nums"]
  },
  separator: {
    width: 1,
    height: 23,
    backgroundColor: "rgba(248,244,232,0.16)"
  },
  scoreStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "rgba(12,18,27,0.70)"
  },
  scoreLabel: {
    fontFamily: "monospace",
    fontSize: 8,
    fontWeight: "bold"
  },
  scorePips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2
  },
  scorePip: {
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 0.6
  },
  vsText: {
    color: "rgba(248,244,232,0.55)",
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: 8,
    marginHorizontal: 1
  },
  speedometer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 148,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: "rgba(12,18,27,0.76)"
  },
  speedReadout: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5
  },
  speedLabel: {
    color: "rgba(248,244,232,0.58)",
    fontFamily: "monospace",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.8
  },
  speedValue: {
    minWidth: 25,
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"]
  },
  speedTrack: {
    flex: 1,
    height: 6,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(248,244,232,0.12)"
  },
  speedFill: {
    height: "100%",
    borderRadius: 4
  },
  controls: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  leftControlArea: {
    flex: 1,
    height: "100%"
  },
  rightControlArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 9,
    width: 142,
    paddingBottom: 24,
    paddingRight: 14
  },
  controlLabel: {
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    textAlign: "center"
  },
  instructions: {
    marginBottom: 24
  },
  trackSelectorContainer: {
    marginBottom: 24,
    alignItems: "center",
    gap: 12
  },
  trackSelectorLabel: {
    color: "#F8F4E8",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1
  },
  trackButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    maxWidth: 600
  },
  trackButton: {
    minWidth: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38
  },
  trackButtonText: {
    fontSize: 11
  },
  text: {
    color: "#fff",
    fontFamily: "monospace",
    textAlign: "center"
  },
  countdownContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center"
  },
  countdownText: {
    fontFamily: "monospace",
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6
  },
  numberText: {
    fontSize: 72
  },
  goText: {
    fontSize: 84
  },
  finished: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    gap: 14
  },
  finishedTitle: {
    fontSize: 36,
    fontWeight: "bold",
    fontFamily: "monospace"
  },
  finishedBest: {
    color: "rgba(248,244,232,0.78)",
    fontSize: 12,
    fontFamily: "monospace"
  }
});
