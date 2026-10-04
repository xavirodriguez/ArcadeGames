import { useState, useEffect, useCallback, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useTowerDefenseGame } from "@/hooks/useTowerDefenseGame";
import { useTranslation } from "@/hooks/useTranslation";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { RadialBackground } from "@/components/RadialBackground";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { hapticSelection } from "@/utils/haptics";
import { colors } from "../../theme";
import {
  GameScreen,
  GameTitle,
  GameInstructions,
  PlayerNameInput,
  HighScoreText,
  BackButton,
  NeonButton,
  GameLayoutShell,
} from "../../components/ui";

export default function TowerDefenseScreen() {
  return (
    <GameErrorBoundary gameId="tower-defense">
      <TowerDefenseContent />
    </GameErrorBoundary>
  );
}

function TowerDefenseContent() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [initialSeed, setInitialSeed] = useState<number | undefined>();

  useEffect(() => {
    PlayerProfileService.getProfile().then((p) => {
      setPlayerName(p.displayName);
    });
  }, []);

  const handlePlayerNameChange = (name: string) => {
    setPlayerName(name);
    PlayerProfileService.updateDisplayName(name);
  };

  const { game, gameState, handleInput, isPaused, isReady, togglePause, highScore, seed, restartWithSeed } =
    useTowerDefenseGame(started, initialSeed);

  useKeyboardControls(game, isReady);

  const handleTowerSelection = useCallback(
    (towerType: string) => {
      handleInput({ selectedTowerType: towerType });
      game?.setInputState?.({ selectedTowerType: towerType });
    },
    [handleInput, game]
  );

  const handleStartWave = useCallback(() => {
    handleInput({ startWave: true });
    game?.setInputState?.({ startWave: true });
  }, [handleInput, game]);

  if (!started) {
    return (
      <StartScreen
        title={t.menu?.tower_defense ?? "TOWER DEFENSE"}
        highScore={highScore ?? 0}
        onStart={() => {
          hapticSelection();
          if (initialSeed !== undefined) {
            restartWithSeed?.(initialSeed);
          }
          setStarted(true);
        }}
        playerName={playerName}
        onPlayerNameChange={handlePlayerNameChange}
        instructions={
          Platform.OS === "web"
            ? "Click grid to place towers. Defend base against creep waves."
            : "Tap grid to build towers and defend your base."
        }
      />
    );
  }

  if (!game || !isReady) {
    return (
      <View style={sharedScreenStyles.container}>
        <RadialBackground />
        <ActivityIndicator size="large" color={colors.cyan} />
        <Text style={styles.loadingText}>Loading Tower Defense...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <GameLayoutShell
        style={sharedScreenStyles.container}
        backgroundSlot={<RadialBackground />}
        topLeftSlot={
          <TouchableOpacity
            style={sharedScreenStyles.backButton}
            onPress={() => {
              hapticSelection();
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={t.accessibility?.close_button ?? "Back"}
          >
            <Text style={sharedScreenStyles.backButtonText}>← {t.accessibility?.close_button ?? "Menu"}</Text>
          </TouchableOpacity>
        }
        centerHudSlot={
          <View style={styles.hud}>
            <Text style={styles.hudText}>GOLD {gameState?.gold ?? 0}</Text>
            <Text style={styles.hudText}>LIVES {gameState?.lives ?? 0}</Text>
            <Text style={styles.hudText}>WAVE {gameState?.wave ?? 0}</Text>
            <Text style={styles.hudText}>SCORE {gameState?.score ?? 0}</Text>
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
            <View style={styles.towerSelector}>
              {["basic", "rapid", "sniper", "frost"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.towerButton,
                    gameState?.selectedTowerType === type && styles.towerButtonSelected,
                  ]}
                  onPress={() => handleTowerSelection(type)}
                >
                  <Text style={styles.towerButtonText}>{type.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.startWaveButton} onPress={handleStartWave}>
              <Text style={styles.startWaveButtonText}>START WAVE</Text>
            </TouchableOpacity>
          </View>
        }
        debugSlot={<DebugOverlay game={game} />}
        overlaySlot={
          gameState?.phase === "game_over" ? (
            <View style={sharedScreenStyles.overlay}>
              <Text style={sharedScreenStyles.overlayText}>Game Over</Text>
              <TouchableOpacity
                style={styles.restartButton}
                onPress={() => {
                  hapticSelection();
                  game.restart();
                }}
              >
                <Text style={styles.restartButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaProvider>
  );
}

const StartScreen: FC<{
  title: string;
  highScore: number;
  onStart: () => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  instructions: string;
}> = ({ title, highScore, onStart, playerName, onPlayerNameChange, instructions }) => {
  const { t } = useTranslation();
  return (
    <GameScreen>
      <BackButton label={t.accessibility?.close_button ?? "Menu"} />
      <GameTitle glowColor={colors.cyan}>{title}</GameTitle>
      <PlayerNameInput
        label={t.accessibility?.player_name_label ?? "Player Name"}
        value={playerName}
        onChangeText={onPlayerNameChange}
        placeholder="Your Name"
      />
      <GameInstructions>{instructions}</GameInstructions>
      <HighScoreText label="Record" score={highScore} />
      <NeonButton
        variant="white"
        onPress={() => {
          hapticSelection();
          onStart();
        }}
        accessibilityLabel="Solo"
      >
        Solo
      </NeonButton>
    </GameScreen>
  );
};

const styles = StyleSheet.create({
  loadingText: {
    color: colors.white,
    marginTop: 20,
    fontFamily: "monospace",
    fontSize: 18,
  },
  hud: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    zIndex: 10,
  },
  hudText: {
    color: colors.cyan,
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: "bold",
  },
  controls: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  towerSelector: {
    flexDirection: "row",
    gap: 8,
  },
  towerButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderColor: colors.cyan,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  towerButtonSelected: {
    backgroundColor: colors.cyan,
  },
  towerButtonText: {
    color: colors.white,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "bold",
  },
  startWaveButton: {
    backgroundColor: colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  startWaveButtonText: {
    color: colors.background,
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "bold",
  },
  restartButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20,
    userSelect: "none",
  },
  restartButtonText: {
    color: colors.background,
    fontWeight: "bold",
    userSelect: "none",
  },
});
