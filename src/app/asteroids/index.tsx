import { useState, useEffect, useCallback, useRef, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { router, useLocalSearchParams } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { ComboDisplay } from "@/components/ComboDisplay";
import { GameUI } from "@/components/GameUI";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useAsteroidsGame } from "@/hooks/useAsteroidsGame";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { AsteroidsGame } from "@/games/asteroids/AsteroidsGame";
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
import { GameStateComponent } from "@/games/asteroids/types/AsteroidTypes";
import { useGameSession } from "@/hooks/useGameSession";
import { useKeyboardControls } from "../../hooks/useKeyboardControls";
import { RadialBackground } from "@/components/RadialBackground";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { hapticSelection } from "@/utils/haptics";
import { colors } from "../../theme";
import { ArcadeProvider } from "@/context/ArcadeProvider";
import { GameThemeProvider } from "@/context/GameThemeProvider";
import { useArcadeTransition } from "@/hooks/useArcadeTransition";
import { TransitionOverlay } from "@/components/TransitionOverlay";
import { ScorePulse } from "@/components/ScorePulse";
import {
  GameScreen,
  GameTitle,
  GameInstructions,
  PlayerNameInput,
  HighScoreText,
  BackButton,
  NeonButton,
} from "../../components/ui";

export default function AsteroidsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ seed?: string; isDaily?: string }>();
  const [started, setStarted] = useState(false);
  const [isMulti, setIsMulti] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
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
  const [selectedMode, setSelectedMode] = useState<"deathmatch" | "story">("deathmatch");

  const { game, gameState, handleInput, isPaused, isReady, togglePause, highScore, seed, restartWithSeed } = useAsteroidsGame(started, isMulti && started, initialSeed, selectedMode);

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

  const requestedSeedRestartRef = useRef<number | undefined>(undefined);

  // Ensure game starts with the correct seed if set via params
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

  const { room, connected, handleMultiplayerInput: sendNetInput } = useMultiplayerGame<AsteroidsGame, InputState>({
    game,
    roomName: "asteroids",
    playerName,
    active: isMulti && started,
  });

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

  const handleMultiplayerInput = useCallback((input: Partial<InputState>) => {
    if (isMulti && room) {
      sendNetInput(input);
    } else {
      handleInput(input);

      // Task 3: Decoupled Integration with ECS world for touch controls via Input Bridge
      game?.setInputState(input);
    }
  }, [isMulti, room, sendNetInput, game, handleInput]);

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
      <GameThemeProvider gameKey="asteroids">
        <StartScreen
          title={t.menu.asteroids}
          highScore={highScore ?? 0}
          onStart={() => {
            if (initialSeed !== undefined) {
              restartWithSeed(initialSeed);
            }
            setIsMulti(false);
            setStarted(true);
          }}
          onStartMulti={() => { setIsMulti(true); setStarted(true); }}
          playerName={playerName}
          onPlayerNameChange={handlePlayerNameChange}
          instructions={Platform.OS === "web" ? t.asteroids.instructions : t.common.touch_controls}
          onSeedChange={setInitialSeed}
          onStartDaily={(dailySeed) => {
            restartWithSeed(dailySeed);
            setIsDaily(true);
            setIsMulti(false);
            setStarted(true);
          }}
          activeMutators={activeMutators}
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
        />
      </GameThemeProvider>
    );
  }

  if (!game || !isReady) {
    return (
      <GameThemeProvider gameKey="asteroids">
        <View style={sharedScreenStyles.container}>
          <RadialBackground />
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingText}>
            Cargando motor físico...
          </Text>
        </View>
      </GameThemeProvider>
    );
  }

  return (
    <GameErrorBoundary gameId="asteroids">
      <SafeAreaProvider>
        <AsteroidsGameContent
          game={game}
          gameState={gameState}
          isPaused={isPaused}
          highScore={highScore ?? 0}
          seed={seed ?? 0}
          restartWithSeed={restartWithSeed}
          isMulti={isMulti}
          room={room}
          connected={connected}
          togglePause={togglePause}
          handleMultiplayerInput={handleMultiplayerInput}
          handleShootPress={handleShootPress}
          handleShootRelease={handleShootRelease}
          handleHyperspacePress={handleHyperspacePress}
          handleHyperspaceRelease={handleHyperspaceRelease}
          showDailyResults={showDailyResults}
          setShowDailyResults={setShowDailyResults}
        />
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

interface AsteroidsGameContentProps {
  game: AsteroidsGame;
  gameState: GameStateComponent | null;
  isPaused: boolean;
  highScore: number;
  seed: number;
  restartWithSeed: (newSeed?: number) => void;
  isMulti: boolean;
  room: { send: (type: string, data?: unknown) => void } | null;
  connected: boolean;
  togglePause: () => void;
  handleMultiplayerInput: (input: Partial<InputState>) => void;
  handleShootPress: () => void;
  handleShootRelease: () => void;
  handleHyperspacePress: () => void;
  handleHyperspaceRelease: () => void;
  showDailyResults: boolean;
  setShowDailyResults: (show: boolean) => void;
}

function AsteroidsGameContent({
  game,
  gameState,
  isPaused,
  highScore,
  seed,
  restartWithSeed,
  isMulti,
  room,
  connected,
  togglePause,
  handleMultiplayerInput,
  handleShootPress,
  handleShootRelease,
  handleHyperspacePress,
  handleHyperspaceRelease,
  showDailyResults,
  setShowDailyResults,
}: AsteroidsGameContentProps) {
  const { t } = useTranslation();
  const kernel = game.kernel;
  const eventBus = game.getEventBus();
  const { canvasBlur, pauseOverlayOpacity } = useArcadeTransition(kernel, eventBus);

  return (
    <ArcadeProvider kernel={kernel} eventBus={eventBus}>
      <GameThemeProvider gameKey="asteroids">
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
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            accessibilityHint="Regresa a la pantalla principal"
          >
            <Text style={sharedScreenStyles.backButtonText}>← {t.common.menu}</Text>
          </TouchableOpacity>

          {isMulti && !connected && (
            <View style={sharedScreenStyles.overlay}>
              <Text style={sharedScreenStyles.overlayText}>{t.common.connecting}</Text>
            </View>
          )}

          <ComboDisplay
            multiplier={
              (gameState as { comboMultiplier?: number; multiplier?: number })?.comboMultiplier ||
              (gameState as { comboMultiplier?: number; multiplier?: number })?.multiplier ||
              1
            }
            isActive={true}
          />
          <GameUI
            gameState={gameState as any}
            onRestart={() => (isMulti ? room?.send("start_game") : game.restart())}
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

          <TransitionOverlay
            blurRadius={canvasBlur}
            overlayOpacity={pauseOverlayOpacity}
          >
            {/* Transition/Pause Overlay */}
          </TransitionOverlay>

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
              <View style={styles.spacer20} />
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
                score={gameState?.score || 0}
                seed={seed}
                onClose={() => setShowDailyResults(false)}
              />
            </View>
          )}
        </View>
      </GameThemeProvider>
    </ArcadeProvider>
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
  selectedMode: "deathmatch" | "story";
  onModeChange: (mode: "deathmatch" | "story") => void;
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
  selectedMode,
  onModeChange,
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

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[
            sharedScreenStyles.startButton,
            {
              backgroundColor: selectedMode === "deathmatch" ? colors.cyan : "rgba(0, 240, 255, 0.2)",
              flex: 1,
              maxWidth: 160,
              paddingVertical: 12,
            }
          ]}
          onPress={() => {
            hapticSelection();
            onModeChange("deathmatch");
          }}
          accessibilityRole="button"
          accessibilityLabel="Modo Deathmatch"
          accessibilityState={{ selected: selectedMode === "deathmatch" }}
          accessibilityHint="Selecciona el modo infinito clásico de Asteroids"
        >
          <Text style={[sharedScreenStyles.startButtonText, { color: selectedMode === "deathmatch" ? "black" : colors.cyan, fontSize: 14 }]}>
            DEATHMATCH
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            sharedScreenStyles.startButton,
            {
              backgroundColor: selectedMode === "story" ? colors.cyan : "rgba(0, 240, 255, 0.2)",
              flex: 1,
              maxWidth: 160,
              paddingVertical: 12,
            }
          ]}
          onPress={() => {
            hapticSelection();
            onModeChange("story");
          }}
          accessibilityRole="button"
          accessibilityLabel="Modo Historia"
          accessibilityState={{ selected: selectedMode === "story" }}
          accessibilityHint="Selecciona la campaña narrativa Kepler's Ghost"
        >
          <Text style={[sharedScreenStyles.startButtonText, { color: selectedMode === "story" ? "black" : colors.cyan, fontSize: 14 }]}>
            MODO HISTORIA
          </Text>
        </TouchableOpacity>
      </View>

      <GameInstructions>{instructions}</GameInstructions>
      <HighScoreText label={t.common.record} score={highScore} />

      {onStartDaily && <DailyChallengeBanner gameId="asteroids" onPlay={onStartDaily} />}

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
          accessibilityLabel={t.common.solo}
          accessibilityHint="Inicia una partida individual en el modo seleccionado"
        >
          {t.common.solo}
        </NeonButton>

        {MULTIPLAYER_CONFIG.STATE !== 'hidden' && (
          <>
            <View style={styles.spacerHorizontal20} />
            <NeonButton
              variant="cyan"
              onPress={() => {
                hapticSelection();
                onStartMulti();
              }}
              accessibilityLabel={t.common.multi}
              accessibilityHint="Inicia una sesión multijugador en línea"
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
  scorePulseHeader: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    zIndex: 15,
  },
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
  },
  loadingText: {
    color: colors.white,
    marginTop: 20,
    fontFamily: "monospace",
    fontSize: 18,
  },
  spacer20: {
    height: 20,
  },
  modeSelector: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 10,
    width: "100%",
    justifyContent: "center",
  },
  seedWidget: {
    marginBottom: 30,
  },
  spacerHorizontal20: {
    width: 20,
  },
});
