import { FroggerGame } from "../FroggerGame";

describe("Frogger Lifecycle Safety Net", () => {
  let game: FroggerGame;

  beforeEach(async () => {
    game = new FroggerGame({ seed: 54321 });
    await game.init();
    game.start();
  });

  afterEach(() => {
    game.destroy();
  });

  it("initializes state and processes grid movement inputs", () => {
    expect(game.isGameOver()).toBe(false);
    const state = game.getGameState();
    expect(state.lives).toBe(3);
    expect(state.score).toBe(0);

    // Simulate jump up
    game.setInputState({ moveUp: true });
    expect(() => game.update(1 / 60)).not.toThrow();

    game.setInputState({ moveUp: false });
    expect(() => game.update(1 / 60)).not.toThrow();
  });

  it("runs 120 simulation ticks and restarts cleanly", async () => {
    for (let i = 0; i < 120; i++) {
      game.update(1 / 60);
    }
    expect(game.isGameOver()).toBe(false);

    await expect(game.restart()).resolves.not.toThrow();
    expect(game.getGameState().score).toBe(0);
  });
});
