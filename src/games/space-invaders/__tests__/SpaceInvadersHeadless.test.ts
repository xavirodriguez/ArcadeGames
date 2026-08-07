import { SpaceInvadersGame } from "../SpaceInvadersGame";
import { GameLifecycleState } from "@tiny-aster/core";

describe("SpaceInvadersGame Headless Mode", () => {
  it("should initialize cleanly in headless singleplayer mode and spawn entities", async () => {
    const game = new SpaceInvadersGame({
      headless: true,
      isMultiplayer: false,
      gameOptions: { seed: 1234 }
    });

    await game.init();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);

    // Run a step of simulation
    expect(() => game.update(16.66)).not.toThrow();

    const state = game.getGameState();
    expect(state).toBeDefined();
    expect(state.lives).toBeGreaterThan(0);

    game.destroy();
  });

  it("should initialize cleanly in headless multiplayer mode and wait for server state", async () => {
    const game = new SpaceInvadersGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: 1234 }
    });

    await game.init();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);

    // Run a step of simulation
    expect(() => game.update(16.66)).not.toThrow();

    const state = game.getGameState();
    expect(state).toBeDefined();
    // In multiplayer mode, local initial entity creation is skipped
    expect(state.lives).toBe(0);

    game.destroy();
  });
});
