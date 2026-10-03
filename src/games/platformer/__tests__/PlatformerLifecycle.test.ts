import { PlatformerGame } from "../PlatformerGame";

describe("Platformer Lifecycle Safety Net", () => {
  let game: PlatformerGame;

  beforeEach(async () => {
    game = new PlatformerGame({ seed: 9999 });
    await game.init();
    game.start();
  });

  afterEach(() => {
    game.destroy();
  });

  it("initializes state and responds to movement/jump inputs", () => {
    expect(game.isGameOver()).toBe(false);
    const state = game.getGameState();
    expect(state).toBeDefined();

    game.setInputState({ moveRight: true });
    expect(() => game.update(1 / 60)).not.toThrow();

    game.setInputState({ moveRight: false, jumpPressed: true });
    expect(() => game.update(1 / 60)).not.toThrow();
  });

  it("runs 120 ticks and supports restart", async () => {
    for (let i = 0; i < 120; i++) {
      game.update(1 / 60);
    }
    expect(game.isGameOver()).toBe(false);

    await expect(game.restart()).resolves.not.toThrow();
  });
});
