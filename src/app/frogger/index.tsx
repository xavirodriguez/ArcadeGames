import { useState, useEffect, useCallback, useRef, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform } from "react-native";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useFroggerGame } from "@/hooks/useFroggerGame";
import { SeedWidget } from "@/components/SeedWidget";
import { DailyChallengeBanner } from "@/components/DailyChallengeBanner";
import { DailyResultsOverlay } from "@/components/DailyResultsOverlay";
import { MutatorService } from "@/services/MutatorService";
import { MutatorBadge } from "@/components/MutatorBadge";
import { Mutator } from "@/config/MutatorConfig";
import { FroggerInput } from "../../games/frogger";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { useGameSession } from "@/hooks/useGameSession";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { hapticSelection } from "../../utils/haptics";
import { useTranslation } from "../../hooks/useTranslation";
import { colors } from "../../theme";
import {
  GameScreen,
  GameTitle,
  GameInstructions,
  PlayerNameInput,
  HighScoreText,
  BackButton,
  NeonButton,
} from "../../components/ui";

export default function FroggerScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ seed?: string; isDaily?: string }>();
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

  const [started, setStarted] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const { game, gameState, handleInput, isReady, highScore, seed, restartWithSeed } = useFroggerGame(started, false, initialSeed);

  useKeyboardControls(game, isReady);

  const handleInitializeRenderer = useCallback(
    (renderer: any) => {
      game?.initializeRenderer(renderer);
    },
    [game]
  );

  useEffect(() => {
    if (params.seed && params.isDaily === "true" && !started) {
      const dailySeed = parseInt(params.seed, 10);
      if (!isNaN(dailySeed)) {
        setIsDaily(true);
        setInitialSeed(dailySeed);
        setStarted(true);
      }
    }
  }, [params.seed, params.isDaily, started]);

  const requestedSeedRestartRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (
      started &&
      isDaily &&
      initialSeed !== undefined &&
      isReady &&
      seed !== initialSeed &&
      requestedSeedRestartRef.current !== initialSeed
    ) {
      requestedSeedRestartRef.current = initialSeed;
      restartWithSeed(initialSeed);
    }
  }, [started, isDaily, initialSeed, isReady, seed, restartWithSeed]);

  const [activeMutators, setActiveMutators] = useState<Mutator[]>([]);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then((enabled) => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("frogger"));
      }
    });
  }, []);

  const { showDailyResults, setShowDailyResults } = useGameSession({
    gameId: "frogger",
    isDaily,
    seed,
    gameState,
  });

  const handleGameInput = useCallback((input: Partial<FroggerInput>) => {
    handleInput(input);
    game?.setInputState(input);
  }, [handleInput, game]);

  if (!started) {
    return (
      <StartScreen
        title="FROGGER"
        highScore={highScore}
        onStart={() => {
          hapticSelection();
          setStarted(true);
        }}
        playerName={playerName}
        onPlayerNameChange={handlePlayerNameChange}
        instructions={t?.frogger?.instructions || "W/A/S/D or Arrows: Jump Up/Down/Left/Right"}
        onSeedChange={setInitialSeed}
        onStartDaily={(dailySeed) => {
          hapticSelection();
          restartWithSeed(dailySeed);
          setIsDaily(true);
          setStarted(true);
        }}
        activeMutators={activeMutators}
      />
    );
  }

  if (!game || !isReady) return null;

  return (
    <GameErrorBoundary gameId="frogger">
      <SafeAreaProvider>
        <View style={sharedScreenStyles.container}>
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
            accessibilityLabel={t?.common?.back || "Back"}
            accessibilityHint="Regresa a la pantalla principal"
          >
            <Text style={sharedScreenStyles.backButtonText}>← {t?.common?.menu || "Menu"}</Text>
          </TouchableOpacity>

          {/* HUD Score Header */}
          <View style={styles.hudOverlay} pointerEvents="none">
            <View style={styles.hudRow}>
              <Text style={styles.hudText}>SCORE: {gameState.score}</Text>
              <Text style={styles.hudText}>LIVES: {gameState.lives}</Text>
              <Text style={styles.hudText}>LEVEL: {gameState.level}</Text>
              <Text style={styles.hudText}>PADS: {gameState.occupiedLilyPads}/{gameState.totalLilyPads}</Text>
            </View>
          </View>

          <CanvasRenderer
            world={game.getWorld()}
            gameLoop={game.getGameLoop()}
            onInitialize={handleInitializeRenderer}
          />

          {/* D-Pad Touch Controls */}
          <View style={styles.dpadContainer}>
            <TouchableOpacity
              style={[styles.dpadButton, styles.dpadUp]}
              onPressIn={() => handleGameInput({ moveUp: true })}
              onPressOut={() => handleGameInput({ moveUp: false })}
            >
              <Text style={styles.dpadText}>▲</Text>
            </TouchableOpacity>
            <View style={styles.dpadHorizontalRow}>
              <TouchableOpacity
                style={[styles.dpadButton, styles.dpadLeft]}
                onPressIn={() => handleGameInput({ moveLeft: true })}
                onPressOut={() => handleGameInput({ moveLeft: false })}
              >
                <Text style={styles.dpadText}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dpadButton, styles.dpadRight]}
                onPressIn={() => handleGameInput({ moveRight: true })}
                onPressOut={() => handleGameInput({ moveRight: false })}
              >
                <Text style={styles.dpadText}>▶</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.dpadButton, styles.dpadDown]}
              onPressIn={() => handleGameInput({ moveDown: true })}
              onPressOut={() => handleGameInput({ moveDown: false })}
            >
              <Text style={styles.dpadText}>▼</Text>
            </TouchableOpacity>
          </View>

          <DebugOverlay game={game} />

          {/* Game Over Overlay */}
          {gameState.isGameOver && !isDaily && (
            <View style={styles.gameOverOverlay}>
              <Text style={styles.gameOverText}>{t?.common?.game_over || "GAME OVER"}</Text>
              <Text style={styles.finalScoreText}>FINAL SCORE: {gameState.score}</Text>
              <TouchableOpacity
                style={styles.restartButton}
                onPress={() => {
                  hapticSelection();
                  game.restart();
                }}
              >
                <Text style={styles.restartButtonText}>{t?.common?.retry || "RETRY"}</Text>
              </TouchableOpacity>
            </View>
          )}

          {showDailyResults && seed !== undefined && (
            <View style={sharedScreenStyles.overlay}>
              <DailyResultsOverlay
                gameId="frogger"
                score={gameState.score}
                seed={seed}
                onClose={() => setShowDailyResults(false)}
              />
            </View>
          )}
        </View>
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

const StartScreen: FC<{
  title: string;
  highScore: number;
  onStart: () => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  instructions: string;
  onSeedChange?: (seed: number) => void;
  onStartDaily?: (seed: number) => void;
  activeMutators?: Mutator[];
}> = ({
  title,
  highScore,
  onStart,
  playerName,
  onPlayerNameChange,
  instructions,
  onSeedChange,
  onStartDaily,
  activeMutators = [],
}) => {
  const { t } = useTranslation();
  return (
    <GameScreen>
      <BackButton label={t?.common?.menu || "Menu"} />
      <GameTitle glowColor="#39FF14">{title}</GameTitle>

      <PlayerNameInput
        label={t?.accessibility?.player_name_label || "Player Name"}
        value={playerName}
        onChangeText={onPlayerNameChange}
        placeholder={t?.common?.your_name || "Your name"}
      />

      <GameInstructions>{instructions}</GameInstructions>
      <HighScoreText label={t?.common?.record || "Record"} score={highScore} />

      {onStartDaily && <DailyChallengeBanner gameId="frogger" onPlay={onStartDaily} />}

      <MutatorBadge mutators={activeMutators} />

      {onSeedChange && (
        <SeedWidget
          seed={0}
          onSeedEnter={onSeedChange}
          style={styles.seedWidget}
        />
      )}

      <View style={sharedScreenStyles.buttonRow}>
        <NeonButton
          variant="white"
          onPress={() => {
            hapticSelection();
            onStart();
          }}
          accessibilityLabel={t?.common?.solo || "Solo"}
          accessibilityHint="Inicia una partida individual de Frogger"
        >
          {t?.common?.solo || "Solo"}
        </NeonButton>
      </View>
    </GameScreen>
  );
};

const styles = StyleSheet.create({
  hudOverlay: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: "center",
  },
  hudRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#39FF14",
    gap: 16,
  },
  hudText: {
    color: "#39FF14",
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "bold",
  },
  dpadContainer: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    alignItems: "center",
    zIndex: 10,
  },
  dpadHorizontalRow: {
    flexDirection: "row",
    gap: 30,
    marginVertical: 4,
  },
  dpadButton: {
    width: 60,
    height: 60,
    backgroundColor: "rgba(57, 255, 20, 0.2)",
    borderWidth: 2,
    borderColor: "#39FF14",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  dpadUp: {},
  dpadDown: {},
  dpadLeft: {},
  dpadRight: {},
  dpadText: {
    color: "#39FF14",
    fontSize: 24,
    fontWeight: "bold",
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  gameOverText: {
    color: "#FF2A6D",
    fontSize: 36,
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 10,
  },
  finalScoreText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "monospace",
    marginBottom: 20,
  },
  restartButton: {
    backgroundColor: "#39FF14",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  restartButtonText: {
    color: "#000000",
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  seedWidget: {
    marginBottom: 30,
  },
});
