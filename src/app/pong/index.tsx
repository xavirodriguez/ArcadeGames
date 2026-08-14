import { useState, useEffect, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform } from "react-native";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { PongControls } from "@/components/PongControls";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { usePongGame } from "@/hooks/usePongGame";
import { useMultiplayer } from "@tiny-aster/react-native";
import { SeedWidget } from "@/components/SeedWidget";
import { DailyChallengeBanner } from "@/components/DailyChallengeBanner";
import { DailyResultsOverlay } from "@/components/DailyResultsOverlay";
import { MutatorService } from "@/services/MutatorService";
import { MutatorBadge } from "@/components/MutatorBadge";
import { Mutator } from "@/config/MutatorConfig";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { MULTIPLAYER_CONFIG } from "@/config/MultiplayerConfig";
import { useGameSession } from "@/hooks/useGameSession";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticSelection } from "../../utils/haptics";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { colors } from "../../theme";
import {
  GameScreen,
  GameTitle,
  GameInstructions,
  NeonButton,
  BackButton,
  PlayerNameInput,
} from "../../components/ui";

export default function PongScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ seed?: string; isDaily?: string }>();
  const [playerName, setPlayerName] = useState("");
  const [initialSeed, setInitialSeed] = useState<number | undefined>();

  // Sync player name from profile
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
  const [mode, setMode] = useState<"local" | "ai" | "online">("local");
  const [isDaily, setIsDaily] = useState(false);

  const [activeMutators, setActiveMutators] = useState<Mutator[]>([]);

  const isMulti = mode === "online";
  const { game, gameState, handleInput, isReady, restart } = usePongGame(started ? mode : null, initialSeed);

  // Handle incoming daily challenge parameters
  useEffect(() => {
    if (params.seed && params.isDaily === "true" && !started) {
      const dailySeed = parseInt(params.seed, 10);
      if (!isNaN(dailySeed)) {
        setIsDaily(true);
        setMode("ai");
        setInitialSeed(dailySeed);
        setStarted(true);
      }
    }
  }, [params.seed, params.isDaily, started]);

  // Ensure game starts with the correct seed if set via params
  useEffect(() => {
    if (started && isDaily && initialSeed !== undefined && isReady && game?.getSeed() !== initialSeed) {
        restart(initialSeed);
    }
  }, [started, isDaily, initialSeed, isReady, game, restart]);

  const { room, connected, serverState, localTickRef } = useMultiplayer("pong", playerName, isMulti && started);

  useEffect(() => {
    if (isMulti && serverState && game) {
      game.updateFromServer(serverState);
    }
  }, [isMulti, serverState, game]);

  useEffect(() => {
    if (isMulti && room && started) {
      room.send("ready");
    }
  }, [isMulti, room, started]);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then(enabled => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("pong"));
      }
    });
  }, []);

  const { showDailyResults, setShowDailyResults } = useGameSession({
    gameId: "pong",
    isDaily,
    seed: game?.getSeed(),
    gameState: gameState ?? { isGameOver: false },
  });

  // Web keyboard controls for restarting on Game Over
  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (gameState?.isGameOver && !isDaily && (e.code === "KeyR" || e.code === "Enter")) {
        e.preventDefault();
        hapticSelection();
        game.restart();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [game, isReady, gameState?.isGameOver, isDaily]);

  if (!started) {
    return (
      <StartScreen
        title="PONG"
        onStart={(selectedMode) => {
          hapticSelection();
          setMode(selectedMode);
          if (initialSeed !== undefined) {
            restart(initialSeed);
          }
          setStarted(true);
        }}
        playerName={playerName}
        onPlayerNameChange={handlePlayerNameChange}
        instructions={Platform.OS === "web" ? t.pong.instructions : t.pong.local_mode}
        initialSeed={initialSeed}
        onSeedChange={setInitialSeed}
        onStartDaily={(dailySeed) => {
          hapticSelection();
          setInitialSeed(dailySeed);
          setIsDaily(true);
          setMode("ai");
          setStarted(true);
        }}
        activeMutators={activeMutators}
      />
    );
  }

  if (!game || !isReady) return null;

  const handleGameInput = (input: Record<string, boolean>) => {
      if (isMulti && room) {
          room.send("input", {
              tick: localTickRef.current,
              input: input
          });
      } else {
          handleInput(input);
      }
  };

  return (
    <GameErrorBoundary gameId="pong">
    <SafeAreaProvider>
      <View style={styles.container}>
        <BackButton label={t.common.menu} />

        {isMulti && !connected && (
            <View style={styles.multiOverlay}>
                <Text style={styles.overlayText}>{t.common.connecting}</Text>
            </View>
        )}

        <View style={styles.scoreBoard}>
            <Text style={styles.scoreTextP1}>{gameState?.scoreP1 ?? 0}</Text>
            <Text style={styles.scoreSeparator}>:</Text>
            <Text style={styles.scoreTextP2}>{gameState?.scoreP2 ?? 0}</Text>
        </View>

        <CanvasRenderer
          world={game.getWorld()}
          gameLoop={game.getGameLoop()}
          onInitialize={(renderer) => game.initializeRenderer(renderer)}
        />

        <PongControls
          onP1Up={(pressed) => handleGameInput({ p1Up: pressed })}
          onP1Down={(pressed) => handleGameInput({ p1Down: pressed })}
          onP2Up={(pressed) => { if (mode === "local") handleGameInput({ p2Up: pressed }); }}
          onP2Down={(pressed) => { if (mode === "local") handleGameInput({ p2Down: pressed }); }}
          showP2Controls={mode === "local"}
        />

        <DebugOverlay game={game} room={room} />

        {gameState?.isGameOver && !isDaily && (
            <View style={styles.overlay}>
                <Text style={styles.overlayText}>{t.common.game_over}</Text>
                <TouchableOpacity
                  style={styles.restartButton}
                  onPress={() => {
                    hapticSelection();
                    game.restart();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t.accessibility.restart_game_label}
                  accessibilityHint={t.accessibility.restart_game_hint}
                >
                    <Text style={styles.restartButtonText}>{t.common.retry}</Text>
                </TouchableOpacity>
            </View>
        )}

        {showDailyResults && game?.getSeed() !== undefined && (
          <View style={styles.overlay}>
            <DailyResultsOverlay
              gameId="pong"
              score={Math.max(gameState?.scoreP1 || 0, gameState?.scoreP2 || 0)}
              seed={game?.getSeed()}
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
  onStart: (mode: "local" | "ai" | "online") => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  instructions: string;
  initialSeed?: number;
  onSeedChange?: (seed: number) => void;
  onStartDaily?: (seed: number) => void;
  activeMutators?: Mutator[];
}> = ({
  title,
  onStart,
  playerName,
  onPlayerNameChange,
  instructions,
  initialSeed,
  onSeedChange,
  onStartDaily,
  activeMutators = [],
}) => {
  const { t } = useTranslation();
  return (
    <GameScreen>
      <BackButton label={t.common.menu} />
      <GameTitle glowColor={colors.cyan}>{title}</GameTitle>

      <PlayerNameInput
        label={t.accessibility.player_name_label}
        value={playerName}
        onChangeText={onPlayerNameChange}
        placeholder={t.common.your_name}
      />

      <GameInstructions>{instructions}</GameInstructions>

      {onStartDaily && <DailyChallengeBanner gameId="pong" onPlay={onStartDaily} />}

      <MutatorBadge mutators={activeMutators} />

      {onSeedChange && (
        <SeedWidget
          seed={initialSeed || 0}
          onSeedEnter={onSeedChange}
          style={{ marginBottom: 30 }}
        />
      )}

      <View style={sharedScreenStyles.buttonRow}>
          <NeonButton
            variant="white"
            bordered
            onPress={() => onStart("local")}
            accessibilityLabel={`${t.accessibility.local_p1} - Modo Local`}
            accessibilityHint="Inicia una partida local de dos jugadores en la misma pantalla"
          >
              {t.accessibility.local_p1}
          </NeonButton>
          <View style={{ width: 10 }} />
          <NeonButton
            variant="white"
            bordered
            onPress={() => onStart("ai")}
            accessibilityLabel={t.pong.vs_ai}
            accessibilityHint="Inicia una partida individual contra la inteligencia artificial"
          >
              {t.pong.vs_ai}
          </NeonButton>

          {MULTIPLAYER_CONFIG.STATE !== 'hidden' && (
              <>
                  <View style={{ width: 10 }} />
                  <NeonButton
                    variant="cyan"
                    onPress={() => onStart("online")}
                    accessibilityLabel={t.common.multi}
                    accessibilityHint="Busca una partida multijugador competitiva en línea"
                  >
                      {t.common.multi}
                  </NeonButton>
              </>
          )}
      </View>
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
  scoreBoard: {
    position: "absolute",
    top: 60,
    flexDirection: "row",
    zIndex: 10,
    alignItems: "center",
  },
  scoreTextP1: {
    color: colors.pink,
    fontSize: 54,
    fontFamily: "monospace",
    fontWeight: "bold",
    textShadowColor: colors.pink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  scoreTextP2: {
    color: colors.cyan,
    fontSize: 54,
    fontFamily: "monospace",
    fontWeight: "bold",
    textShadowColor: colors.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  scoreSeparator: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 48,
    fontFamily: "monospace",
    fontWeight: "bold",
    marginHorizontal: 30,
    textShadowColor: "rgba(255, 255, 255, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  multiOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  overlayText: {
    color: colors.white,
    fontSize: 32,
    fontFamily: "monospace",
    marginBottom: 20,
  },
  restartButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  restartButtonText: {
    color: colors.background,
    fontWeight: "bold",
  }
});
