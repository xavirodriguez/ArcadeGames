import React, { useRef, useEffect, useState, useMemo } from "react";
import { StyleSheet, Platform } from "react-native";
import { World, GameLoop, CoreComponentRegistry } from "@tiny-aster/core";
import { SkiaRenderer } from "@tiny-aster/renderer-skia";
import { useFrameCallback, runOnJS } from "react-native-reanimated";

interface GameRendererProps<TRegistry extends CoreComponentRegistry> {
  world: World<TRegistry> | (() => World<TRegistry>);
  gameLoop?: GameLoop;
  onInitialize?: (renderer: SkiaRenderer<TRegistry>) => void;
}

/**
 * React component for rendering the ECS world using Skia.
 *
 * @remarks
 * This component acts as a bridge between the React lifecycle and the
 * simulation's rendering phase.
 *
 * @warning
 * **Loop Decoupling**: Rendering is decoupled from the logical simulation loop.
 * While the simulation may run at a fixed timestep, the renderer attempts to
 * match the device's native refresh rate.
 */
export const GameRenderer = <TRegistry extends CoreComponentRegistry>({
  world,
  gameLoop: propGameLoop,
  onInitialize,
}: GameRendererProps<TRegistry>) => {
  const rendererRef = useRef<SkiaRenderer<TRegistry> | null>(null);
  const onInitializeRef = useRef(onInitialize);
  onInitializeRef.current = onInitialize;

  const [CanvasComponent, setCanvasComponent] = useState<React.ElementType | null>(null);
  const [PictureComponent, setPictureComponent] = useState<React.ElementType | null>(null);
  const [picture, setPicture] = useState<unknown>(null);

  const gameLoop = useMemo(() => {
    if (propGameLoop) return propGameLoop;
    return new GameLoop({ manual: Platform.OS !== "web" });
  }, [propGameLoop]);

  useFrameCallback((frameInfo) => {
    if (Platform.OS === "web") return;

    if (gameLoop) {
      runOnJS(gameLoop.tick.bind(gameLoop))(frameInfo.timestamp);
    }
  }, true);

  useEffect(() => {
    if ((Platform.OS as string) === "web") return;

    // Dynamically import Skia components for native
    const { Canvas, Picture, Skia } = require("@shopify/react-native-skia");
    setCanvasComponent(() => Canvas);
    setPictureComponent(() => Picture);

    if (!rendererRef.current) {
      rendererRef.current = new SkiaRenderer<TRegistry>();
      if (onInitializeRef.current) {
        onInitializeRef.current(rendererRef.current);
      }
    }

    if ((Platform.OS as string) !== "web") {
      gameLoop.stopInternalLoop();
    }

    if (!propGameLoop) {
      gameLoop.start();
    }

    const unsub = gameLoop.subscribeRender(() => {
      if (!rendererRef.current) return;
      try {
        const activeWorld = typeof world === "function" ? world() : world;
        if (!activeWorld) return;
        const screenConfig = activeWorld.getResource<{ width: number; height: number }>("ScreenConfig") || {
          width: 800,
          height: 600,
        };
        const recorder = Skia.PictureRecorder();
        const canvas = recorder.begin(Skia.XYWHRect(0, 0, screenConfig.width, screenConfig.height));
        rendererRef.current.render(activeWorld as any, canvas);
        const pic = recorder.finishDrawing();
        setPicture(pic);
      } catch (err) {
        console.warn("[GameRenderer] Skia frame render failed", err);
      }
    });

    return () => {
      unsub();
      if (!propGameLoop) {
        gameLoop.stop();
      }
    };
  }, [gameLoop, propGameLoop, world]);

  if (Platform.OS === "web" || !CanvasComponent) {
    return null;
  }

  return (
    <CanvasComponent style={styles.container}>
      {picture && PictureComponent ? <PictureComponent picture={picture} /> : null}
    </CanvasComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});
