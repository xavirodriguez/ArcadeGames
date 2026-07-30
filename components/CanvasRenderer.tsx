import { useEffect, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { World, GameLoop, CoreComponentRegistry } from "@tiny-aster/core";
import { CanvasRenderer as EngineCanvasRenderer } from "@tiny-aster/renderer-canvas";
import { useGameWheel } from "@/src/hooks/useGameWheel";

interface CanvasRendererProps<TRegistry extends CoreComponentRegistry> {
  world: World<TRegistry> | (() => World<TRegistry>);
  gameLoop?: GameLoop;
  onInitialize?: (renderer: EngineCanvasRenderer<TRegistry>) => void;
  /**
   * Optional callback for custom game wheel input mechanics.
   */
  onWheel?: (event: WheelEvent) => void;
  /**
   * Toggle to enable or disable scroll blocking wheel listener.
   * Defaults to true.
   */
  wheelEnabled?: boolean;
}

export const CanvasRenderer = <TRegistry extends CoreComponentRegistry>({
  world,
  gameLoop,
  onInitialize,
  onWheel,
  wheelEnabled = true,
}: CanvasRendererProps<TRegistry>) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<EngineCanvasRenderer<TRegistry> | null>(null);

  // Scoped wheel event listener to handle scroll blocking and custom wheel mechanics
  useGameWheel(canvasRef, {
    onWheel,
    enabled: wheelEnabled,
  });

  useEffect(() => {
    if (Platform.OS !== "web" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!rendererRef.current) {
      rendererRef.current = new EngineCanvasRenderer();
      if (onInitialize) {
        onInitialize(rendererRef.current);
      }
    }

    const unsub = gameLoop?.subscribeRender((_alpha) => {
      if (rendererRef.current && ctx) {
        const activeWorld = typeof world === "function" ? world() : world;
        rendererRef.current.render(activeWorld, ctx);
      }
    });

    return () => {
      unsub?.();
    };
  }, [world, gameLoop, onInitialize]);

  if (Platform.OS !== "web") {
    return null;
  }

  // Get screen config to resize the outer view container dynamically if needed
  const activeWorld = typeof world === "function" ? world() : world;
  const screenConfig = activeWorld.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };

  return (
    <View style={styles.container}>
      <canvas
        ref={canvasRef}
        width={screenConfig.width}
        height={screenConfig.height}
        style={{
          width: "100%",
          height: "100%",
          // Layered defense: Block touch gestures natively at the compositor level
          touchAction: "none",
        } as any}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});
