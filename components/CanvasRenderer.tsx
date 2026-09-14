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

  // Strict non-passive gesture prevention on web to eliminate browser scrolling, pull-to-refresh & swipe back stutter
  useEffect(() => {
    if (Platform.OS !== "web" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;

    const preventTouchDefault = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    canvas.addEventListener("touchstart", preventTouchDefault, { passive: false });
    canvas.addEventListener("touchmove", preventTouchDefault, { passive: false });
    canvas.addEventListener("touchend", preventTouchDefault, { passive: false });
    canvas.addEventListener("touchcancel", preventTouchDefault, { passive: false });

    if (parent) {
      parent.addEventListener("touchstart", preventTouchDefault, { passive: false });
      parent.addEventListener("touchmove", preventTouchDefault, { passive: false });
      parent.addEventListener("touchend", preventTouchDefault, { passive: false });
      parent.addEventListener("touchcancel", preventTouchDefault, { passive: false });
    }

    return () => {
      canvas.removeEventListener("touchstart", preventTouchDefault);
      canvas.removeEventListener("touchmove", preventTouchDefault);
      canvas.removeEventListener("touchend", preventTouchDefault);
      canvas.removeEventListener("touchcancel", preventTouchDefault);
      if (parent) {
        parent.removeEventListener("touchstart", preventTouchDefault);
        parent.removeEventListener("touchmove", preventTouchDefault);
        parent.removeEventListener("touchend", preventTouchDefault);
        parent.removeEventListener("touchcancel", preventTouchDefault);
      }
    };
  }, []);

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
  const dpr = typeof window !== "undefined" && window.devicePixelRatio ? Math.max(1, window.devicePixelRatio) : 1;

  return (
    <View style={styles.container}>
      <canvas
        ref={canvasRef}
        width={Math.round(screenConfig.width * dpr)}
        height={Math.round(screenConfig.height * dpr)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          // Layered defense: Block touch gestures natively at the compositor level
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
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
