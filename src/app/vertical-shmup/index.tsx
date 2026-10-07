import { useCallback, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useSharedValue, useFrameCallback, runOnJS } from "react-native-reanimated";
import { router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useVerticalShmupGame } from "@/hooks/useVerticalShmupGame";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { VirtualJoystick } from "@/components/controls/VirtualJoystick";
import { GestureActionButton } from "@/components/controls/GestureActionButton";
import { GameLayoutShell, GameScreen, GameTitle, GameInstructions, BackButton, NeonButton } from "@/components/ui";
import { sharedScreenStyles } from "@/styles/SharedGameScreenStyles";

export default function VerticalShmupScreen() {
  const [started, setStarted] = useState(false);
  const { game, gameState, handleInput, isReady } = useVerticalShmupGame(started);
  useKeyboardControls(game, isReady);

  const setInput = useCallback((patch: Partial<{ moveX:number; moveY:number; shoot:boolean }>) => {
    handleInput(patch as never);
    if (game) {
      game.setInputState({
        axes: { moveX: patch.moveX ?? 0, moveY: patch.moveY ?? 0 },
        actions: patch.shoot ? new Set(["shoot"]) : new Set()
      });
    }
  }, [game, handleInput]);

  if (!started) return (
    <GameScreen>
      <BackButton label="Menu" />
      <GameTitle glowColor="#00e5ff">1942 // VERTICAL SHMUP</GameTitle>
      <GameInstructions>WASD / arrows: move · Space: fire continuously</GameInstructions>
      <NeonButton variant="cyan" onPress={() => setStarted(true)}>START MISSION</NeonButton>
    </GameScreen>
  );

  if (!game || !isReady) return null;
  return (
    <GameErrorBoundary gameId="vertical-shmup">
      <SafeAreaProvider>
        <GameLayoutShell
          style={sharedScreenStyles.container}
          topLeftSlot={<BackButton label="Menu" />}
          centerHudSlot={<View style={styles.hud}><Text style={styles.hudText}>SCORE {gameState?.score ?? 0} · WAVE {gameState?.wave ?? 1}</Text></View>}
          canvasSlot={<CanvasRenderer world={game.getWorld()} gameLoop={game.getGameLoop()} onInitialize={(renderer) => game.initializeRenderer(renderer)} />}
          controlsSlot={
            <ShmupTouchControls game={game} setInput={setInput} />
          }
          debugSlot={<DebugOverlay game={game} />}
        />
      </SafeAreaProvider>
    </GameErrorBoundary>
  );
}
const styles=StyleSheet.create({
  hud:{padding:8,borderWidth:1,borderColor:"#00e5ff",backgroundColor:"rgba(0,0,0,.7)"},
  hudText:{color:"#00e5ff",fontFamily:"monospace",fontWeight:"bold"},
  controls:{...StyleSheet.absoluteFillObject,flexDirection:"row",justifyContent:"space-between",alignItems:"flex-end",padding:24},
  leftControlArea:{flex:1,height:"100%"},
  rightControlArea:{width:120,height:"100%",justifyContent:"flex-end",alignItems:"center",paddingBottom:20},
  text:{color:"#fff",fontFamily:"monospace",fontWeight:"bold"}
});

function ShmupTouchControls({
  game,
  setInput,
}: {
  game: any;
  setInput: (patch: Partial<{ moveX: number; moveY: number; shoot: boolean }>) => void;
}) {
  const anchorX = useSharedValue(0);
  const anchorY = useSharedValue(0);
  const moveAxisX = useSharedValue(0);
  const moveAxisY = useSharedValue(0);
  const isTouching = useSharedValue(false);

  const manualGesture = Gesture.Manual()
    .runOnJS(false)
    .onTouchesDown((e) => {
      if (e.changedTouches.length > 0) {
        anchorX.value = e.changedTouches[0].x;
        anchorY.value = e.changedTouches[0].y;
        isTouching.value = true;
      }
    })
    .onTouchesMove((e) => {
      if (isTouching.value && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const dx = touch.x - anchorX.value;
        const dy = touch.y - anchorY.value;

        const maxDist = 50;
        const deadzone = 10;

        if (Math.abs(dx) < deadzone) {
          moveAxisX.value = 0;
        } else {
          moveAxisX.value = Math.max(-1, Math.min(1, dx / maxDist));
        }

        if (Math.abs(dy) < deadzone) {
          moveAxisY.value = 0;
        } else {
          moveAxisY.value = Math.max(-1, Math.min(1, dy / maxDist));
        }
      }
    })
    .onTouchesUp(() => {
      isTouching.value = false;
      moveAxisX.value = 0;
      moveAxisY.value = 0;
    })
    .onFinalize(() => {
      isTouching.value = false;
      moveAxisX.value = 0;
      moveAxisY.value = 0;
    });

  const lastStateKey = useSharedValue<string>("");

  useFrameCallback(() => {
    if (!game) return;

    const mx = isTouching.value ? Math.round(moveAxisX.value * 10) / 10 : 0;
    const my = isTouching.value ? Math.round(moveAxisY.value * 10) / 10 : 0;
    const shoot = isTouching.value;

    const key = `${mx}_${my}_${shoot ? "S" : ""}`;
    if (key !== lastStateKey.value) {
      lastStateKey.value = key;
      runOnJS(setInput)({
        moveX: mx,
        moveY: my,
        shoot,
      });
    }
  });

  return (
    <GestureDetector gesture={manualGesture}>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <View style={styles.controls} pointerEvents="box-none">
          <View style={styles.leftControlArea} pointerEvents="box-none">
            <VirtualJoystick
              joystickId="shmup_movement"
              type="movement"
              floating={true}
              onMove={(x, y) => setInput({ moveX: x, moveY: y, shoot: true })}
              onRelease={() => setInput({ moveX: 0, moveY: 0, shoot: false })}
            />
          </View>
          <View style={styles.rightControlArea} pointerEvents="box-none">
            <GestureActionButton
              label="🔥"
              accessibilityLabel="Fire primary weapon"
              onPressIn={() => setInput({ shoot: true })}
              onPressOut={() => setInput({ shoot: false })}
              haptic="light"
              color="rgba(255,42,109,0.25)"
              borderColor="#ff2a6d"
            />
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}
