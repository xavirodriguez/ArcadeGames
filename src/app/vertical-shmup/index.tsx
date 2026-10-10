import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useVerticalShmupGame } from "@/hooks/useVerticalShmupGame";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
import { TouchVirtualJoystick } from "@/components/controls/TouchVirtualJoystick";
import { TouchActionButton } from "@/components/controls/TouchActionButton";
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
});

function ShmupTouchControls({
  setInput,
}: {
  game?: any;
  setInput: (patch: Partial<{ moveX: number; moveY: number; shoot: boolean }>) => void;
}) {
  return (
    <View style={styles.controls} pointerEvents="box-none">
      <View style={styles.leftControlArea} pointerEvents="box-none">
        <TouchVirtualJoystick
          radius={60}
          thumbRadius={25}
          floating={true}
          onUpdate={(x: number, y: number) => {
            setInput({ moveX: x, moveY: y, shoot: true });
          }}
        />
      </View>
      <View style={styles.rightControlArea} pointerEvents="box-none">
        <TouchActionButton
          name="shoot"
          label="🔥"
          size={64}
          color="#ff2a6d"
          onPress={() => setInput({ shoot: true })}
          accessibilityLabel="Fire primary weapon"
        />
      </View>
    </View>
  );
}
