import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  ZoomIn,
  BounceIn,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
} from "react-native-reanimated";

/**
 * Type definition for the @shopify/react-native-skia module.
 */
type SkiaModuleType = typeof import("@shopify/react-native-skia");

/**
 * Props for the Skia Canvas component.
 */
interface CanvasProps {
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Props for the Skia BackdropBlur component.
 */
interface BackdropBlurProps {
  blur: number;
  clip?: { x: number; y: number; width: number; height: number };
  children?: React.ReactNode;
}

/**
 * Props for the Skia Fill component.
 */
interface FillProps {
  color: string;
}

type CanvasComponent = React.ComponentType<CanvasProps>;
type BackdropBlurComponent = React.ComponentType<BackdropBlurProps>;
type FillComponent = React.ComponentType<FillProps>;

// Conditionally import Skia components for non-web platforms
let Canvas: CanvasComponent | null = null;
let BackdropBlur: BackdropBlurComponent | null = null;
let Fill: FillComponent | null = null;

if (Platform.OS !== "web") {
  try {
    const SkiaModule = require("@shopify/react-native-skia") as SkiaModuleType;
    Canvas = SkiaModule.Canvas as unknown as CanvasComponent;
    BackdropBlur = SkiaModule.BackdropBlur as unknown as BackdropBlurComponent;
    Fill = SkiaModule.Fill as unknown as FillComponent;
  } catch (_err) {
    // Skia not available
  }
}

/**
 * Properties for the {@link GameUI} component.
 */
interface MinimalGameState {
  score: number;
  lives?: number;
  level?: number;
  isGameOver: boolean;
  readyRemaining?: number;
  intermissionRemaining?: number;
  continueCountdownRemaining?: number;
  continuesRemaining?: number;
  [key: string]: any;
}

interface GameUIProps {
  /** The current game state component containing lives, score, and level. */
  gameState: MinimalGameState;
  /** Callback triggered when the restart button is pressed. */
  onRestart?: () => void;
  /** Callback triggered when the pause button is pressed. */
  onPause?: () => void;
  /** Whether the game is currently paused. */
  isPaused?: boolean;
  /** The persistent high score. */
  highScore?: number;
  /** The current game seed. */
  seed?: number;
  /** Callback to change/set the game seed. */
  onSetSeed?: (seed?: number) => void;
  /** Callback to trigger a continue when out of lives. */
  onContinue?: () => void;
}

/**
 * Component responsible for rendering the Head-Up Display (HUD) overlay.
 */
export const GameUI = React.memo(function GameUI({
  gameState,
  onRestart,
  onPause,
  isPaused,
  highScore,
  onContinue,
}: GameUIProps) {
  const insets = useSafeAreaInsets();
  const [levelUpText, setLevelUpText] = useState<string | null>(null);
  const showPauseButton = Platform.OS !== "web" && !gameState.isGameOver && !(gameState.continueCountdownRemaining && gameState.continueCountdownRemaining > 0);

  useEffect(() => {
    if (gameState.level && gameState.level > 1 && !gameState.isGameOver) {
      setLevelUpText(`NIVEL ${gameState.level}`);
      const timer = setTimeout(() => setLevelUpText(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState.level, gameState.isGameOver]);

  const lives = gameState.lives ?? 0;
  const readyRemaining = gameState.readyRemaining ?? 0;
  const intermissionRemaining = gameState.intermissionRemaining ?? 0;
  const continueCountdownRemaining = gameState.continueCountdownRemaining ?? 0;
  const continuesRemaining = gameState.continuesRemaining ?? 0;

  return (
    <View style={styles.container}>
      <HUD
        lives={lives}
        score={gameState.score}
        level={gameState.level ?? 1}
        highScore={highScore ?? 0}
        paddingTop={Math.max(insets.top, 16)}
      />
      {showPauseButton && (
        <PauseButton
          onPress={onPause}
          isPaused={isPaused}
          paddingTop={Math.max(insets.top, 16)}
        />
      )}
      {levelUpText && <LevelUpOverlay text={levelUpText} />}

      {/* Ready / Get Ready Overlay */}
      {readyRemaining > 0 && (
        <Animated.View entering={ZoomIn.duration(500)} exiting={FadeOut.duration(500)} style={styles.centerOverlay}>
          <Text style={styles.readyTitle}>GET READY</Text>
          <Text style={styles.readyTimer}>{Math.ceil(readyRemaining)}</Text>
        </Animated.View>
      )}

      {/* Intermission Overlay */}
      {intermissionRemaining > 0 && (
        <Animated.View entering={BounceIn.duration(500)} exiting={FadeOut.duration(500)} style={styles.centerOverlay}>
          <Text style={styles.intermissionTitle}>STAGE CLEARED!</Text>
          <Text style={styles.intermissionSub}>PREPARING NEXT WAVE...</Text>
        </Animated.View>
      )}

      {/* Continue Overlay */}
      {continueCountdownRemaining > 0 && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.continueOverlay}>
          <Text style={styles.continueText}>CONTINUE?</Text>
          <Text style={styles.continueCountdown}>{Math.ceil(continueCountdownRemaining)}</Text>
          <View style={styles.continueButtonRow}>
            <TouchableOpacity style={styles.yesButton} onPress={onContinue}>
              <Text style={styles.yesButtonText}>YES ({continuesRemaining} LEFT)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.noButton} onPress={onRestart}>
              <Text style={styles.noButtonText}>NO</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {gameState.isGameOver && (
        <GameOverOverlay
          score={gameState.score}
          highScore={highScore ?? 0}
          onRestart={onRestart}
        />
      )}
    </View>
  );
});

const HUD: React.FC<{
  lives: number;
  score: number;
  level: number;
  highScore: number;
  paddingTop: number;
}> = ({ lives, score, level, highScore, paddingTop }) => (
  <Animated.View
    entering={FadeIn.duration(1000)}
    style={[styles.topBar, { paddingTop }]}
  >
    {Platform.OS !== "web" && Canvas && BackdropBlur && Fill && (
      <Canvas style={StyleSheet.absoluteFill}>
        <BackdropBlur blur={10} clip={{ x: 0, y: 0, width: 2000, height: 100 }}>
            <Fill color="rgba(0, 0, 0, 0.4)" />
        </BackdropBlur>
      </Canvas>
    )}
    <View style={styles.hudContent}>
      <Text style={styles.text}>Lives: {lives > 0 ? "🚀".repeat(lives) : "💀"}</Text>
      <Score score={score} />
      <Text style={styles.text}>HS: {highScore}</Text>
      <Text style={styles.text}>Level: {level}</Text>
    </View>
  </Animated.View>
);

const Score: React.FC<{ score: number }> = ({ score }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 2, stiffness: 80 }),
      withSpring(1)
    );
  }, [score, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[styles.text, { color: "#00FFDD" }]}>Score: {score}</Text>
    </Animated.View>
  );
};

const PauseButton: React.FC<{
  onPress?: () => void;
  isPaused?: boolean;
  paddingTop: number;
}> = ({ onPress, isPaused, paddingTop }) => (
  <TouchableOpacity
    style={[styles.pauseButton, { top: paddingTop }]}
    onPress={onPress}
  >
    <Text style={styles.pauseButtonText}>{isPaused ? "▶" : "II"}</Text>
  </TouchableOpacity>
);

const LevelUpOverlay: React.FC<{ text: string }> = ({ text }) => (
  <Animated.View
    entering={BounceIn.duration(1000)}
    exiting={FadeOut.duration(500)}
    style={styles.levelUpOverlay}
    pointerEvents="none"
  >
    <Text style={styles.levelUpText}>{text}</Text>
  </Animated.View>
);

const GameOverOverlay: React.FC<{
  score: number;
  highScore: number;
  onRestart?: () => void;
}> = ({ score, highScore, onRestart }) => (
  <Animated.View
    entering={FadeIn.duration(500)}
    style={styles.gameOverOverlay}
  >
    {Platform.OS !== "web" && Canvas && BackdropBlur && Fill && (
      <Canvas style={StyleSheet.absoluteFill}>
        <BackdropBlur blur={20}>
            <Fill color="rgba(0, 0, 0, 0.6)" />
        </BackdropBlur>
      </Canvas>
    )}

    <Animated.Text
      entering={ZoomIn.delay(300).duration(800)}
      style={styles.gameOverText}
    >
      GAME OVER
    </Animated.Text>

    <Animated.View entering={SlideInDown.delay(600).duration(800)} style={{ alignItems: "center" }}>
      <Text style={styles.finalScoreText}>Final Score: {score}</Text>
      <Text style={styles.highScoreText}>
        {score >= highScore ? "¡NUEVO RÉCORD!" : `Récord actual: ${highScore}`}
      </Text>

      <TouchableOpacity style={styles.restartButton} onPress={onRestart}>
        <Text style={styles.restartButtonText}>RESTART</Text>
      </TouchableOpacity>
    </Animated.View>
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: "box-none",
  },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 10,
    overflow: "hidden",
  },
  hudContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "monospace",
    fontWeight: "bold",
    ...(Platform.OS === 'web'
      ? { textShadow: '0 0 10px rgba(0, 255, 255, 0.8)' }
      : {
          textShadowColor: "rgba(0, 255, 255, 0.8)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 10,
        }
    ),
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "auto",
  },
  gameOverText: {
    color: "#FF0044",
    fontSize: 64,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 20,
    ...(Platform.OS === 'web'
      ? { textShadow: '0 0 20px rgba(255, 0, 0, 0.8)' }
      : {
          textShadowColor: "rgba(255, 0, 0, 0.8)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 20,
        }
    ),
  },
  finalScoreText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: "monospace",
    marginBottom: 10,
  },
  highScoreText: {
    color: "#FFD700",
    fontSize: 20,
    fontFamily: "monospace",
    marginBottom: 40,
  },
  restartButton: {
    backgroundColor: "#00FFDD",
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 15px rgba(0, 255, 221, 0.8)' }
      : {
          shadowColor: "#00FFDD",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 15,
        }
    ),
  },
  restartButtonText: {
    color: "#000000",
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  pauseButton: {
    position: "absolute",
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1001,
  },
  pauseButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  levelUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  levelUpText: {
    fontSize: 60,
    color: "#00FF88",
    fontFamily: "monospace",
    fontWeight: "bold",
    ...(Platform.OS === 'web'
      ? { textShadow: '0 0 20px rgba(0, 255, 136, 0.8)' }
      : {
          textShadowColor: "rgba(0, 255, 136, 0.8)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 20,
        }
    ),
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    pointerEvents: "none",
  },
  readyTitle: {
    color: "#00FFDD",
    fontSize: 54,
    fontWeight: "bold",
    fontFamily: "monospace",
    ...(Platform.OS === "web"
      ? { textShadow: "0 0 15px rgba(0, 255, 221, 0.8)" }
      : {
          textShadowColor: "rgba(0, 255, 221, 0.8)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 15,
        }),
  },
  readyTimer: {
    color: "#FFFFFF",
    fontSize: 32,
    fontFamily: "monospace",
    fontWeight: "bold",
    marginTop: 10,
  },
  intermissionTitle: {
    color: "#FFD700",
    fontSize: 54,
    fontWeight: "bold",
    fontFamily: "monospace",
    ...(Platform.OS === "web"
      ? { textShadow: "0 0 15px rgba(255, 215, 0, 0.8)" }
      : {
          textShadowColor: "rgba(255, 215, 0, 0.8)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 15,
        }),
  },
  intermissionSub: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "monospace",
    marginTop: 10,
  },
  continueOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    pointerEvents: "auto",
  },
  continueText: {
    color: "#00FFDD",
    fontSize: 48,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 20,
    ...(Platform.OS === "web"
      ? { textShadow: "0 0 15px rgba(0, 255, 221, 0.8)" }
      : {
          textShadowColor: "rgba(0, 255, 221, 0.8)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 15,
        }),
  },
  continueCountdown: {
    color: "#FF0044",
    fontSize: 72,
    fontWeight: "bold",
    fontFamily: "monospace",
    marginBottom: 40,
    ...(Platform.OS === "web"
      ? { textShadow: "0 0 20px rgba(255, 0, 68, 0.8)" }
      : {
          textShadowColor: "rgba(255, 0, 68, 0.8)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 20,
        }),
  },
  continueButtonRow: {
    flexDirection: "row",
    gap: 20,
  },
  yesButton: {
    backgroundColor: "#00FFDD",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 15px rgba(0, 255, 221, 0.8)' }
      : {
          shadowColor: "#00FFDD",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 15,
        }
    ),
  },
  yesButtonText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  noButton: {
    backgroundColor: "#FF0044",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 15px rgba(255, 0, 68, 0.8)' }
      : {
          shadowColor: "#FF0044",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 15,
        }
    ),
  },
  noButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
});
