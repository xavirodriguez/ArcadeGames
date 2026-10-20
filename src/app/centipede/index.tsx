import { useState, useEffect, useCallback, useRef, FC } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useCentipedeGame } from "@/hooks/useCentipedeGame";
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

export default function CentipedeScreen() {
  return (
    <GameErrorBoundary gameId="centipede">
      <CentipedeContent />
    </GameErrorBoundary>
  );
}

function CentipedeContent() {
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
    useCentipedeGame(started, initialSeed);

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
    (input: Partial<{ left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean; p1Fire?: boolean; p1Left?: boolean; p1Right?: boolean; p1Up?: boolean; p1Down?: boolean }>) => {
      const fullInput = {
        p1Left: Boolean(input.left ?? input.p1Left),
        p1Right: Boolean(input.right ?? input.p1Right),
        p1Up: Boolean(input.up ?? input.p1Up),
        p1Down: Boolean(input.down ?? input.p1Down),
        p1Fire: Boolean(input.fire ?? input.p1Fire),
        fire: Boolean(input.fire ?? input.p1Fire),
        left: Boolean(input.left ?? input.p1Left),
        right: Boolean(input.right ?? input.p1Right),
        up: Boolean(input.up ?? input.p1Up),
        down: Boolean(input.down ?? input.p1Down),
      };
      handleInput(fullInput);
      game?.setInputState?.(fullInput);
    },
    [handleInput, game]
  );

  if (!started) {
    return (
      <StartScreen
        title={t.menu?.centipede ?? "CENTIPEDE"}
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
            ? "WASD / Arrows Move  Space Fire"
            : "Drag left area to move  Button to fire"
        }
      />
    );
  }

  if (!game || !isReady) {
    return (
      <View style={sharedScreenStyles.container}>
        <RadialBackground />
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.loadingText}>Loading Centipede...</Text>
      </View>
    );
  }

  const isGameOver = gameState?.status === "game_over";

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
            <Text style={styles.hudText}>Puntuación {gameState?.score ?? 0}</Text>
            <Text style={styles.hudMuted}>Oleada {String(gameState?.level ?? 1).padStart(2, "0")}</Text>
            <Text style={styles.hudText}>Vidas {"▲ ".repeat(Math.max(0, gameState?.lives ?? 3)).trim()}</Text>
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
            target="pointer"
            mode="relative"
            style={styles.controls}
          >
            <View style={styles.rightControlArea} pointerEvents="box-none">
              <TouchActionButton
                label="FIRE"
                buttonName="p1Fire"
                touchState={touchStateRef.current ?? undefined}
                size={80}
                onPressIn={() => handleInputState({ fire: true })}
                onPressOut={() => handleInputState({ fire: false })}
              />
            </View>
          </TouchDragZone>
        }
        debugSlot={<DebugOverlay game={game} />}
        overlaySlot={
          isGameOver ? (
            <View style={sharedScreenStyles.overlay}>
              <Text style={sharedScreenStyles.overlayText}>{t.common?.game_over ?? "Fin de partida"}</Text>
              <TouchableOpacity
                style={styles.restartButton}
                onPress={() => {
                  hapticSelection();
                  game.restart();
                }}
              >
                <Text style={styles.restartButtonText}>{t.common?.retry ?? "Reintentar"}</Text>
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
      <GameTitle glowColor={colors.green}>{title}</GameTitle>
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
    fontFamily: "system-ui",
    fontSize: 18,
  },
  hud: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2D47",
    paddingBottom: 6,
  },
  hudText: {
    color: "#E8F1F2",
    fontFamily: "system-ui",
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  hudMuted: {
    color: "#6F819E",
    fontFamily: "system-ui",
    fontSize: 14,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  controls: {
    ...StyleSheet.absoluteFill,
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
