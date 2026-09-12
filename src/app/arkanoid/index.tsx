import { useState, useEffect, useCallback, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useArkanoidGame } from "@/hooks/useArkanoidGame";
import { useTranslation } from "@/hooks/useTranslation";
import { VirtualJoystick } from "../../components/controls/VirtualJoystick";
import { ShootButton } from "../../components/ShootButton";
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
} from "../../components/ui";

export default function ArkanoidScreen() {
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
        title={t.menu.arkanoid ?? "ARKANOID"}
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
    <GameErrorBoundary gameId="arkanoid">
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
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
          >
            <Text style={sharedScreenStyles.backButtonText}>← {t.common.menu}</Text>
          </TouchableOpacity>

          <View style={styles.hud}>
            <Text style={styles.hudText}>SCORE {gameState?.score ?? 0}</Text>
            <Text style={styles.hudText}>LIVES {gameState?.lives ?? 3}</Text>
            <Text style={styles.hudText}>LVL {gameState?.level ?? 1}</Text>
          </View>

          <CanvasRenderer
            world={game.getWorld()}
            gameLoop={game.getGameLoop()}
            onInitialize={(renderer) => game.initializeRenderer(renderer)}
          />

          <View style={styles.controls} pointerEvents="box-none">
            <View style={styles.leftControlArea} pointerEvents="box-none">
              <VirtualJoystick
                joystickId="arkanoid_joystick"
                type="movement"
                onMove={(x) => {
                  handleInputState({
                    left: x < -0.25,
                    right: x > 0.25,
                  });
                }}
                onRelease={() => {
                  handleInputState({ left: false, right: false });
                }}
              />
            </View>
            <View style={styles.rightControlArea} pointerEvents="box-none">
              <ShootButton
                onPressIn={() => handleInputState({ launch: true })}
                onPressOut={() => handleInputState({ launch: false })}
              />
            </View>
          </View>

          <DebugOverlay game={game} />

          {gameState?.isGameOver && (
            <View style={sharedScreenStyles.overlay}>
              <Text style={sharedScreenStyles.overlayText}>{t.common.game_over}</Text>
              <TouchableOpacity
                style={styles.restartButton}
                onPress={() => {
                  hapticSelection();
                  game.restart();
                }}
              >
                <Text style={styles.restartButtonText}>{t.common.retry}</Text>
              </TouchableOpacity>
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
}> = ({ title, highScore, onStart, playerName, onPlayerNameChange, instructions }) => {
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
      <HighScoreText label={t.common.record} score={highScore} />
      <NeonButton
        variant="white"
        onPress={() => {
          hapticSelection();
          onStart();
        }}
        accessibilityLabel={t.common.solo}
      >
        {t.common.solo}
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
  },
  restartButtonText: {
    color: colors.background,
    fontWeight: "bold",
  },
});
