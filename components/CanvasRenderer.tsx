import { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { World, GameLoop, CoreComponentRegistry } from "@tiny-aster/core";
import { CanvasRenderer as EngineCanvasRenderer } from "@tiny-aster/renderer-canvas";
import { useGameWheel } from "@/src/hooks/useGameWheel";
import { subscribeRenderFrames } from "@/src/games/shared/rendering/subscribeRenderFrames";

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
  const onInitializeRef = useRef(onInitialize);
  onInitializeRef.current = onInitialize;
  const [dpr, setDpr] = useState(() => (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));

  // Scoped wheel event listener to handle scroll blocking and custom wheel mechanics
  useGameWheel(canvasRef, {
    onWheel,
    enabled: wheelEnabled,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleDprChange = () => {
      setDpr(window.devicePixelRatio || 1);
    };

    window.addEventListener("resize", handleDprChange);

    let mediaQuery: MediaQueryList | null = null;
    const updateMediaQuery = () => {
      mediaQuery?.removeEventListener("change", handleDprChange);
      const currentDpr = window.devicePixelRatio || 1;
      mediaQuery = window.matchMedia(`(resolution: ${currentDpr}dppx)`);
      mediaQuery.addEventListener("change", () => {
        handleDprChange();
        updateMediaQuery();
      });
    };
    updateMediaQuery();

    return () => {
      window.removeEventListener("resize", handleDprChange);
      mediaQuery?.removeEventListener("change", handleDprChange);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!rendererRef.current) {
      rendererRef.current = new EngineCanvasRenderer();
    }

    if (rendererRef.current) {
      onInitializeRef.current?.(rendererRef.current);
    }

    const unsub = gameLoop
      ? subscribeRenderFrames(
          gameLoop,
          () => (typeof world === "function" ? world() : world),
          (activeWorld) => {
            rendererRef.current?.render(activeWorld, ctx);
          }
        )
      : undefined;

    return () => {
      unsub?.();
    };
  }, [world, gameLoop]);

  if (Platform.OS !== "web") {
    return null;
  }

  // Get screen config to resize the outer view container dynamically if needed
  const activeWorld = typeof world === "function" ? world() : world;
  const screenConfig = activeWorld.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
  const physicalWidth = Math.round(screenConfig.width * dpr);
  const physicalHeight = Math.round(screenConfig.height * dpr);

  return (
    <View style={styles.container}>
      <canvas
        ref={canvasRef}
        width={physicalWidth}
        height={physicalHeight}
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
