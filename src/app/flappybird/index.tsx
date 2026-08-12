import { useState, useEffect, useCallback, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { ComboDisplay } from "@/components/ComboDisplay";
import { FlappyBirdUI } from "@/components/FlappyBirdUI";
import { VirtualJoystick } from "../../components/controls/VirtualJoystick";
import { ShootButton } from "../../components/ShootButton";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useFlappyBirdGame } from "@/hooks/useFlappyBirdGame";
import { useMultiplayer } from "@tiny-aster/react-native";
import { SeedWidget } from "@/components/SeedWidget";
import { DailyChallengeBanner } from "@/components/DailyChallengeBanner";
import { DailyResultsOverlay } from "@/components/DailyResultsOverlay";
import { MutatorService } from "@/services/MutatorService";
import { MutatorBadge } from "@/components/MutatorBadge";
import { Mutator } from "@/config/MutatorConfig";
import { FlappyBirdGame, FlappyBirdInput } from "../../games/flappybird";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { MULTIPLAYER_CONFIG } from "@/config/MultiplayerConfig";
import { useGameSession } from "@/hooks/useGameSession";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { RadialBackground } from "@/components/RadialBackground";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { hapticSelection } from "../../utils/haptics";

export default function FlappyBirdScreen() {
  const params = useLocalSearchParams<{ seed?: string; isDaily?: string }>();
  const [playerName, setPlayerName] = useState("Jugador");
  const [initialSeed, setInitialSeed] = useState<number | undefined>();
  const [started, setStarted] = useState(false);
  const [isMulti, setIsMulti] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const { game, gameState, handleInput, isPaused, isReady, togglePause, highScore, seed, restartWithSeed } = useFlappyBirdGame(started, isMulti && started);

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

  const { room, connected, serverState } = useMultiplayer("flappybird", playerName, isMulti && started);

  useEffect(() => {
    MutatorService.isMutatorModeEnabled().then(enabled => {
      if (enabled) {
        setActiveMutators(MutatorService.getActiveMutatorsForGame("flappybird"));
      }
    });
  }, []);

  const { showDailyResults, setShowDailyResults } = useGameSession({
    gameId: "flappybird",
    isDaily,
    seed,
    gameState,
  });

  useEffect(() => {
    if (isMulti && connected && game) {
      (game as unknown as FlappyBirdGame).setMultiplayerMode(true);
    }
  }, [isMulti, connected, game]);

  useEffect(() => {
    if (isMulti && serverState && game) {
        (game as unknown as FlappyBirdGame).updateFromServer(serverState);
    }
  }, [isMulti, serverState, game]);

  const handleMultiplayerInput = useCallback((input: Partial<FlappyBirdInput>) => {
    if (isMulti && room) {
        if (input.flap) room.send("flap");
    } else {
        handleInput(input);
        game?.setInputState(input);
    }
  }, [isMulti, room, handleInput, game]);

  const handleShootPress = useCallback(() => {
    handleMultiplayerInput({ flap: true, glide: true });
  }, [handleMultiplayerInput]);

  const handleShootRelease = useCallback(() => {
    handleMultiplayerInput({ flap: false, glide: false });
  }, [handleMultiplayerInput]);

  if (!started) {
    return (
      <StartScreen
        title="FLAPPY BIRD"
        highScore={highScore}
        onStart={() => {
          hapticSelection();
          if (initialSeed !== undefined) {
            restartWithSeed(initialSeed);
          }
          setIsMulti(false);
          setStarted(true);
        }}
        onStartMulti={() => {
          hapticSelection();
          setIsMulti(true);
          setStarted(true);
        }}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        instructions={Platform.OS === "web" ? t.flappybird.instructions : t.flappybird.touch_instructions}
        onSeedChange={setInitialSeed}
        onStartDaily={(dailySeed) => {
          hapticSelection();
          restartWithSeed(dailySeed);
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
    <GameErrorBoundary gameId="flappybird">
    <SafeAreaProvider>
      <View style={sharedScreenStyles.container}>
        <RadialBackground />
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
        >
          <Text style={sharedScreenStyles.backButtonText}>← {t.common.menu}</Text>
        </TouchableOpacity>

        {isMulti && !connected && (
            <View style={sharedScreenStyles.overlay}>
                <Text style={sharedScreenStyles.overlayText}>{t.common.connecting}</Text>
            </View>
        )}

        <ComboDisplay multiplier={gameState?.comboMultiplier || 1} isActive={true} />
        <FlappyBirdUI
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
          <View style={{ flex: 1, height: '100%' }} pointerEvents="box-none">
            <VirtualJoystick
              joystickId="movement_joystick"
              type="movement"
              onMove={(x, y) => {
                const flap = y < -0.25;
                handleMultiplayerInput({
                  flap,
                  glide: flap,
                });
              }}
              onRelease={() => {
                handleMultiplayerInput({
                  flap: false,
                  glide: false,
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
              gameId="flappybird"
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
            hapticSelection();
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

        <Text style={sharedScreenStyles.inputLabel} nativeID="playerNameLabel">
          Tu nombre
        </Text>
        <TextInput
            style={sharedScreenStyles.input}
            value={playerName}
            onChangeText={onPlayerNameChange}
            placeholder={t.common.your_name}
            placeholderTextColor="#AAAAAA"
            accessibilityLabel="Nombre del jugador"
            accessibilityLabelledBy="playerNameLabel"
        />

        <Text style={sharedScreenStyles.instructions}>{instructions}</Text>
        <Text style={sharedScreenStyles.highScoreText}>{t.common.record}: {highScore}</Text>

        {onStartDaily && <DailyChallengeBanner gameId="flappybird" onPlay={onStartDaily} />}

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
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingBottom: 40,
  }
});

