import React from "react";
import { Platform } from "react-native";
import { World, GameLoop } from "@tiny-aster/core";
import { CanvasRenderer as WebCanvasRenderer } from "./CanvasRenderer";

export interface GameRendererProps {
  world: World | (() => World);
  gameLoop: GameLoop;
  onInitialize?: (renderer: any) => void;
}

/**
 * Universal Game Renderer component.
 * Uses SkiaRenderer on native iOS/Android for GPU hardware acceleration,
 * and falls back to WebCanvasRenderer on Web.
 */
export function GameRenderer({ world, gameLoop, onInitialize }: GameRendererProps) {
  if (Platform.OS !== "web") {
    try {
      const { SkiaGameRenderer } = require("./SkiaGameRenderer");
      return <SkiaGameRenderer world={world} gameLoop={gameLoop} onInitialize={onInitialize} />;
    } catch {
      return <WebCanvasRenderer world={world} gameLoop={gameLoop} onInitialize={onInitialize} />;
    }
  }

  return <WebCanvasRenderer world={world} gameLoop={gameLoop} onInitialize={onInitialize} />;
}
