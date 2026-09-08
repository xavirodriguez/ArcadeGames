import { BaseGameSimulationAdapter } from "@tiny-aster/core";
import { FlappyBirdGame } from "./FlappyBirdGame";

/**
 * Adapter bridging FlappyBirdGame simulation steps to Simulation interface.
 * @public
 */
export class FlappyBirdGameAdapter extends BaseGameSimulationAdapter<FlappyBirdGame> {
  constructor(options: { seed?: number; gameOptions?: Record<string, unknown> } = {}) {
    const game = new FlappyBirdGame({
      seed: options.seed,
      gameOptions: { seed: options.seed, ...options.gameOptions }
    });
    game.start();
    super(game);
  }
}
