import { BaseGameSimulationAdapter } from "@tiny-aster/core";
import { SpaceInvadersGame } from "./SpaceInvadersGame";

/**
 * Adapter bridging SpaceInvadersGame simulation steps to Simulation interface.
 * @public
 */
export class SpaceInvadersGameAdapter extends BaseGameSimulationAdapter<SpaceInvadersGame> {
  constructor(options: { seed?: number; gameOptions?: Record<string, unknown> } = {}) {
    const game = new SpaceInvadersGame({
      gameOptions: { seed: options.seed, ...options.gameOptions },
      headless: true
    });
    game.start();
    super(game);
  }
}

export const SpaceInvadersDefinition = {
  name: "space-invaders",
  createSimulation: (seed: number) => {
    return new SpaceInvadersGameAdapter({ seed });
  },
  inputSchema: {
    actions: ["moveLeft", "moveRight", "shoot"]
  },
  assets: {
    sprites: [],
    sounds: [
      { id: "shoot", path: "/audio/shoot.mp3" },
      { id: "hit", path: "/audio/hit.mp3" },
      { id: "explosion", path: "/audio/explosion.mp3" },
      { id: "game_over", path: "/audio/game_over.mp3" }
    ]
  }
};
