import { VerticalShmupGame } from "../VerticalShmupGame";
import { World } from "@tiny-aster/core";

describe("VerticalShmup Initialization & RandomService", () => {
  it("initializes game successfully using runWithUnlockedRandomAndMutators without RandomService lock errors", async () => {
    const game = new VerticalShmupGame();
    await expect(game.init()).resolves.not.toThrow();
    game.start();

    // Verify 120 ticks simulation runs without throwing
    expect(() => {
      for (let i = 0; i < 120; i++) {
        game.update(1 / 60);
      }
    }).not.toThrow();

    game.destroy();
  });

  it("fails if RandomService.next() is called while gameplayRandom is locked", () => {
    const world = new World();
    expect(world.gameplayRandom.isLocked()).toBe(true);
    expect(() => world.gameplayRandom.next()).toThrow(
      "RandomService: Gameplay context is locked. Random cannot be generated during this phase."
    );
  });
});
