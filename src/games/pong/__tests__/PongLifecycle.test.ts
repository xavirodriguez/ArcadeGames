import { PongGame } from "../PongGame";

describe("Pong Lifecycle Safety Net", () => {
  let game: PongGame;

  beforeEach(async () => {
    game = new PongGame({ seed: 7777 });
    await game.init();
    game.start();
  });

  afterEach(() => {
    game.destroy();
  });

  it("initializes state and responds to paddle inputs", () => {
    expect(game.isGameOver()).toBe(false);
    const state = game.getGameState();
    expect(state).toBeDefined();

    game.setInputState({ p1Up: true });
    expect(() => game.update(1 / 60)).not.toThrow();

    game.setInputState({ p1Up: false, p1Down: true });
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
