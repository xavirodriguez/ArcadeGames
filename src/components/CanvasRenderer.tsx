import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { World, GameLoop } from "@tiny-aster/core";
import { CanvasRenderer as CanvasEngineRenderer } from "@tiny-aster/renderer-canvas";

export interface CanvasRendererProps {
  world: World | (() => World);
  gameLoop: GameLoop;
  onInitialize?: (renderer: any) => void;
}

/**
 * React wrapper around CanvasRenderer engine class for Web.
 */
export function CanvasRenderer({ world, gameLoop, onInitialize }: CanvasRendererProps) {
  const canvasRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const activeWorld = typeof world === "function" ? world() : world;
    const renderer = new CanvasEngineRenderer();

    if (onInitialize) {
      onInitialize(renderer);
    }

    const unsubscribe = gameLoop.subscribeRender((interpolation) => {
      renderer.render(activeWorld, ctx);
    });

    return () => {
      unsubscribe();
    };
  }, [world, gameLoop, onInitialize]);

  return (
    <View style={styles.container}>
      {/* @ts-ignore Web canvas element */}
      <canvas ref={canvasRef} style={styles.canvas} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  canvas: {
    width: "100%",
    height: "100%",
  },
});
