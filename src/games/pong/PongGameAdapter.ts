import { BaseGameSimulationAdapter } from "@tiny-aster/core";
import { PongGame } from "./PongGame";

/**
 * Adapter bridging PongGame simulation steps to GameDefinition and Simulation interfaces.
 * @public
 */
export class PongGameAdapter extends BaseGameSimulationAdapter<PongGame> {
  constructor(options: { seed?: number; mode?: "local" | "ai" | "online"; gameOptions?: Record<string, unknown> } = {}) {
    const game = new PongGame({
      seed: options.seed,
      mode: options.mode || "local",
      gameOptions: options.gameOptions
    });
    game.start();
    super(game);
  }
}

export const PongDefinition = {
  name: "pong",
  createSimulation: (seed: number) => {
    return new PongGameAdapter({ seed });
  },
  inputSchema: {
    actions: ["up", "down"]
  },
  assets: {
    sprites: [],
    sounds: []
  }
};
