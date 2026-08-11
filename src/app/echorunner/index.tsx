import { useState, useEffect, useRef, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { useTranslation } from "@/hooks/useTranslation";
import { useEchoRunnerGame } from "@/hooks/useEchoRunnerGame";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { RadialBackground } from "@/components/RadialBackground";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { WebAudioPlayer } from "@tiny-aster/core";

export default function EchoRunnerScreen() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const [initialSeed, setInitialSeed] = useState<number | undefined>();
  const isTouchDevice = useTouchDevice();

  const { game, gameState, handleInput, isPaused, isReady, togglePause, highScore, seed, restartWithSeed } =
    useEchoRunnerGame(started, initialSeed);

  // Keyboard controls for Web platforms (customized to map pulse attack correctly)
  useEffect(() => {
    if (Platform.OS !== "web" || !game || !isReady) return;

    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      activeKeys.add(e.code);
      updateInput();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.code);
      updateInput();
    };

    const updateInput = () => {
      const moveLeft = activeKeys.has("ArrowLeft") || activeKeys.has("KeyA");
      const moveRight = activeKeys.has("ArrowRight") || activeKeys.has("KeyD");
      const jump = activeKeys.has("ArrowUp") || activeKeys.has("KeyW") || activeKeys.has("Space");
      const pulse = activeKeys.has("KeyF") || activeKeys.has("KeyJ") || activeKeys.has("KeyE");

      game.setInputState({
        moveLeft,
        moveRight,
        jump,
        pulse
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [game, isReady]);

  // Touch handlers
  const handleTouchLeft = (pressed: boolean) => {
    game?.setInputState({ moveLeft: pressed });
  };

  const handleTouchRight = (pressed: boolean) => {
    game?.setInputState({ moveRight: pressed });
  };

  const handleTouchJump = (pressed: boolean) => {
    game?.setInputState({ jump: pressed });
  };

  const handleTouchPulse = () => {
    game?.setInputState({ pulse: true });
    // Clear trigger after 50ms
    setTimeout(() => game?.setInputState({ pulse: false }), 50);
  };

  // Helper to format elapsed time
  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    const ms = Math.floor((timeInSecs % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  if (!started) {
    return (
      <SafeAreaProvider>
        <View style={sharedScreenStyles.startScreen}>
          <RadialBackground />
          <TouchableOpacity
            style={sharedScreenStyles.backButton}
            onPress={() => router.replace("/")}
          >
            <Text style={sharedScreenStyles.backButtonText}>← {t.common.menu}</Text>
          </TouchableOpacity>

          <Text style={[sharedScreenStyles.title, styles.neonTitle]}>ECHO // RUNNER</Text>

          <Text style={sharedScreenStyles.instructions}>
            {Platform.OS === "web"
              ? "A/D o Flechas: Mover  |  W o Espacio: Saltar  |  F o J: Pulse (Ataque)"
              : t.common.touch_controls}
          </Text>

          <Text style={sharedScreenStyles.highScoreText}>Record: {highScore}</Text>

          <TouchableOpacity style={[sharedScreenStyles.startButton, styles.neonButton]} onPress={() => setStarted(true)}>
            <Text style={sharedScreenStyles.startButtonText}>INICIAR ARCHIVO</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!game || !isReady) {
    return (
      <View style={sharedScreenStyles.container}>
        <RadialBackground />
        <ActivityIndicator size="large" color="#00f0ff" />
        <Text style={{ color: "white", marginTop: 20, fontFamily: "monospace", fontSize: 18 }}>
          Sincronizando Archivos de Memoria...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={sharedScreenStyles.container}>
        <RadialBackground />

        {/* Back to menu */}
        <TouchableOpacity
          style={sharedScreenStyles.backButton}
          onPress={() => router.replace("/")}
        >
          <Text style={sharedScreenStyles.backButtonText}>← {t.common.menu}</Text>
        </TouchableOpacity>

        {/* Gorgeous Neon HUD */}
        <View style={styles.hudContainer}>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>INTENTO</Text>
            <Text style={styles.hudValue}>{gameState.attempts.toString().padStart(2, "0")}</Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>FRAGMENTOS</Text>
            <Text style={[styles.hudValue, styles.violetGlow]}>◆ {gameState.fragments}</Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>NUCLEOS</Text>
            <Text style={[styles.hudValue, styles.goldGlow]}>◉ {gameState.cores}</Text>
          </View>
          <View style={styles.hudItem}>
            <Text style={styles.hudLabel}>CRONO</Text>
            <Text style={styles.hudValue}>{formatTime(gameState.elapsedTime)}</Text>
          </View>
        </View>

        {/* Canvas Renderer */}
        <CanvasRenderer
          world={game.getWorld()}
          gameLoop={game.getGameLoop()}
          onInitialize={(renderer) => game.initializeRenderer(renderer)}
        />

        {/* Virtual controls for touch devices */}
        {isTouchDevice && (
          <View style={styles.touchControlsContainer} pointerEvents="box-none">
            {/* Left D-Pad */}
            <View style={styles.dpad} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.touchButton}
                onPressIn={() => handleTouchLeft(true)}
                onPressOut={() => handleTouchLeft(false)}
              >
                <Text style={styles.touchButtonText}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.touchButton}
                onPressIn={() => handleTouchRight(true)}
                onPressOut={() => handleTouchRight(false)}
              >
                <Text style={styles.touchButtonText}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Right Action buttons */}
            <View style={styles.actions} pointerEvents="box-none">
              <TouchableOpacity
                style={[styles.touchButton, styles.pulseButton]}
                onPressIn={handleTouchPulse}
              >
                <Text style={styles.touchButtonText}>PULSE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.touchButton, styles.jumpButton]}
                onPressIn={() => handleTouchJump(true)}
                onPressOut={() => handleTouchJump(false)}
              >
                <Text style={styles.touchButtonText}>JUMP</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Level Complete / Game Over Screen */}
        {gameState.isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverTitle}>ARCHIVO RESTAURADO</Text>
            <Text style={styles.gameOverSubtitle}>Has completado la megaestructura "The Archive"!</Text>
            <Text style={styles.gameOverStat}>Intentos Totales: {gameState.attempts}</Text>
            <Text style={styles.gameOverStat}>Muertes: {gameState.deaths}</Text>
            <Text style={styles.gameOverStat}>Tiempo Transcurrido: {formatTime(gameState.elapsedTime)}</Text>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.menuButtonText}>VOLVER AL REPOSITORIO</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  neonTitle: {
    color: "#00f0ff",
    textShadowColor: "#00f0ff",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  neonButton: {
    borderColor: "#ff007f",
    borderWidth: 2,
    shadowColor: "#ff007f",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  hudContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(10, 10, 20, 0.75)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    zIndex: 10,
  },
  hudItem: {
    alignItems: "center",
  },
  hudLabel: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 10,
    fontFamily: "monospace",
    letterSpacing: 1,
    marginBottom: 4,
  },
  hudValue: {
    color: "#00f0ff",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
    textShadowColor: "#00f0ff",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  violetGlow: {
    color: "#c084fc",
    textShadowColor: "#c084fc",
  },
  goldGlow: {
    color: "#f59e0b",
    textShadowColor: "#f59e0b",
  },
  touchControlsContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 180,
    zIndex: 15,
  },
  dpad: {
    flexDirection: "row",
  },
  actions: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  touchButton: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderWidth: 1.5,
    borderColor: "#475569",
    width: 65,
    height: 65,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  touchButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  jumpButton: {
    borderColor: "#00f0ff",
    width: 75,
    height: 75,
  },
  pulseButton: {
    borderColor: "#ff007f",
    width: 70,
    height: 70,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 20, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    padding: 30,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#00f0ff",
    fontFamily: "monospace",
    textShadowColor: "#00f0ff",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    marginBottom: 10,
    textAlign: "center",
  },
  gameOverSubtitle: {
    fontSize: 16,
    color: "#94a3b8",
    fontFamily: "monospace",
    textAlign: "center",
    marginBottom: 40,
  },
  gameOverStat: {
    fontSize: 16,
    color: "white",
    fontFamily: "monospace",
    marginBottom: 12,
  },
  menuButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#ff007f",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 40,
    shadowColor: "#ff007f",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  menuButtonText: {
    color: "#ff007f",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
  }
});
