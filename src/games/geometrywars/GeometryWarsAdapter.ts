import { BaseGameSimulationAdapter } from "@tiny-aster/core";
import { GeometryWarsGame } from "./GeometryWarsGame";

/**
 * Adapter bridging GeometryWarsGame simulation steps to Simulation interface.
 * @public
 */
export class GeometryWarsGameAdapter extends BaseGameSimulationAdapter<GeometryWarsGame> {
  constructor(options: { seed?: number; gameOptions?: Record<string, unknown> } = {}) {
    const game = new GeometryWarsGame({
      gameOptions: { seed: options.seed, ...options.gameOptions },
      headless: true
    });
    game.start();
    super(game);
  }
}
