import { BaseGameSimulationAdapter } from "@tiny-aster/core";
import { EchoRunnerGame } from "./EchoRunnerGame";

/**
 * Adapter bridging EchoRunnerGame simulation steps to Simulation interface.
 * @public
 */
export class EchoRunnerGameAdapter extends BaseGameSimulationAdapter<EchoRunnerGame> {
  constructor(options: { seed?: number; gameOptions?: Record<string, unknown> } = {}) {
    const game = new EchoRunnerGame({
      seed: options.seed,
      gameOptions: { seed: options.seed, ...options.gameOptions }
    });
    game.start();
    super(game);
  }
}
