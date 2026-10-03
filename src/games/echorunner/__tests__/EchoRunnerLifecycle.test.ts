import { EchoRunnerGame } from "../EchoRunnerGame";

describe("EchoRunner Lifecycle Safety Net", () => {
  let game: EchoRunnerGame;

  beforeEach(async () => {
    game = new EchoRunnerGame({ seed: 12345 });
    await game.init();
    game.start();
  });

  afterEach(() => {
    game.destroy();
  });

  it("initializes state and handles input without throwing", () => {
    expect(game.isGameOver()).toBe(false);
    const state = game.getGameState();
    expect(state.score).toBe(0);

    // Apply input
    game.setInputState({ moveLeft: true });
    expect(() => game.update(1 / 60)).not.toThrow();

    game.setInputState({ moveLeft: false, jumpPressed: true });
    expect(() => game.update(1 / 60)).not.toThrow();
  });

  it("runs 120 ticks and supports restart", async () => {
    for (let i = 0; i < 120; i++) {
      game.update(1 / 60);
    }
    expect(game.isGameOver()).toBe(false);

    await expect(game.restart()).resolves.not.toThrow();
    expect(game.getGameState().score).toBe(0);
  });
});
