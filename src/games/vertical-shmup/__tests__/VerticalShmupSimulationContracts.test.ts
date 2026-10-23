import { VerticalShmupGame } from "../VerticalShmupGame";
import type { ShmupConfig } from "../types/ShmupConfigSchema";

describe("Vertical Shmup simulation contracts (P0)", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) {
      game.destroy();
    }
  });

  async function createGame(): Promise<VerticalShmupGame> {
    const game = new VerticalShmupGame({ headless: true, manualLoop: true });
    games.push(game);
    await game.init();
    return game;
  }

  function requirePlayer(game: VerticalShmupGame): number {
    const player = game.getWorld().query("ShmupPlayer", "Input", "Transform", "Velocity")[0];
    if (player === undefined) {
      throw new Error("Expected initialized vertical-shmup player");
    }
    return player;
  }

  it("normalizes diagonal input so total speed never exceeds PLAYER_SPEED", async () => {
    const game = await createGame();
    const world = game.getWorld();
    const player = requirePlayer(game);

    game.setInputState({ axes: { moveX: 1, moveY: -1 } });
    game.update(0);

    const velocity = world.getComponent(player, "Velocity");
    const config = world.getResource<ShmupConfig>("GameConfig");
    if (!velocity || !config) throw new Error("Expected player velocity and game configuration");

    expect(Math.hypot(velocity.vx, velocity.vy)).toBeCloseTo(config.PLAYER_SPEED, 8);
    expect(Math.abs(velocity.vx)).toBeCloseTo(config.PLAYER_SPEED / Math.sqrt(2), 8);
    expect(Math.abs(velocity.vy)).toBeCloseTo(config.PLAYER_SPEED / Math.sqrt(2), 8);
  });

  it("travels the same distance for 30 FPS, 60 FPS, and irregular time steps", async () => {
    const runForOneSecond = async (steps: number[]): Promise<number> => {
      const game = await createGame();
      const world = game.getWorld();
      const player = requirePlayer(game);
      const start = world.getComponent(player, "Transform");
      if (!start) throw new Error("Expected player transform");
      const startY = start.y;

      game.setInputState({ axes: { moveX: 0, moveY: -1 } });
      for (const deltaTime of steps) game.update(deltaTime);

      const end = world.getComponent(player, "Transform");
      if (!end) throw new Error("Expected player transform after simulation");
      return startY - end.y;
    };

    const distanceAt30Fps = await runForOneSecond(Array.from({ length: 30 }, () => 1 / 30));
    const distanceAt60Fps = await runForOneSecond(Array.from({ length: 60 }, () => 1 / 60));
    const distanceAtIrregularSteps = await runForOneSecond([0.07, 0.13, 0.21, 0.09, 0.16, 0.14, 0.2]);

    expect(distanceAt30Fps).toBeCloseTo(300, 6);
    expect(distanceAt60Fps).toBeCloseTo(300, 6);
    expect(distanceAtIrregularSteps).toBeCloseTo(300, 6);
  });

  it("clamps the player to the exact playfield edge after movement integration", async () => {
    const game = await createGame();
    const world = game.getWorld();
    const player = requirePlayer(game);
    const config = world.getResource<ShmupConfig>("GameConfig");
    const transform = world.getMutableComponent(player, "Transform");
    if (!config || !transform) throw new Error("Expected player transform and game configuration");

    const maxX = config.WORLD_WIDTH - config.PLAYER_SIZE;
    transform.x = maxX - 1;
    game.setInputState({ axes: { moveX: 1, moveY: 0 } });
    game.update(1 / 60);

    const finalTransform = world.getComponent(player, "Transform");
    const finalVelocity = world.getComponent(player, "Velocity");
    if (!finalTransform || !finalVelocity) throw new Error("Expected player state after movement");

    expect(finalTransform.x).toBe(maxX);
    expect(finalVelocity.vx).toBe(0);
  });

  it("uses a small circular vulnerability hitbox independent of the sprite size", async () => {
    const game = await createGame();
    const world = game.getWorld();
    const player = requirePlayer(game);
    const collider = world.getComponent(player, "Collider");
    if (!collider) throw new Error("Expected player collider");

    expect(collider.shape).toMatchObject({ radius: 2.5 });
  });
});
