import { useState, useEffect, useCallback, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator, useWindowDimensions } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useSharedValue, useFrameCallback, runOnJS } from "react-native-reanimated";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useArkanoidGame } from "@/hooks/useArkanoidGame";
import { useTranslation } from "@/hooks/useTranslation";
import { TouchDragZone, TouchActionButton } from "@/components/controls";
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

export default function ArkanoidScreen() {
  return (
    <GameErrorBoundary gameId="arkanoid">
      <ArkanoidContent />
    </GameErrorBoundary>
  );
}

function ArkanoidContent() {
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
    useArkanoidGame(started, initialSeed);

  useKeyboardControls(game, isReady);

  const handleInputState = useCallback(
    (input: Partial<{ left: boolean; right: boolean; launch: boolean }>) => {
      handleInput(input);
      game?.setInputState?.(input);
    },
    [handleInput, game]
  );

  if (!started) {
    return (
      <StartScreen
        title={t.menu?.arkanoid ?? "ARKANOID"}
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
            ? "←→ Move paddle  Space Launch ball"
            : "Touch left/right to move  Button to launch"
        }
      />
    );
  }

  if (!game || !isReady) {
    return (
      <View style={sharedScreenStyles.container}>
        <RadialBackground />
        <ActivityIndicator size="large" color={colors.cyan} />
        <Text style={styles.loadingText}>Loading Arkanoid...</Text>
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
            <Text style={styles.hudText}>SCORE {gameState?.score ?? 0}</Text>
            <Text style={styles.hudText}>LIVES {gameState?.lives ?? 3}</Text>
            <Text style={styles.hudText}>LVL {gameState?.level ?? 1}</Text>
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
          <ArkanoidTouchControls game={game} handleInputState={handleInputState} />
        }
        debugSlot={<DebugOverlay game={game} />}
        overlaySlot={
          gameState?.isGameOver ? (
            <View style={sharedScreenStyles.overlay}>
              <Text style={sharedScreenStyles.overlayText}>{t.common?.game_over ?? "Game Over"}</Text>
              <TouchableOpacity
                style={styles.restartButton}
                onPress={() => {
                  hapticSelection();
                  game.restart();
                }}
              >
                <Text style={styles.restartButtonText}>{t.common?.retry ?? "Retry"}</Text>
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

function ArkanoidTouchControls({
  game,
  handleInputState,
}: {
  game: any;
  handleInputState: (input: Partial<{ left: boolean; right: boolean; launch: boolean }>) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const worldWidth = 800;
  const paddleWidth = 100;
  const halfPaddle = paddleWidth / 2;

  const paddleX = useSharedValue(worldWidth / 2);
  const touchStartX = useSharedValue(0);
  const paddleStartX = useSharedValue(worldWidth / 2);

  const panGesture = Gesture.Pan()
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .runOnJS(false)
    .onBegin((e) => {
      touchStartX.value = e.x;
      paddleStartX.value = paddleX.value;
    })
    .onUpdate((e) => {
      const scale = screenWidth > 0 ? worldWidth / screenWidth : 1;
      const deltaX = e.translationX * scale;
      let nextX = paddleStartX.value + deltaX;

      if (nextX < halfPaddle) nextX = halfPaddle;
      if (nextX > worldWidth - halfPaddle) nextX = worldWidth - halfPaddle;

      paddleX.value = nextX;
    });

  const lastDir = useSharedValue<"left" | "right" | "none">("none");

  useFrameCallback(() => {
    if (!game) return;
    const world = game.getWorld?.();
    if (!world) return;

    const paddleEntities = world.query("Paddle", "Transform");
    if (paddleEntities && paddleEntities.length > 0) {
      const pEntity = paddleEntities[0];
      const transform = world.getComponent(pEntity, "Transform");
      if (transform) {
        const targetX = paddleX.value;
        const diff = targetX - transform.x;

        let nextDir: "left" | "right" | "none" = "none";
        if (diff < -2) {
          nextDir = "left";
        } else if (diff > 2) {
          nextDir = "right";
        }

        if (nextDir !== lastDir.value) {
          lastDir.value = nextDir;
          runOnJS(handleInputState)({
            left: nextDir === "left",
            right: nextDir === "right",
          });
        }
      }
    }
  });

  return (
    <TouchDragZone
      mode="relative"
      targetProperty="paddlePos"
      onDrag={(x) => {
        const scale = screenWidth > 0 ? worldWidth / screenWidth : 1;
        const deltaX = x * scale;
        let nextX = paddleStartX.value + deltaX;
        if (nextX < halfPaddle) nextX = halfPaddle;
        if (nextX > worldWidth - halfPaddle) nextX = worldWidth - halfPaddle;
        paddleX.value = nextX;
      }}
    >
      <View style={styles.controls} pointerEvents="box-none">
        <View style={{ flex: 1 }} pointerEvents="box-none" />
        <View style={styles.rightControlArea} pointerEvents="box-none">
          <TouchActionButton
            buttonName="launch"
            label="🚀"
            size={72}
            color="rgba(0, 232, 210, 0.25)"
            borderColor={colors.cyan}
            onPressIn={() => handleInputState({ launch: true })}
            onPressOut={() => handleInputState({ launch: false })}
          />
        </View>
      </View>
    </TouchDragZone>
  );
}
