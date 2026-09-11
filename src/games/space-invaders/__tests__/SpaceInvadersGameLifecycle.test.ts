import { SpaceInvadersGame } from "../SpaceInvadersGame";
import { GameLifecycleState } from "@tiny-aster/core";

describe("SpaceInvadersGame Lifecycle Tests", () => {
  it("initializes and transitions lifecycle state properly on start, pause, resume, and stop", async () => {
    const game = new SpaceInvadersGame({ headless: true, seed: 12345 });
    expect(game.getLifecycleState()).toBe(GameLifecycleState.UNINITIALIZED);

    await game.init();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);

    game.pause();
    expect(game.isPausedState()).toBe(true);
    expect(game.getLifecycleState()).toBe(GameLifecycleState.PAUSED);
    expect(game.getWorld().getResource("IsPaused")).toBe(true);

    game.resume();
    expect(game.isPausedState()).toBe(false);
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);
    expect(game.getWorld().getResource("IsPaused")).toBeUndefined();

    game.stop();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.STOPPED);

    game.destroy();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.DESTROYED);
  });
});
