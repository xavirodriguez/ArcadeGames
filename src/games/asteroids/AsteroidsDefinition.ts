import { GameDefinition, SHARED_AUDIO_MANIFEST } from "@tiny-aster/core";
import { AsteroidsGame } from "./AsteroidsGame";

export const AsteroidsDefinition: GameDefinition = {
  name: "asteroids",
  createSimulation: (seed: number, options?: { modifiers?: unknown[]; gameOptions?: Record<string, unknown> }) => {
    const combinedGameOptions = {
      seed,
      ...options?.gameOptions,
      ...(options?.modifiers ? { modifiers: options.modifiers } : {})
    };
    const game = new AsteroidsGame({ gameOptions: combinedGameOptions });
    return game;
  },
  inputSchema: {
    actions: ["thrust", "left", "right", "fire", "hyperspace"]
  },
  assets: {
    sprites: [],
    sounds: SHARED_AUDIO_MANIFEST
  }
};
