import { BaseGameSimulationAdapter } from "@tiny-aster/core";
import { AsteroidsGame } from "./AsteroidsGame";

/**
 * Adapter bridging AsteroidsGame simulation steps to GameDefinition and Simulation interfaces.
 * @public
 */
export class AsteroidsGameAdapter extends BaseGameSimulationAdapter<AsteroidsGame> {
  constructor(options: { seed?: number; mode?: "deathmatch" | "story"; gameOptions?: Record<string, unknown> } = {}) {
    const game = new AsteroidsGame({
      gameOptions: { seed: options.seed, mode: options.mode || "deathmatch", ...options.gameOptions },
      headless: true
    });
    game.start();
    super(game);
  }
}

export const AsteroidsDefinition = {
  name: "asteroids",
  createSimulation: (seed: number) => {
    return new AsteroidsGameAdapter({ seed });
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
