import { useState, useEffect, useRef, useCallback, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { ComboDisplay } from "@/components/ComboDisplay";
import { GameUI } from "@/components/GameUI";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useAsteroidsGame } from "@/hooks/useAsteroidsGame";
import { useMultiplayer } from "@tiny-aster/react-native";
import { useTranslation } from "@/hooks/useTranslation";
import { VirtualJoystick } from "../../components/controls/VirtualJoystick";
import { ShootButton } from "../../components/ShootButton";
import { HyperspaceButton } from "../../components/HyperspaceButton";
import { SeedWidget } from "@/components/SeedWidget";
import { DailyChallengeBanner } from "@/components/DailyChallengeBanner";
import { DailyResultsOverlay } from "@/components/DailyResultsOverlay";
import { MutatorService } from "@/services/MutatorService";
import { MutatorBadge } from "@/components/MutatorBadge";
import { Mutator } from "@/config/MutatorConfig";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { InputState } from "../../types/GameTypes";
import { MULTIPLAYER_CONFIG } from "@/config/MultiplayerConfig";
import { useGameSession } from "@/hooks/useGameSession";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { RadialBackground } from "@/components/RadialBackground";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";

export default function AsteroidsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ seed?: string; isDaily?: string }>();
  const [started, setStarted] = useState(false);
  const [isMulti, setIsMulti] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const [playerName, setPlayerName] = useState("Player");
  const [initialSeed, setInitialSeed] = useState<number | undefined>();

  const { game, gameState, handleInput, isPaused, isReady, togglePause, highScore, seed, restartWithSeed } = useAsteroidsGame(started, isMulti && started, initialSeed);

  // Activate keyboard controls for Web
  useKeyboardControls(game, isReady);

  // Handle incoming daily challenge parameters
  useEffect(() => {
    if (params.seed && params.isDaily === "true" && !started) {
      const dailySeed = parseInt(params.seed, 10);
      if (!isNaN(dailySeed)) {
        setIsDaily(true);
        setIsMulti(false);
        setInitialSeed(dailySeed);
        setStarted(true);
      }
    }
  }, [params.seed, params.isDaily, started]);

  // Ensure game starts with the correct seed if set via params
  useEffect(() => {
    if (started && isDaily && initialSeed !== undefined && isReady && seed !== initialSeed) {
        restartWithSeed(initialSeed);
    }
  }, [started, isDaily, initialSeed, isReady, seed, restartWithSeed]);

  const [activeMutators, setActiveMutators] = useState<Mutator[]>([]);

  const { room, connected, serverState, sendInput, inputBufferRef } = useMultiplayer("asteroids", playerName, isMulti && started);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then(enabled => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("asteroids"));
      }
    });
  }, []);

  const { showDailyResults, setShowDailyResults } = useGameSession({
    gameId: "asteroids",
    isDaily,
    seed,
    gameState,
  });

  useEffect(() => {
    if (isMulti && connected && game) {
      game.setMultiplayerMode(true);
    }
  }, [isMulti, connected, game]);

  useEffect(() => {
    if (isMulti && serverState && game) {
        const sessionId = room?.sessionId;
        const pendingInputs = inputBufferRef.current;

        game.updateFromServer(serverState, sessionId);

        // Re-apply pending inputs for reconciliation
        if (sessionId && pendingInputs.length > 0) {
            pendingInputs.forEach(frame => {
                game.predictLocalPlayer(frame, 16.66);
            });
        }
    }
  }, [isMulti, serverState, game, room?.sessionId, inputBufferRef]);

  const handleMultiplayerInput = useCallback((input: Partial<InputState>) => {
    if (isMulti && room) {
        const frame = sendInput(input as Record<string, boolean>);
        if (frame) {
            game?.predictLocalPlayer(frame, 16.66);
        }
    } else {
        handleInput(input);

        // Task 3: Decoupled Integration with ECS world for touch controls via Input Bridge
        game?.setInputState(input);
    }
  }, [isMulti, room, sendInput, game, handleInput]);

  const handleShootPress = useCallback(() => {
    handleMultiplayerInput({ shoot: true });
  }, [handleMultiplayerInput]);

  const handleShootRelease = useCallback(() => {
    handleMultiplayerInput({ shoot: false });
  }, [handleMultiplayerInput]);

  const handleHyperspacePress = useCallback(() => {
    handleMultiplayerInput({ hyperspace: true });
  }, [handleMultiplayerInput]);

  const handleHyperspaceRelease = useCallback(() => {
    handleMultiplayerInput({ hyperspace: false });
  }, [handleMultiplayerInput]);

  if (!started) {
    return (
      <StartScreen
        title={t.menu.asteroids}
        highScore={highScore}
        onStart={() => {
          if (initialSeed !== undefined) {
            restartWithSeed(initialSeed);
          }
          setIsMulti(false);
          setStarted(true);
        }}
        onStartMulti={() => { setIsMulti(true); setStarted(true); }}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        instructions={Platform.OS === "web" ? t.asteroids.instructions : t.common.touch_controls}
        onSeedChange={setInitialSeed}
        onStartDaily={(dailySeed) => {
          restartWithSeed(dailySeed);
          setIsDaily(true);
          setIsMulti(false);
          setStarted(true);
        }}
        activeMutators={activeMutators}
      />
    );
  }

  if (!game || !isReady) {
    return (
      <View style={sharedScreenStyles.container}>
        <RadialBackground />
        <ActivityIndicator size="large" color="#00f0ff" />
        <Text style={{ color: "white", marginTop: 20, fontFamily: "monospace", fontSize: 18 }}>
          Cargando motor físico...
        </Text>
      </View>
    );
  }

  return (
    <GameErrorBoundary gameId="asteroids">
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
          <Text style={sharedScreenStyles.backButtonText}>← {t.common.menu}</Text>
        </TouchableOpacity>

        {isMulti && !connected && (
            <View style={sharedScreenStyles.overlay}>
                <Text style={sharedScreenStyles.overlayText}>{t.common.connecting}</Text>
            </View>
        )}

        <ComboDisplay multiplier={(gameState as { comboMultiplier?: number; multiplier?: number })?.comboMultiplier || (gameState as { comboMultiplier?: number; multiplier?: number })?.multiplier || 1} isActive={true} />
        <GameUI
          gameState={gameState}
          onRestart={() => isMulti ? room?.send("start_game") : game.restart()}
          onPause={() => togglePause()}
          isPaused={isPaused}
          highScore={highScore}
          seed={seed}
          onSetSeed={restartWithSeed}
        />
        <CanvasRenderer
          world={game.getWorld()}
          gameLoop={game.getGameLoop()}
          onInitialize={(renderer) => game.initializeRenderer(renderer)}
        />

        <View style={styles.controls} pointerEvents="box-none">
          <View style={styles.leftControlArea} pointerEvents="box-none">
            <VirtualJoystick
              joystickId="movement_joystick"
              type="movement"
              onMove={(x, y) => {
                const rotateLeft = x < -0.25;
                const rotateRight = x > 0.25;
                const thrust = y < -0.25;
                handleMultiplayerInput({
                  rotateLeft,
                  rotateRight,
                  thrust,
                  rotationAmount: x,
                });
              }}
              onRelease={() => {
                handleMultiplayerInput({
                  rotateLeft: false,
                  rotateRight: false,
                  thrust: false,
                  rotationAmount: 0,
                });
              }}
            />
          </View>
          <View style={styles.rightControlArea} pointerEvents="box-none">
            <HyperspaceButton
                onPressIn={handleHyperspacePress}
                onPressOut={handleHyperspaceRelease}
            />
            <View style={{ height: 20 }} />
            <ShootButton
                onPressIn={handleShootPress}
                onPressOut={handleShootRelease}
            />
          </View>
        </View>

        <DebugOverlay game={game} room={room} />

        {showDailyResults && seed !== undefined && (
          <View style={sharedScreenStyles.overlay}>
            <DailyResultsOverlay
              gameId="asteroids"
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
  const { t } = useTranslation();
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
          <Text style={sharedScreenStyles.backButtonText}>← {t.common.menu}</Text>
        </TouchableOpacity>
        <Text style={sharedScreenStyles.title}>{title}</Text>

        <TextInput
            style={sharedScreenStyles.input}
            value={playerName}
            onChangeText={onPlayerNameChange}
            placeholder={t.common.your_name}
            placeholderTextColor="#AAAAAA"
        />

        <Text style={sharedScreenStyles.instructions}>{instructions}</Text>
        <Text style={sharedScreenStyles.highScoreText}>{t.common.record}: {highScore}</Text>

        {onStartDaily && <DailyChallengeBanner gameId="asteroids" onPlay={onStartDaily} />}

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
                <Text style={sharedScreenStyles.startButtonText}>{t.common.solo}</Text>
            </TouchableOpacity>

            {MULTIPLAYER_CONFIG.STATE !== 'hidden' && (
                <>
                    <View style={{ width: 20 }} />
                    <TouchableOpacity style={sharedScreenStyles.multiButton} onPress={onStartMulti}>
                        <Text style={sharedScreenStyles.multiButtonText}>
                            {t.common.multi}
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
    justifyContent: "space-between",
    zIndex: 10,
  },
  leftControlArea: {
    flex: 1,
    height: "100%",
  },
  rightControlArea: {
    width: 150,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
    paddingRight: 20,
  }
});

