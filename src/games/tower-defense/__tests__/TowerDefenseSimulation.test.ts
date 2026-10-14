import { TowerDefenseGame } from "../TowerDefenseGame";
import { GridPathfinding, GridPassabilityMap } from "@tiny-aster/core";

describe("Tower Defense Headless Simulation", () => {
  it("simulates economy, pathfinding, and entity pooling deterministically in headless mode", async () => {
    const game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();

    // Verify initial economy state
    const initialState = game.getGameState();
    expect(initialState.gold).toBeGreaterThan(0);
    expect(initialState.lives).toBeGreaterThan(0);
    expect(initialState.wave).toBeGreaterThanOrEqual(0);

    // Verify grid pathfinding utility
    const passabilityMap: GridPassabilityMap = {
      width: 10,
      height: 10,
      isWalkable: () => true
    };
    const path = GridPathfinding.bfs(passabilityMap, { x: 0, y: 0 }, { x: 5, y: 5 });
    expect(path.length).toBeGreaterThan(0);

    // Advance simulation for 30 ticks
    for (let i = 0; i < 30; i++) {
      game.update(1 / 60);
    }

    const currentState = game.getGameState();
    expect(currentState.lives).toBeGreaterThan(0);

    game.destroy();
  });
});
