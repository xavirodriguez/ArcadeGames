import { useState, useEffect, useCallback, useRef, FC } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useArkanoidGame } from "@/hooks/useArkanoidGame";
import { useTranslation } from "@/hooks/useTranslation";
import { TouchDragZone, TouchActionButton } from "@/components/controls";
import { TouchInputState } from "@tiny-aster/core";
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
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ArkanoidHud,
  LevelProgressBar,
} from "./components/ArkanoidHud";

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

  const touchStateRef = useRef<TouchInputState | null>(null);
  if (!touchStateRef.current) {
    touchStateRef.current = new TouchInputState();
  }

  useEffect(() => {
    if (game && touchStateRef.current) {
      game.getWorld().setResource("TouchInputState", touchStateRef.current);
    }
  }, [game]);

  useKeyboardControls(game, isReady);

  const handleInputState = useCallback(
    (input: Partial<{ left: boolean; right: boolean; launch: boolean; p1Launch?: boolean; p1Left?: boolean; p1Right?: boolean }>) => {
      const fullInput = {
        p1Left: Boolean(input.left ?? input.p1Left),
        p1Right: Boolean(input.right ?? input.p1Right),
        p1Launch: Boolean(input.launch ?? input.p1Launch),
        launch: Boolean(input.launch ?? input.p1Launch),
        left: Boolean(input.left ?? input.p1Left),
        right: Boolean(input.right ?? input.p1Right),
      };
      handleInput(fullInput);
      game?.setInputState?.(fullInput);
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

  const bricksRemaining = gameState?.bricksRemaining ?? 0;
  const totalBricks = gameState?.totalBricks ?? bricksRemaining;
  const progress =
    totalBricks > 0 ? 1 - bricksRemaining / totalBricks : 0;

  const handleBack = () => {
    hapticSelection();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <SafeAreaProvider>
      <GameLayoutShell
        style={sharedScreenStyles.container}
        backgroundSlot={<RadialBackground />}
        topLeftSlot={
          <TouchableOpacity
            style={styles.gearButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={t.accessibility?.close_button ?? "Settings / Menu"}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="settings-outline" size={20} color={colors.cyan} />
          </TouchableOpacity>
        }
        centerHudSlot={
          <View style={styles.hudWrap}>
            <LevelProgressBar progress={progress} />
            <ArkanoidHud
              score={gameState?.score ?? 0}
              highScore={highScore ?? 0}
              lives={gameState?.lives ?? 3}
              level={gameState?.level ?? 1}
            />
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
          <TouchDragZone
            touchState={touchStateRef.current ?? undefined}
            target="paddle"
            mode="relative"
            style={styles.controls}
          >
            <View style={styles.rightControlArea} pointerEvents="box-none">
              <TouchActionButton
                label="LAUNCH"
                buttonName="p1Launch"
                touchState={touchStateRef.current ?? undefined}
                size={88}
                color="rgba(0, 243, 255, 0.18)"
                borderColor={colors.cyan}
                pressedColor="rgba(0, 243, 255, 0.55)"
                pressedBorderColor={colors.white}
                textColor={colors.cyan}
                haptic="medium"
                style={styles.launchButton}
                labelStyle={styles.launchLabel}
                onPressIn={() => handleInputState({ launch: true })}
                onPressOut={() => handleInputState({ launch: false })}
                accessibilityLabel="Launch ball"
              />
            </View>
          </TouchDragZone>
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
  hudWrap: {
    width: "100%",
    paddingTop: 4,
  },
  gearButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cyan,
    borderRadius: 6,
    backgroundColor: "rgba(0,243,255,0.08)",
    padding: 10,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  rightControlArea: {
    width: 150,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
    paddingRight: 20,
  },
  launchButton: {
    borderRadius: 12,
    borderBottomWidth: 5,
    borderBottomColor: "rgba(0, 180, 200, 0.9)",
    shadowColor: colors.cyan,
    shadowOpacity: 0.85,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  launchLabel: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
  },
  restartButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  restartButtonText: {
    color: colors.background,
    fontWeight: "bold",
  },
});
