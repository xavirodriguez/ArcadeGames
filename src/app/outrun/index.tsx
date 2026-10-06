import { useState, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { VirtualJoystick } from "@/components/controls/VirtualJoystick";
import { useOutrunGame } from "@/hooks/useOutrunGame";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import {
  GameLayoutShell,
  GameScreen,
  GameTitle,
  GameInstructions,
  BackButton,
  NeonButton
} from "@/components/ui";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";
import { useTranslation } from "@/hooks/useTranslation";
import { hapticSelection } from "@/utils/haptics";

export default function OutrunScreen() {
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const { game, gameState, handleInput, isReady, togglePause, isPaused } = useOutrunGame(started);

  useKeyboardControls(game, isReady);

  const input = useCallback(
    (patch: Partial<{ accelerate: boolean; brake: boolean; left: boolean; right: boolean }>) => {
      handleInput(patch);
      game?.setInputState?.(patch);
    },
    [handleInput, game]
  );

  if (!started) {
    return (
      <GameScreen>
        <BackButton label={t.common?.menu ?? "Menu"} />
        <GameTitle glowColor="#e63946">OUT RUN</GameTitle>
        <GameInstructions>
          {Platform.OS === "web"
            ? "↑ / W / Space accelerate · ↓ / S brake · ←→ steer"
            : "Joystick to steer · Hold accelerate"}
        </GameInstructions>
        <View style={styles.blurb}>
          <Text style={styles.blurbText}>
            Pseudo-3D highway · curves · hills · traffic · stay on the road
          </Text>
        </View>
        <NeonButton
          variant="cyan"
          onPress={() => {
            hapticSelection();
            setStarted(true);
          }}
        >
          DRIVE
        </NeonButton>
      </GameScreen>
    );
  }

  if (!game || !isReady) return null;

  const speedKmh = Math.round((gameState.speed / 12000) * 280);

  return (
    <GameErrorBoundary gameId="outrun">
      <SafeAreaProvider>
        <GameLayoutShell
          style={sharedScreenStyles.container}
          topLeftSlot={
            <TouchableOpacity
              style={sharedScreenStyles.backButton}
              onPress={() => router.back()}
            >
              <Text style={sharedScreenStyles.backButtonText}>
                ← {t.common?.menu ?? "Menu"}
              </Text>
            </TouchableOpacity>
          }
          centerHudSlot={
            <View style={styles.hud}>
              <Text style={styles.hudText}>{speedKmh} km/h</Text>
              <Text style={styles.subHudText}>
                TIME {gameState.lapTime.toFixed(1)} · POS {gameState.position}
              </Text>
              {isPaused && <Text style={styles.paused}>PAUSED</Text>}
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
            <View style={styles.controls} pointerEvents="box-none">
              <View style={styles.leftControlArea} pointerEvents="box-none">
                <VirtualJoystick
                  joystickId="outrun_steer"
                  type="movement"
                  onMove={(x) => {
                    input({
                      left: x < -0.25,
                      right: x > 0.25,
                      accelerate: true
                    });
                  }}
                  onRelease={() => {
                    input({ left: false, right: false, accelerate: false });
                  }}
                />
              </View>
              <View style={styles.rightControlArea} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.accel}
                  onPressIn={() => input({ accelerate: true })}
                  onPressOut={() => input({ accelerate: false })}
                >
                  <Text style={styles.btnText}>GAS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.brake}
                  onPressIn={() => input({ brake: true })}
                  onPressOut={() => input({ brake: false })}
                >
                  <Text style={styles.btnText}>BRAKE</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          debugSlot={<DebugOverlay game={game} />}
        />
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}

const styles = StyleSheet.create({
  blurb: { marginVertical: 12, paddingHorizontal: 24 },
  blurbText: { color: "#94a3b8", textAlign: "center", fontSize: 14 },
  hud: { alignItems: "center" },
  hudText: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"]
  },
  subHudText: { color: "#94a3b8", fontSize: 13, marginTop: 2 },
  paused: { color: "#fbbf24", fontWeight: "700", marginTop: 4 },
  controls: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 16,
    pointerEvents: "box-none"
  },
  leftControlArea: { width: 140, height: 140 },
  rightControlArea: { gap: 10, alignItems: "flex-end" },
  accel: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12
  },
  brake: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 }
});
