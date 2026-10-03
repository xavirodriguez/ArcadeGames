import { useCallback, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CanvasRenderer } from "@/components/CanvasRenderer";
import { GameErrorBoundary } from "@/components/GameErrorBoundary";
import { DebugOverlay } from "@/components/debug/DebugOverlay";
import { useVerticalShmupGame } from "@/hooks/useVerticalShmupGame";
import { useKeyboardControls } from "@/hooks/useKeyboardControls";
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
          centerHudSlot={<View style={styles.hud}><Text style={styles.hudText}>SCORE {gameState.score} · WAVE {gameState.wave}</Text></View>}
          canvasSlot={<CanvasRenderer world={game.getWorld()} gameLoop={game.getGameLoop()} onInitialize={(renderer) => game.initializeRenderer(renderer)} />}
          controlsSlot={
            <View style={styles.controls}>
              <Pressable style={styles.button} onPressIn={() => setInput({moveX:-1})} onPressOut={() => setInput({moveX:0})}><Text style={styles.text}>◀</Text></Pressable>
              <Pressable style={styles.button} onPressIn={() => setInput({moveX:1})} onPressOut={() => setInput({moveX:0})}><Text style={styles.text}>▶</Text></Pressable>
              <Pressable style={styles.button} onPressIn={() => setInput({moveY:-1})} onPressOut={() => setInput({moveY:0})}><Text style={styles.text}>▲</Text></Pressable>
              <Pressable style={styles.fire} onPressIn={() => setInput({shoot:true})} onPressOut={() => setInput({shoot:false})}><Text style={styles.text}>FIRE</Text></Pressable>
            </View>
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
  button:{width:58,height:58,borderRadius:12,borderWidth:2,borderColor:"#00e5ff",backgroundColor:"rgba(0,229,255,.18)",justifyContent:"center",alignItems:"center"},
  fire:{width:76,height:58,borderRadius:12,borderWidth:2,borderColor:"#ff2a6d",backgroundColor:"rgba(255,42,109,.2)",justifyContent:"center",alignItems:"center"},
  text:{color:"#fff",fontFamily:"monospace",fontWeight:"bold"}
});
