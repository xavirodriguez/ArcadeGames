import { VerticalShmupGame } from "../VerticalShmupGame";
import { ShmupBombSystem } from "../systems/ShmupBombSystem";

describe("Vertical Shmup bomb contract (AUD-P2-01)", () => {
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
    game.update(0);
    return game;
  }

  it("starts with configured bomb stock", async () => {
    const game = await createGame();
    const state = game.world.getSingleton("ShmupGameState");
    const config = game.world.getResource<{ BOMB_STOCK_INITIAL: number }>("GameConfig");
    expect(state?.bombsRemaining).toBe(config?.BOMB_STOCK_INITIAL ?? 3);
  });

  it("detonation clears enemy bullets, spends one bomb, grants invulnerability", async () => {
    const game = await createGame();
    const world = game.world;
    const player = world.query("ShmupPlayer", "Transform", "Health")[0];
    expect(player).toBeDefined();

    const bullet = world.createEntity();
    world.addComponent(bullet, {
      type: "Transform",
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });
    world.addComponent(bullet, { type: "ShmupEnemyBullet" });

    world.mutateComponent(player, "Input", (i) => {
      i.actions = ["bomb" as never];
    });

    const stockBefore = world.getSingleton("ShmupGameState")!.bombsRemaining ?? 3;
    const system = new ShmupBombSystem();
    system.update(world, 1 / 60);

    expect(world.query("ShmupEnemyBullet").length).toBe(0);
    expect(world.getSingleton("ShmupGameState")!.bombsRemaining).toBe(stockBefore - 1);
    const health = world.getComponent(player, "Health");
    expect((health?.invulnerableRemaining ?? 0)).toBeGreaterThan(0);
  });

  it("does not detonate when stock is zero", async () => {
    const game = await createGame();
    const world = game.world;
    world.mutateSingleton("ShmupGameState", (s) => {
      s.bombsRemaining = 0;
    });
    const player = world.query("ShmupPlayer", "Input")[0];
    world.mutateComponent(player, "Input", (i) => {
      i.actions = ["bomb" as never];
    });

    const bullet = world.createEntity();
    world.addComponent(bullet, {
      type: "Transform",
      x: 50,
      y: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 50,
      worldY: 50,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });
    world.addComponent(bullet, { type: "ShmupEnemyBullet" });

    const system = new ShmupBombSystem();
    system.update(world, 1 / 60);

    expect(world.query("ShmupEnemyBullet").length).toBe(1);
    expect(world.getSingleton("ShmupGameState")!.bombsRemaining).toBe(0);
  });

  it("edge trigger: held bomb does not fire twice without release", async () => {
    const game = await createGame();
    const world = game.world;
    const player = world.query("ShmupPlayer", "Input")[0];
    world.mutateComponent(player, "Input", (i) => {
      i.actions = ["bomb" as never];
    });

    const system = new ShmupBombSystem();
    system.update(world, 1 / 60);
    const afterFirst = world.getSingleton("ShmupGameState")!.bombsRemaining;
    system.update(world, 1 / 60);
    expect(world.getSingleton("ShmupGameState")!.bombsRemaining).toBe(afterFirst);
  });
});
