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

  it("should transition scenes and spawn invaders in non-headless mode after ready countdown", async () => {
    const game = new SpaceInvadersGame({
      headless: false,
      isMultiplayer: false,
      gameOptions: { seed: 1234 }
    });

    await game.init();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);

    // Advancing 3.2 seconds should complete the ready countdown (3s) and trigger spawning.
    // In non-headless mode, we pass seconds to update() in real game loop.
    const dtSec = 0.01666;
    const totalTicks = Math.ceil(3.2 / dtSec);

    for (let i = 0; i < totalTicks; i++) {
      game.update(dtSec);
    }

    // Now the scene transition should have completed, onEnter executed, and readyRemaining reached 0.
    // Let's verify that the active world has Invader entities!
    const activeWorld = game.getWorld();
    const invaders = activeWorld.query("Invader");
    expect(invaders.length).toBeGreaterThan(0);

    const players = activeWorld.query("Player");
    expect(players.length).toBe(1);

    game.destroy();
  });
});
