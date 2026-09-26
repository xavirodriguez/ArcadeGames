import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Canvas } from "@shopify/react-native-skia";
import { World, GameLoop } from "@tiny-aster/core";
import { SkiaRenderer } from "@tiny-aster/renderer-skia";

export interface SkiaGameRendererProps {
  world: World | (() => World);
  gameLoop: GameLoop;
  onInitialize?: (renderer: any) => void;
}

export function SkiaGameRenderer({ world, gameLoop, onInitialize }: SkiaGameRendererProps) {
  const rendererRef = useRef<SkiaRenderer | null>(null);

  useEffect(() => {
    const activeWorld = typeof world === "function" ? world() : world;
    const renderer = new SkiaRenderer();
    rendererRef.current = renderer;

    if (onInitialize) {
      onInitialize(renderer as any);
    }
  }, [world, onInitialize]);

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        {/* Native Skia drawing is driven through SkiaRenderer render loop */}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  canvas: {
    flex: 1,
  },
});
