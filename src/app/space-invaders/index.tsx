import { useState, useEffect, useCallback, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { ComboDisplay } from "@/components/ComboDisplay";
import { SpaceInvadersUI } from "@/components/SpaceInvadersUI";
import { VirtualJoystick } from "../../components/controls/VirtualJoystick";
import { ShootButton } from "../../components/ShootButton";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useSpaceInvadersGame } from "@/hooks/useSpaceInvadersGame";
import { useMultiplayer } from "@tiny-aster/react-native";
import { SeedWidget } from "@/components/SeedWidget";
import { DailyChallengeBanner } from "@/components/DailyChallengeBanner";
import { DailyResultsOverlay } from "@/components/DailyResultsOverlay";
import { MutatorService } from "@/services/MutatorService";
import { MutatorBadge } from "@/components/MutatorBadge";
import { Mutator } from "@/config/MutatorConfig";
import { SpaceInvadersGame } from "@/games/space-invaders";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { MULTIPLAYER_CONFIG } from "@/config/MultiplayerConfig";
import { useGameSession } from "@/hooks/useGameSession";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { RadialBackground } from "@/components/RadialBackground";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";

export default function SpaceInvadersScreen() {
  const params = useLocalSearchParams<{ seed?: string; isDaily?: string }>();

  // Parse daily challenge parameters from URL immediately
  const paramSeed = params.seed ? parseInt(params.seed, 10) : undefined;
  const isDailyFromParams = params.isDaily === "true" && paramSeed !== undefined && !isNaN(paramSeed);

  const [playerName, setPlayerName] = useState("Jugador");
  const [initialSeed, setInitialSeed] = useState<number | undefined>(isDailyFromParams ? paramSeed : undefined);
  const [started, setStarted] = useState(isDailyFromParams);
  const [isMulti, setIsMulti] = useState(false);
  const [isDaily, setIsDaily] = useState(isDailyFromParams);
  const { game, gameState, handleInput, isPaused, isReady, togglePause, highScore, seed, restartWithSeed } = useSpaceInvadersGame(started, isMulti && started, initialSeed);

  // Activate keyboard controls for Web
  useKeyboardControls(game, isReady);
  const [activeMutators, setActiveMutators] = useState<Mutator[]>([]);

  const { room, connected, serverState } = useMultiplayer("space-invaders", playerName, isMulti && started);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then(enabled => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("space-invaders"));
      }
    });
  }, []);

  const { showDailyResults, setShowDailyResults } = useGameSession({
    gameId: "space-invaders",
    isDaily,
    seed,
    gameState: gameState ?? { isGameOver: false },
  });

  useEffect(() => {
    if (isMulti && connected && game) {
      (game as unknown as SpaceInvadersGame).setMultiplayerMode(true);
    }
  }, [isMulti, connected, game]);

  useEffect(() => {
    if (isMulti && serverState && game) {
        (game as unknown as SpaceInvadersGame).updateFromServer(serverState);
    }
  }, [isMulti, serverState, game]);

  const handleMultiplayerInput = useCallback((input: Record<string, boolean>) => {
    if (isMulti && room) {
        room.send("input", input);
    } else {
        handleInput(input);
        game?.setInputState(input);
    }
  }, [isMulti, room, handleInput, game]);

  const handleShootPress = useCallback(() => {
    handleMultiplayerInput({ shoot: true });
  }, [handleMultiplayerInput]);

  const handleShootRelease = useCallback(() => {
    handleMultiplayerInput({ shoot: false });
  }, [handleMultiplayerInput]);

  if (!started) {
    return (
      <StartScreen
        title="SPACE INVADERS"
        highScore={highScore}
        onStart={() => {
          setIsMulti(false);
          setStarted(true);
        }}
        onStartMulti={() => { setIsMulti(true); setStarted(true); }}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        instructions={Platform.OS === "web" ? "←→ Mover  Espacio Disparar" : "Controles táctiles"}
        onSeedChange={setInitialSeed}
        onStartDaily={(dailySeed) => {
          setInitialSeed(dailySeed);
          setIsDaily(true);
          setIsMulti(false);
          setStarted(true);
        }}
        activeMutators={activeMutators}
      />
    );
  }

  if (!game || !isReady) return null;

  return (
    <GameErrorBoundary gameId="space-invaders">
    <SafeAreaProvider>
      <View style={sharedScreenStyles.container}>
        <RadialBackground />
        <TouchableOpacity
          style={sharedScreenStyles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
        >
          <Text style={sharedScreenStyles.backButtonText}>← MENÚ</Text>
        </TouchableOpacity>

        {isMulti && !connected && (
            <View style={sharedScreenStyles.overlay}>
                <Text style={sharedScreenStyles.overlayText}>Conectando...</Text>
            </View>
        )}

        <ComboDisplay multiplier={gameState?.multiplier || 1} isActive={true} />
        <SpaceInvadersUI
          gameState={gameState}
          onRestart={() => isMulti ? room?.send("start_game") : game.restart()}
          onPause={() => togglePause()}
          isPaused={isPaused}
          highScore={highScore}
          seed={seed}
          onSetSeed={restartWithSeed}
        />
        <CanvasRenderer
          world={() => game.getWorld()}
          gameLoop={game.getGameLoop()}
          onInitialize={(renderer) => game.initializeRenderer(renderer)}
        />

        <View style={styles.controls} pointerEvents="box-none">
          <View style={{ flex: 1, height: '100%' }} pointerEvents="box-none">
            <VirtualJoystick
              joystickId="movement_joystick"
              type="movement"
              onMove={(x, y) => {
                const moveLeft = x < -0.25;
                const moveRight = x > 0.25;
                handleMultiplayerInput({
                  moveLeft,
                  moveRight,
                });
              }}
              onRelease={() => {
                handleMultiplayerInput({
                  moveLeft: false,
                  moveRight: false,
                });
              }}
            />
          </View>
          <ShootButton
            onPressIn={handleShootPress}
            onPressOut={handleShootRelease}
          />
        </View>

        <DebugOverlay game={game} room={room} />

        {showDailyResults && seed !== undefined && (
          <View style={sharedScreenStyles.overlay}>
            <DailyResultsOverlay
              gameId="space-invaders"
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
  onStartMulti: () => void;
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
  onStartMulti,
  playerName,
  onPlayerNameChange,
  instructions,
  onSeedChange,
  onStartDaily,
  activeMutators = [],
}) => {
  return (
    <SafeAreaProvider>
      <View style={sharedScreenStyles.startScreen}>
        <RadialBackground />
        <TouchableOpacity
          style={sharedScreenStyles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
        >
          <Text style={sharedScreenStyles.backButtonText}>← MENÚ</Text>
        </TouchableOpacity>
        <Text style={sharedScreenStyles.title}>{title}</Text>

        <TextInput
            style={sharedScreenStyles.input}
            value={playerName}
            onChangeText={onPlayerNameChange}
            placeholder="Tu nombre"
            placeholderTextColor="#AAAAAA"
        />

        <Text style={sharedScreenStyles.instructions}>{instructions}</Text>
        <Text style={sharedScreenStyles.highScoreText}>Récord: {highScore}</Text>

        {onStartDaily && <DailyChallengeBanner gameId="space-invaders" onPlay={onStartDaily} />}

        <MutatorBadge mutators={activeMutators} />

        {onSeedChange && (
          <SeedWidget
            seed={0}
            onSeedEnter={onSeedChange}
            style={{ marginBottom: 30 }}
          />
        )}

        <View style={sharedScreenStyles.buttonRow}>
            <TouchableOpacity style={sharedScreenStyles.startButton} onPress={onStart}>
                <Text style={sharedScreenStyles.startButtonText}>SOLO</Text>
            </TouchableOpacity>

            {MULTIPLAYER_CONFIG.STATE !== 'hidden' && (
                <>
                    <View style={{ width: 20 }} />
                    <TouchableOpacity style={sharedScreenStyles.multiButton} onPress={onStartMulti}>
                        <Text style={sharedScreenStyles.multiButtonText}>
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
  controls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingBottom: 40,
  }
});

