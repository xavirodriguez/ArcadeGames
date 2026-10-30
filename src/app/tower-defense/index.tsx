import { useState, useEffect, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, GestureResponderEvent, LayoutChangeEvent } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { GameRenderer } from "@/components/GameRenderer";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useTowerDefenseGame } from "@/hooks/useTowerDefenseGame";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticSelection } from "../../utils/haptics";
import { colors, spacing, typography } from "../../theme";
import { touchToCellCoords, cellCenter, fitContain } from "../../games/tower-defense/MapUtils";
import towerDefenseConfigRaw from "../../games/tower-defense/config/tower-defense.json";
import type { TowerDefenseConfig } from "../../games/tower-defense/types/TowerDefenseConfigSchema";
import type { ThreatInfo } from "../../games/tower-defense/types/TowerDefenseTypes";
import { paperDuskConceptPack } from "../../theme/conceptPacks/paperDuskConceptPack";
import type { Theme } from "@tiny-aster/core";

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
  const [selectedThemeKey, setSelectedThemeKey] = useState<"default" | "paper_dusk">("default");

  useEffect(() => {
    if (params.seed) {
      const parsedSeed = parseInt(params.seed, 10);
      if (!isNaN(parsedSeed)) {
        setInitialSeed(parsedSeed);
      }
    }
  }, [params.seed]);

  const activeTheme = selectedThemeKey === "paper_dusk" ? paperDuskConceptPack : undefined;

  if (!started) {
    return (
      <StartScreen
        title="TOWER DEFENSE"
        selectedThemeKey={selectedThemeKey}
        onSelectTheme={(key) => setSelectedThemeKey(key)}
        onStart={() => {
          hapticSelection();
          setStarted(true);
        }}
        instructions={t["tower-defense"]?.instructions || "Toca celdas para construir torres y defiende la base."}
      />
    );
  }

  return (
    <GameErrorBoundary gameId="tower-defense">
      <TowerDefensePlay initialSeed={initialSeed} theme={activeTheme} />
    </GameErrorBoundary>
  );
}

function TowerDefensePlay({ initialSeed, theme }: { initialSeed?: number; theme?: Theme }) {
  const { t } = useTranslation();
  const [selectedTower, setSelectedTower] = useState<string>("basic");
  const [feedback, setFeedback] = useState<string | null>(null);

  const { game, gameState, handleInput, isReady, restartWithSeed } =
    useTowerDefenseGame(true, initialSeed, theme);

  useEffect(() => {
    if (!game) return;
    const bus = game.getEventBus();
    if (!bus) return;

    let timerId: ReturnType<typeof setTimeout> | undefined;
    const showMsg = (msg: string) => {
      setFeedback(msg);
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => setFeedback(null), 2500);
    };

    const unsubBuildFailed = bus.on("tower:build_failed", (ev: unknown) => {
      const payload = ev as { reason?: string };
      if (payload?.reason === "out_of_bounds") showMsg("Toca una celda del mapa primero");
      else if (payload?.reason === "not_buildable") showMsg("Celda no construible (solo celdas B)");
      else if (payload?.reason === "cell_occupied") showMsg("Esa celda ya tiene una torre");
      else if (payload?.reason === "insufficient_gold") showMsg("Oro insuficiente");
      else showMsg("No se pudo construir la torre");
    });

    const unsubUpgradeFailed = bus.on("tower:upgrade_failed", (ev: unknown) => {
      const payload = ev as { reason?: string };
      if (payload?.reason === "no_tower_at_cell") showMsg("Toca la torre que deseas mejorar");
      else if (payload?.reason === "max_level_reached") showMsg("Torre en nivel máximo");
      else if (payload?.reason === "insufficient_gold") showMsg("Oro insuficiente para mejorar");
      else showMsg("No se pudo mejorar la torre");
    });

    const unsubSellFailed = bus.on("tower:sell_failed", (ev: unknown) => {
      const payload = ev as { reason?: string };
      if (payload?.reason === "no_tower_at_cell") showMsg("Toca la torre que deseas vender");
    });

    const unsubBuilt = bus.on("tower:built", () => showMsg("¡Torre construida!"));
    const unsubUpgraded = bus.on("tower:upgraded", () => showMsg("¡Torre mejorada!"));
    const unsubSold = bus.on("tower:sold", () => showMsg("Torre vendida"));

    return () => {
      if (timerId) clearTimeout(timerId);
      unsubBuildFailed();
      unsubUpgradeFailed();
      unsubSellFailed();
      unsubBuilt();
      unsubUpgraded();
      unsubSold();
    };
  }, [game]);

  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number }>({
    width: towerDefenseConfigRaw.worldWidth,
    height: towerDefenseConfigRaw.worldHeight,
  });

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      const fitted = fitContain(
        width,
        height,
        towerDefenseConfigRaw.worldWidth,
        towerDefenseConfigRaw.worldHeight
      );
      setCanvasLayout(fitted);
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
    const nativeEv = e.nativeEvent;
    const locationX =
      "locationX" in nativeEv && typeof (nativeEv as { locationX?: unknown }).locationX === "number"
        ? (nativeEv as { locationX: number }).locationX
        : "offsetX" in nativeEv && typeof (nativeEv as { offsetX?: unknown }).offsetX === "number"
          ? (nativeEv as { offsetX: number }).offsetX
          : 0;
    const locationY =
      "locationY" in nativeEv && typeof (nativeEv as { locationY?: unknown }).locationY === "number"
        ? (nativeEv as { locationY: number }).locationY
        : "offsetY" in nativeEv && typeof (nativeEv as { offsetY?: unknown }).offsetY === "number"
          ? (nativeEv as { offsetY: number }).offsetY
          : 0;
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
    const cols = towerDefenseConfigRaw.GRID_COLS ?? 16;
    const rows = towerDefenseConfigRaw.GRID_ROWS ?? 12;
    if (cell.col < 0 || cell.col >= cols || cell.row < 0 || cell.row >= rows) {
      return;
    }

    const worldPos = cellCenter(cell.col, cell.row, layout);
    handleInput({
      cursorX: worldPos.x,
      cursorY: worldPos.y,
      selectedTowerType: selectedTower,
      build: true,
    });
  };

  if (!game || !isReady) {
    return (
      <GameScreen>
        <BackButton label={t.common.menu} />
        <Text style={styles.loadingText}>CARGANDO...</Text>
      </GameScreen>
    );
  }

  const aliveEnemies = game.getWorld().getResource<ThreatInfo>("ThreatInfo")?.alive ?? 0;
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
    <SafeAreaProvider>
      <GameLayoutShell
        style={styles.container}
        topLeftSlot={<BackButton label={t.common.menu} />}
        centerHudSlot={
          <View
            style={[
              styles.hudBoard,
              (gameState?.lives ?? 0) <= 5 && styles.hudBoardCritical,
              gameState?.phase === "victory" && styles.hudBoardVictory,
              gameState?.phase === "game_over" && styles.hudBoardCritical,
            ]}
            accessibilityLabel="Estado de la partida"
          >
            <Text style={styles.hudTextGold}>🪙 {gameState?.gold ?? 0}</Text>
            <Text style={[styles.hudTextLives, (gameState?.lives ?? 0) <= 5 && styles.hudTextCritical]}>
              ❤️ {gameState?.lives ?? 0}
            </Text>
            <Text style={styles.hudTextEnemies}>👾 {aliveEnemies}</Text>
            <Text style={styles.hudTextWave}>🌊 Wave {(gameState?.wave ?? 0) + 1}</Text>
            <Text
              style={[
                styles.hudTextPhase,
                gameState?.phase === "wave" && styles.hudTextPhaseActive,
                gameState?.phase === "intermission" && styles.hudTextPhaseIntermission,
                gameState?.phase === "victory" && styles.hudTextPhaseVictory,
                gameState?.phase === "game_over" && styles.hudTextPhaseDanger,
              ]}
            >
              {phaseText}
            </Text>
          </View>
        }
        canvasSlot={
          <View style={styles.canvasContainer} onLayout={handleContainerLayout}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleCanvasTouch}
              style={[
                styles.canvasTouchArea,
                { width: canvasLayout.width, height: canvasLayout.height },
              ]}
            >
              {Platform.OS === "web" ? (
                <CanvasRenderer
                  world={game.getWorld()}
                  gameLoop={game.getGameLoop()}
                  onInitialize={(renderer) => game.initializeRenderer(renderer)}
                />
              ) : (
                <GameRenderer
                  world={game.getWorld()}
                  gameLoop={game.getGameLoop()}
                  onInitialize={(renderer) => game.initializeRenderer(renderer)}
                />
              )}
            </TouchableOpacity>
          </View>
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
            {feedback && (
              <View style={styles.toastContainer}>
                <Text style={styles.toastText}>{feedback}</Text>
              </View>
            )}
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
  );
}

const StartScreen: FC<{
  title: string;
  selectedThemeKey: "default" | "paper_dusk";
  onSelectTheme: (key: "default" | "paper_dusk") => void;
  onStart: () => void;
  instructions: string;
}> = ({ title, selectedThemeKey, onSelectTheme, onStart, instructions }) => {
  const { t } = useTranslation();
  return (
    <GameScreen>
      <BackButton label={t.common.menu} />
      <GameTitle glowColor={colors.cyan}>{title}</GameTitle>
      <GameInstructions>{instructions}</GameInstructions>

      <View style={styles.themeSelectorContainer}>
        <Text style={styles.themeSelectorLabel}>TEMA VISUAL:</Text>
        <View style={styles.themeButtonRow}>
          <TouchableOpacity
            style={[
              styles.themeOptionButton,
              selectedThemeKey === "default" && styles.themeOptionSelected,
            ]}
            onPress={() => {
              hapticSelection();
              onSelectTheme("default");
            }}
          >
            <Text
              style={[
                styles.themeOptionText,
                selectedThemeKey === "default" && styles.themeOptionTextSelected,
              ]}
            >
              Default Neon
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOptionButton,
              selectedThemeKey === "paper_dusk" && styles.themeOptionSelected,
            ]}
            onPress={() => {
              hapticSelection();
              onSelectTheme("paper_dusk");
            }}
          >
            <Text
              style={[
                styles.themeOptionText,
                selectedThemeKey === "paper_dusk" && styles.themeOptionTextSelected,
              ]}
            >
              Paper Dusk
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 0px 12px rgba(0, 240, 255, 0.22)" }
      : {
          shadowColor: colors.cyan,
          shadowOpacity: 0.22,
          shadowRadius: 12,
          elevation: 8,
        }),
  },
  hudBoardCritical: {
    borderColor: "#ff5252",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 0px 12px rgba(255, 82, 82, 0.36)" }
      : { shadowColor: "#ff5252", shadowOpacity: 0.36 }),
  },
  hudBoardVictory: {
    borderColor: "#62f6bd",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 0px 12px rgba(98, 246, 189, 0.22)" }
      : { shadowColor: "#62f6bd" }),
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
  hudTextEnemies: {
    color: "#d78bff",
    fontSize: typography.sizes.md,
    fontFamily: typography.game,
    fontWeight: "bold",
  },
  hudTextCritical: {
    color: "#ff5252",
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
  hudTextPhaseActive: {
    color: "#ffb36b",
    fontWeight: "bold",
  },
  hudTextPhaseIntermission: {
    color: colors.gold,
    fontWeight: "bold",
  },
  hudTextPhaseVictory: {
    color: "#62f6bd",
    fontWeight: "bold",
  },
  hudTextPhaseDanger: {
    color: "#ff5252",
    fontWeight: "bold",
  },
  canvasContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  canvasTouchArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
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
  loadingText: {
    color: colors.cyan,
    fontFamily: typography.game,
    fontSize: typography.sizes.xl,
    marginTop: spacing.xl,
  },
  toastContainer: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cyan,
    zIndex: 90,
  },
  toastText: {
    color: colors.cyan,
    fontFamily: typography.game,
    fontSize: typography.sizes.sm,
    fontWeight: "bold",
    textAlign: "center",
  },
  themeSelectorContainer: {
    marginVertical: spacing.md,
    alignItems: "center",
  },
  themeSelectorLabel: {
    color: colors.white,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
  },
  themeButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  themeOptionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  themeOptionSelected: {
    borderColor: colors.cyan,
    backgroundColor: "rgba(0, 240, 255, 0.2)",
  },
  themeOptionText: {
    color: colors.white,
    fontFamily: typography.game,
    fontSize: typography.sizes.xs,
  },
  themeOptionTextSelected: {
    color: colors.cyan,
    fontWeight: "bold",
  },
});
