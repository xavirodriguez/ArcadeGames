import { useState, useEffect, useCallback, useRef, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TouchVirtualJoystick, TouchActionButton } from "@/components/controls";
import { TouchInputState } from "@tiny-aster/core";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { GalaxianGame, GalaxianStateComponent } from "@/games/galaxian";
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
  const [game, setGame] = useState<GalaxianGame | null>(null);
  const [gameState, setGameState] = useState<GalaxianStateComponent | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const touchStateRef = useRef<TouchInputState | null>(null);
  if (!touchStateRef.current) {
    touchStateRef.current = new TouchInputState();
  }

  useEffect(() => {
    if (started && !game) {
      const g = new GalaxianGame({ headless: false });
      g.init().then(() => {
        setGame(g);
        setGameState(g.getGameState());
      });

      return () => {
        g.destroy();
      };
    }
  }, [started, game]);

  useEffect(() => {
    if (!game) return;
    const unsub = game.subscribe((st) => {
      setGameState({ ...st });
      setIsPaused(game.isPausedState());
    });
    return unsub;
  }, [game]);

  const handleInput = useCallback((input: Partial<{ moveLeft: boolean; moveRight: boolean; shoot: boolean }>) => {
    if (game) {
      game.setInput(input);
    }
  }, [game]);

  useKeyboardControls(game, !!game, handleInput);

  if (!started) {
    return (
      <GameThemeProvider gameKey="galaxian">
        <GameScreen>
          <BackButton label={t.common.menu} />
          <GameTitle glowColor="#FFC145">GALAXIAN</GameTitle>
          <GameInstructions>
            {Platform.OS === "web" ? "Usa las flechas izquierda/derecha para moverte y Espacio para disparar." : t.common.touch_controls}
          </GameInstructions>
          <HighScoreText label={t.common.record} score={gameState?.highScore ?? 0} />
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

  if (!game) return null;

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
                  <Text style={styles.hudMuted}>HIGH: {String(gameState?.highScore ?? 0).padStart(6, "0")}</Text>
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
                world={() => game.getWorld()}
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
                        handleInput({
                          moveLeft: x < -0.25,
                          moveRight: x > 0.25,
                        });
                      }}
                      onRelease={() => {
                        handleInput({
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
                      onPressIn={() => handleInput({ shoot: true })}
                      onPressOut={() => handleInput({ shoot: false })}
                    />
                  </View>
                </View>
              ) : null
            }
            debugSlot={<DebugOverlay game={game} />}
          />
        </GameThemeProvider>
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

const styles = StyleSheet.create({
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
});
