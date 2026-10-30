import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { StyleSheet, Platform } from "react-native";
import { World, GameLoop, CoreComponentRegistry } from "@tiny-aster/core";
import { SkiaRenderer } from "@tiny-aster/renderer-skia";
import { useFrameCallback, runOnJS } from "react-native-reanimated";

type SkiaModule = typeof import("@shopify/react-native-skia");
type SkiaPicture = React.ComponentProps<SkiaModule["Picture"]>["picture"];

interface GameRendererProps<TRegistry extends CoreComponentRegistry> {
  world: World<TRegistry>;
  gameLoop?: GameLoop;
  onInitialize?: (renderer: SkiaRenderer<TRegistry>) => void;
}

/**
 * React bridge for the imperative ECS renderer on native platforms.
 *
 * The renderer records each game-loop render into a Skia Picture, which the
 * retained Canvas tree presents. Web continues to use CanvasRenderer.
 */
export const GameRenderer = <TRegistry extends CoreComponentRegistry>({
  world,
  gameLoop: propGameLoop,
  onInitialize,
}: GameRendererProps<TRegistry>) => {
  const rendererRef = useRef<SkiaRenderer<TRegistry> | null>(null);
  const onInitializeRef = useRef(onInitialize);
  onInitializeRef.current = onInitialize;

  const [skiaModule, setSkiaModule] = useState<SkiaModule | null>(null);
  const [picture, setPicture] = useState<SkiaPicture | null>(null);

  const gameLoop = useMemo(() => {
    if (propGameLoop) return propGameLoop;
    return new GameLoop({ manual: Platform.OS !== "web" });
  }, [propGameLoop]);

  // Tick on the JS thread with the loop's own scheduler clock. Reanimated's
  // frame timestamp can use a different time origin on native platforms.
  const tickGameLoop = useCallback(() => {
    gameLoop.tick();
  }, [gameLoop]);

  useFrameCallback(() => {
    if (Platform.OS === "web") return;
    runOnJS(tickGameLoop)();
  }, true);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const loadedSkia = require("@shopify/react-native-skia") as SkiaModule;
    setSkiaModule(loadedSkia);
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" || !skiaModule) return;

    if (!rendererRef.current) {
      rendererRef.current = new SkiaRenderer<TRegistry>();
      onInitializeRef.current?.(rendererRef.current);
    }

    gameLoop.stopInternalLoop();
    if (!propGameLoop) {
      gameLoop.start();
    }

    const unsubscribe = gameLoop.subscribeRender((alpha) => {
      const renderer = rendererRef.current;
      if (!renderer) return;

      const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig")
        ?? { width: 800, height: 600 };
      const recorder = skiaModule.Skia.PictureRecorder();
      const recordingCanvas = recorder.beginRecording(
        skiaModule.Skia.XYWHRect(0, 0, screenConfig.width, screenConfig.height)
      );
      renderer.render(world, recordingCanvas, alpha);
      setPicture(recorder.finishRecordingAsPicture());
    });

    return () => {
      unsubscribe();
      if (!propGameLoop) {
        gameLoop.stop();
      }
    };
  }, [gameLoop, propGameLoop, skiaModule, world]);

  if (Platform.OS === "web" || !skiaModule) {
    return null;
  }

  return React.createElement(
    skiaModule.Canvas,
    { style: styles.container },
    picture ? React.createElement(skiaModule.Picture, { picture }) : null
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});
