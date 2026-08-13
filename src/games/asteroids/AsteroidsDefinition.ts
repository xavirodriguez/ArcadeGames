import { GameDefinition } from "@tiny-aster/core";
import { AsteroidsGame } from "./AsteroidsGame";

export const AsteroidsDefinition: GameDefinition = {
  name: "asteroids",
  createSimulation: (seed: number) => {
    const game = new AsteroidsGame({ gameOptions: { seed } });
    return game;
  },
  inputSchema: {
    actions: ["thrust", "left", "right", "fire", "hyperspace"]
  },
  assets: {
    sprites: [],
    sounds: [
      { id: "shoot", path: "/audio/shoot.mp3" },
      { id: "explosion", path: "/audio/explosion.mp3" }
    ]
  }
};
