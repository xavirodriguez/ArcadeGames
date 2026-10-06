import { useState, useEffect, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, GestureResponderEvent, LayoutChangeEvent } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useTowerDefenseGame } from "@/hooks/useTowerDefenseGame";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticSelection } from "../../utils/haptics";
import { colors, spacing, typography } from "../../theme";
import { touchToCellCoords, cellCenter } from "../../games/tower-defense/MapUtils";
import towerDefenseConfigRaw from "../../games/tower-defense/config/tower-defense.json";
import type { TowerDefenseConfig } from "../../games/tower-defense/types/TowerDefenseConfigSchema";

import {
  GameScreen,
  GameTitle,
  GameInstructions,
  NeonButton,
  BackButton,
  GameLayoutShell,
} from "../../components/ui";
import { TowerDefenseControls } from "@/components/TowerDefenseControls";

export default function TowerDefenseScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ seed?: string }>();
  const [started, setStarted] = useState(false);
  const [initialSeed, setInitialSeed] = useState<number | undefined>();
  const [selectedTower, setSelectedTower] = useState<string>("basic");

  useEffect(() => {
    if (params.seed) {
      const parsedSeed = parseInt(params.seed, 10);
      if (!isNaN(parsedSeed)) {
        setInitialSeed(parsedSeed);
      }
    }
  }, [params.seed]);

  const { game, gameState, handleInput, isReady, restartWithSeed } =
    useTowerDefenseGame(started, initialSeed);

  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number }>({
    width: towerDefenseConfigRaw.worldWidth,
    height: towerDefenseConfigRaw.worldHeight,
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCanvasLayout({ width, height });
    }
  };

  // Keyboard shortcuts for web
  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState?.phase === "game_over" || gameState?.phase === "victory") {
        if (e.code === "KeyR" || e.code === "Enter") {
          e.preventDefault();
          hapticSelection();
          restartWithSeed(initialSeed);
        }
      } else {
        if (e.code === "Digit1") setSelectedTower("basic");
        if (e.code === "Digit2") setSelectedTower("sniper");
        if (e.code === "Digit3") setSelectedTower("rapid");
        if (e.code === "Digit4") setSelectedTower("frost");
        if (e.code === "KeyB") handleInput({ build: true });
        if (e.code === "KeyX") handleInput({ sell: true });
        if (e.code === "KeyU") handleInput({ upgrade: true });
        if (e.code === "Space") handleInput({ startWave: true });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game, isReady, gameState?.phase, initialSeed, restartWithSeed, handleInput]);

  const handleCanvasTouch = (e: GestureResponderEvent) => {
    if (!game || !isReady) return;
    const { locationX, locationY } = e.nativeEvent;
    // Map touch coordinates to cell world position
    const layout = {
      stepX: towerDefenseConfigRaw.CELL_SIZE,
      stepY: towerDefenseConfigRaw.CELL_SIZE,
      offsetX: towerDefenseConfigRaw.GRID_OFFSET_X,
      offsetY: towerDefenseConfigRaw.GRID_OFFSET_Y,
    };
    const cell = touchToCellCoords(
      locationX,
      locationY,
      canvasLayout.width,
      canvasLayout.height,
      towerDefenseConfigRaw as TowerDefenseConfig,
      layout
    );
    const worldPos = cellCenter(cell.col, cell.row, layout);
    handleInput({
      cursorX: worldPos.x,
      cursorY: worldPos.y,
      selectedTowerType: selectedTower,
      build: true,
    });
  };

  if (!started) {
    return (
      <StartScreen
        title="TOWER DEFENSE"
        onStart={() => {
          hapticSelection();
          setStarted(true);
        }}
        instructions={t["tower-defense"]?.instructions || "Toca celdas para construir torres y defiende la base."}
      />
    );
  }

  if (!game || !isReady) return null;

  const phaseText =
    gameState?.phase === "build"
      ? "CONSTRUCCIÓN"
      : gameState?.phase === "wave"
        ? "OLEADA EN CURSO"
        : gameState?.phase === "intermission"
          ? `INTERMISIÓN (${Math.ceil(gameState.intermissionRemaining ?? 0)}s)`
          : gameState?.phase === "victory"
            ? "¡VICTORIA!"
            : "DERROTA";

  return (
    <GameErrorBoundary gameId="tower-defense">
      <SafeAreaProvider>
        <GameLayoutShell
          style={styles.container}
          topLeftSlot={<BackButton label={t.common.menu} />}
          centerHudSlot={
            <View style={styles.hudBoard}>
              <Text style={styles.hudTextGold}>🪙 {gameState?.gold ?? 0}</Text>

              <Text style={styles.hudTextLives}>❤️ {gameState?.lives ?? 0}</Text>
              <Text style={styles.hudTextWave}>🌊 Wave {(gameState?.wave ?? 0) + 1}</Text>
              <Text style={styles.hudTextPhase}>{phaseText}</Text>
            </View>
          }
          canvasSlot={
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleCanvasTouch}
              onLayout={handleLayout}
              style={styles.canvasTouchArea}
            >
              <CanvasRenderer
                world={game.getWorld()}
                gameLoop={game.getGameLoop()}
                onInitialize={(renderer) => game.initializeRenderer(renderer)}
              />
            </TouchableOpacity>
          }
          controlsSlot={
            <TowerDefenseControls
              selectedTowerType={selectedTower}
              onSelectTower={(type) => {
                setSelectedTower(type);
                handleInput({ selectedTowerType: type });
              }}
              onBuild={() => handleInput({ build: true, selectedTowerType: selectedTower })}
              onSell={() => handleInput({ sell: true })}
              onUpgrade={() => handleInput({ upgrade: true })}
              onStartWave={() => handleInput({ startWave: true })}
              phase={gameState?.phase}
              gold={gameState?.gold ?? 0}
            />
          }
          debugSlot={<DebugOverlay game={game} />}
          overlaySlot={
            <>
              {(gameState?.phase === "game_over" || gameState?.phase === "victory") && (
                <View style={styles.overlay}>
                  <Text style={styles.overlayTitle}>
                    {gameState.phase === "victory" ? "¡VICTORIA VALIENTE!" : t.common.game_over}
                  </Text>
                  <Text style={styles.overlaySub}>
                    Puntuación: {gameState?.score ?? 0}
                  </Text>
                  <TouchableOpacity
                    style={styles.restartButton}
                    onPress={() => {
                      hapticSelection();
                      restartWithSeed(initialSeed);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t.accessibility.restart_game_label}
                  >
                    <Text style={styles.restartButtonText}>{t.common.retry}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
        />
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

const StartScreen: FC<{
  title: string;
  onStart: () => void;
  instructions: string;
}> = ({ title, onStart, instructions }) => {
  const { t } = useTranslation();
  return (
    <GameScreen>
      <BackButton label={t.common.menu} />
      <GameTitle glowColor={colors.cyan}>{title}</GameTitle>
      <GameInstructions>{instructions}</GameInstructions>
      <NeonButton variant="cyan" onPress={onStart}>
        JUGAR
      </NeonButton>
    </GameScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  hudBoard: {
    position: "absolute",
    top: 50,
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hudTextGold: {
    color: colors.gold,
    fontSize: typography.sizes.md,
    fontFamily: typography.game,
    fontWeight: "bold",
  },
  hudTextLives: {
    color: "#e53935",
    fontSize: typography.sizes.md,
    fontFamily: typography.game,
    fontWeight: "bold",
  },
  hudTextWave: {
    color: colors.cyan,
    fontSize: typography.sizes.md,
    fontFamily: typography.game,
    fontWeight: "bold",
  },
  hudTextPhase: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontFamily: typography.game,
  },
  canvasTouchArea: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  overlayTitle: {
    color: colors.white,
    fontSize: typography.sizes.xxl,
    fontFamily: typography.game,
    fontWeight: "bold",
    marginBottom: spacing.md,
  },
  overlaySub: {
    color: colors.cyan,
    fontSize: typography.sizes.lg,
    fontFamily: typography.game,
    marginBottom: spacing.xl,
  },
  restartButton: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 6,
  },
  restartButtonText: {
    color: colors.background,
    fontFamily: typography.game,
    fontWeight: "bold",
  },
});
