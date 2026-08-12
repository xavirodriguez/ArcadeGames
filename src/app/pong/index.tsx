import { useState, useEffect, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, TextInput } from "react-native";
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

export default function PongScreen() {
  const params = useLocalSearchParams<{ seed?: string; isDaily?: string }>();
  const [playerName, setPlayerName] = useState("Jugador");
  const [initialSeed, setInitialSeed] = useState<number | undefined>();
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

  if (!started) {
    return (
      <StartScreen
        title="PONG"
        onStart={(selectedMode) => {
          setMode(selectedMode);
          if (initialSeed !== undefined) {
            restart(initialSeed);
          }
          setStarted(true);
        }}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        instructions={Platform.OS === "web" ? "P1: W/S  P2: Flechas" : "Modo Local"}
        initialSeed={initialSeed}
        onSeedChange={setInitialSeed}
        onStartDaily={(dailySeed) => {
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
        >
          <Text style={styles.backButtonText}>← MENÚ</Text>
        </TouchableOpacity>

        {isMulti && !connected && (
            <View style={styles.multiOverlay}>
                <Text style={styles.overlayText}>Conectando...</Text>
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
                <Text style={styles.overlayText}>FIN DEL JUEGO</Text>
                <TouchableOpacity style={styles.restartButton} onPress={() => game.restart()}>
                    <Text style={styles.restartButtonText}>REINTENTAR</Text>
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
  return (
    <SafeAreaProvider>
      <View style={styles.startScreen}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
        >
          <Text style={styles.backButtonText}>← MENÚ</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>

        <Text style={styles.inputLabel} nativeID="playerNameLabel">
          Tu nombre
        </Text>
        <TextInput
            style={styles.input}
            value={playerName}
            onChangeText={onPlayerNameChange}
            placeholder="Tu nombre"
            placeholderTextColor="#666"
            accessibilityLabel="Nombre del jugador"
            accessibilityLabelledBy="playerNameLabel"
        />

        <Text style={styles.instructions}>{instructions}</Text>

        {onStartDaily && <DailyChallengeBanner gameId="pong" onPlay={onStartDaily} />}

        <MutatorBadge mutators={activeMutators} />

        {onSeedChange && (
          <SeedWidget
            seed={initialSeed || 0}
            onSeedEnter={onSeedChange}
            style={{ marginBottom: 30 }}
          />
        )}

        <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.startButton} onPress={() => onStart("local")}>
                <Text style={styles.startButtonText}>LOCAL</Text>
            </TouchableOpacity>
            <View style={{ width: 10 }} />
            <TouchableOpacity style={styles.startButton} onPress={() => onStart("ai")}>
                <Text style={styles.startButtonText}>VS AI</Text>
            </TouchableOpacity>

            {MULTIPLAYER_CONFIG.STATE !== 'hidden' && (
                <>
                    <View style={{ width: 10 }} />
                    <TouchableOpacity style={[styles.startButton, { backgroundColor: '#444' }]} onPress={() => onStart("online")}>
                        <Text style={[styles.startButtonText, { color: 'white' }]}>
                            MULTI
                        </Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  startScreen: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
    width: '100%',
  },
  title: {
    fontSize: 64,
    color: "white",
    fontFamily: "monospace",
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
    textShadowColor: '#00FFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
    letterSpacing: 8,
  },
  instructions: {
    fontSize: 16,
    color: "#CCCCCC",
    fontFamily: "monospace",
    marginBottom: 10,
    textAlign: "center",
    paddingHorizontal: 20,
    textShadowColor: "rgba(255, 255, 255, 0.2)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    color: '#00FFFF',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#111',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    width: 250,
    marginBottom: 20,
    fontFamily: 'monospace',
    textAlign: 'center',
    fontSize: 18,
    borderWidth: 1.5,
    borderColor: '#333',
  },
  startButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "white",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: "white",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  startButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
    textShadowColor: "white",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  scoreBoard: {
    position: 'absolute',
    top: 60,
    flexDirection: 'row',
    zIndex: 10,
    alignItems: 'center',
  },
  scoreTextP1: {
    color: '#FF00FF',
    fontSize: 54,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textShadowColor: '#FF00FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  scoreTextP2: {
    color: '#00FFFF',
    fontSize: 54,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textShadowColor: '#00FFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  scoreSeparator: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 48,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginHorizontal: 30,
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  multiOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayText: {
    color: 'white',
    fontSize: 32,
    fontFamily: 'monospace',
    marginBottom: 20,
  },
  restartButton: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  restartButtonText: {
    color: "black",
    fontWeight: "bold",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 100,
    padding: 10,
  },
  backButtonText: {
    color: "#AAAAAA",
    fontSize: 16,
    fontFamily: "monospace",
    textShadowColor: "#AAAAAA",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  }
});
