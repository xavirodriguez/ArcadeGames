import { useState, useEffect, useCallback, useRef, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TouchVirtualJoystick, TouchActionButton } from "@/components/controls";
import { TouchInputState } from "@tiny-aster/core";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { GalaxianGame, GalaxianStateComponent } from "@/games/galaxian";
import { useGalaxianGame } from "@/hooks/useGalaxianGame";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { RadialBackground } from "@/components/RadialBackground";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticSelection } from "@/utils/haptics";
import { colors, neonTextGlow } from "../../theme";
import { GameThemeProvider } from "@/context/GameThemeProvider";
import {
  GameScreen,
  GameTitle,
  GameInstructions,
  HighScoreText,
  BackButton,
  NeonButton,
  GameLayoutShell,
} from "../../components/ui";

export default function GalaxianScreen() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [initialSeed, setInitialSeed] = useState<number | undefined>();

  const { game, gameState, handleInput, isPaused, isReady, togglePause, highScore, seed, restartWithSeed } =
    useGalaxianGame(started, false, initialSeed);

  const touchStateRef = useRef<TouchInputState | null>(null);
  if (!touchStateRef.current) {
    touchStateRef.current = new TouchInputState();
  }

  useEffect(() => {
    if (game && touchStateRef.current) {
      game.getWorld().setResource("TouchInputState", touchStateRef.current);
    }
  }, [game]);

  const handleInputState = useCallback(
    (input: Partial<{ moveLeft: boolean; moveRight: boolean; shoot: boolean }>) => {
      handleInput(input);
      if (game) {
        game.setInput(input);
      }
    },
    [handleInput, game]
  );

  useKeyboardControls(game, isReady, handleInputState);

  if (!started) {
    return (
      <GameThemeProvider gameKey="galaxian">
        <GameScreen>
          <BackButton label={t.common.menu} />
          <GameTitle glowColor="#FFC145">GALAXIAN</GameTitle>
          <GameInstructions>
            {Platform.OS === "web" ? "Usa las flechas izquierda/derecha para moverte y Espacio para disparar." : t.common.touch_controls}
          </GameInstructions>
          <HighScoreText label={t.common.record} score={highScore ?? 0} />
          <View style={sharedScreenStyles.buttonRow}>
            <NeonButton
              variant="cyan"
              onPress={() => {
                hapticSelection();
                setStarted(true);
              }}
              accessibilityLabel={t.common.solo}
            >
              {t.common.solo}
            </NeonButton>
          </View>
        </GameScreen>
      </GameThemeProvider>
    );
  }

  if (!game || !isReady) {
    return (
      <View style={sharedScreenStyles.container}>
        <RadialBackground />
        <ActivityIndicator size="large" color="#FFC145" />
        <Text style={styles.loadingText}>Loading Galaxian...</Text>
      </View>
    );
  }

  return (
    <GameErrorBoundary gameId="galaxian">
      <SafeAreaProvider>
        <GameThemeProvider gameKey="galaxian">
          <GameLayoutShell
            style={sharedScreenStyles.container}
            backgroundSlot={<RadialBackground />}
            topLeftSlot={<BackButton label={t.common.menu} />}
            hudSlot={
              <View style={styles.hudContainer}>
                <View style={styles.hudColumn}>
                  <Text style={styles.hudLabel}>1UP</Text>
                  <Text style={styles.hudValue}>{String(gameState?.score ?? 0).padStart(6, "0")}</Text>
                  <Text style={styles.hudMuted}>HIGH: {String(gameState?.highScore ?? highScore ?? 0).padStart(6, "0")}</Text>
                </View>
                <View style={styles.hudColumnCenter}>
                  <Text style={styles.hudLabel}>OLEADA</Text>
                  <Text style={styles.hudValue}>{String(gameState?.level ?? 1).padStart(2, "0")}</Text>
                </View>
                <View style={styles.hudColumnRight}>
                  <Text style={styles.hudLabel}>VIDAS</Text>
                  <View style={styles.livesRow}>
                    {Array.from({ length: Math.max(0, (gameState?.lives ?? 3) - 1) }).map((_, i) => (
                      <Text key={i} style={styles.lifeIcon}>✈</Text>
                    ))}
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
              !gameState?.isGameOver ? (
                <View style={styles.controls} pointerEvents="box-none">
                  <View style={{ flex: 1, height: '100%' }} pointerEvents="box-none">
                    <TouchVirtualJoystick
                      touchState={touchStateRef.current ?? undefined}
                      floating={true}
                      onMove={(x) => {
                        handleInputState({
                          moveLeft: x < -0.25,
                          moveRight: x > 0.25,
                        });
                      }}
                      onRelease={() => {
                        handleInputState({
                          moveLeft: false,
                          moveRight: false,
                        });
                      }}
                    />
                  </View>
                  <View style={{ width: 120, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }} pointerEvents="box-none">
                    <TouchActionButton
                      label="🔥"
                      buttonName="shoot"
                      touchState={touchStateRef.current ?? undefined}
                      size={80}
                      onPressIn={() => handleInputState({ shoot: true })}
                      onPressOut={() => handleInputState({ shoot: false })}
                    />
                  </View>
                </View>
              ) : null
            }
            debugSlot={<DebugOverlay game={game} />}
            overlaySlot={
              gameState?.isGameOver ? (
                <View style={sharedScreenStyles.overlay}>
                  <Text style={sharedScreenStyles.overlayText}>{t.common?.game_over ?? "Fin de partida"}</Text>
                  <TouchableOpacity
                    style={styles.restartButton}
                    onPress={() => {
                      hapticSelection();
                      game.restart();
                    }}
                  >
                    <Text style={styles.restartButtonText}>{t.common?.retry ?? "Reintentar"}</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </GameThemeProvider>
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    color: colors.white,
    marginTop: 20,
    fontFamily: "monospace",
    fontSize: 18,
  },
  hudContainer: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  hudColumn: {
    alignItems: "flex-start",
  },
  hudColumnCenter: {
    alignItems: "center",
  },
  hudColumnRight: {
    alignItems: "flex-end",
  },
  hudLabel: {
    color: "#8FA3C7",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    letterSpacing: 1,
  },
  hudValue: {
    color: "#FFF6E5",
    fontSize: 20,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  hudMuted: {
    color: "#8FA3C7",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginTop: 2,
  },
  livesRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 2,
  },
  lifeIcon: {
    color: "#FFF6E5",
    fontSize: 16,
  },
  controls: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  restartButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  restartButtonText: {
    color: colors.background,
    fontWeight: "bold",
  },
});
