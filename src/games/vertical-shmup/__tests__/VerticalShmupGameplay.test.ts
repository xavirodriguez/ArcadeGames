import { VerticalShmupGame } from "../VerticalShmupGame";
import { createEnemy } from "../EntityFactory";
import { BoundarySystem } from "@tiny-aster/core";

describe("VerticalShmup Gameplay Systems & Mechanics", () => {
  let game: VerticalShmupGame;

  beforeEach(async () => {
    game = new VerticalShmupGame();
    await game.init();
    game.start();
    // Advance 1 tick so system event subscriptions initialize
    game.update(1 / 60);
  });

  afterEach(() => {
    game.destroy();
  });

  it("attaches BulletPattern component to enemies created via createEnemy", () => {
    const world = game.getWorld();
    const enemy = createEnemy(world, 100, 100, "straight", 1);
    const pattern = world.getComponent(enemy, "BulletPattern");

    expect(pattern).toBeDefined();
    expect(pattern?.config.kind).toBe("aimed");
    expect(pattern?.config.ratePerSec).toBeGreaterThan(0);
  });

  it("advances wave and spawns new squad when all active enemies are cleared", () => {
    const world = game.getWorld();
    const stateBefore = world.getSingleton("ShmupGameState");
    expect(stateBefore?.wave).toBe(1);

    // Clear all existing enemies
    const initialEnemies = world.query("ShmupEnemy");
    for (const e of initialEnemies) {
      world.reclaimEntity(e);
    }
    world.getCommandBuffer().flush(world as never);

    // Run 1 simulation tick to execute ShmupSpawnSystem
    game.update(1 / 60);

    const stateAfter = world.getSingleton("ShmupGameState");
    expect(stateAfter?.wave).toBe(2);

    const newEnemies = world.query("ShmupEnemy");
    expect(newEnemies.length).toBeGreaterThan(0);
  });

  it("activates player invulnerability on combat:hit event and ticks duration down", () => {
    const world = game.getWorld();
    const player = world.query("ShmupPlayer")[0];
    expect(player).toBeDefined();

    world.getEventBus()?.emit("combat:hit", {
      targetEntity: player!,
      amount: 1,
      remainingHealth: 2
    });

    const healthAfterHit = world.getComponent(player!, "Health");
    expect(healthAfterHit?.invulnerableRemaining).toBe(1.5);

    // Tick simulation forward by 0.5s
    game.update(0.5);

    const healthAfterTick = world.getComponent(player!, "Health");
    expect(healthAfterTick?.invulnerableRemaining).toBeCloseTo(1.0, 1);
  });

  it("reclaims offscreen enemies passing boundary max bounds", () => {
    const world = game.getWorld();
    const enemy = createEnemy(world, 200, 1000, "straight", 1); // Placed far below WORLD_HEIGHT (854)

    expect(world.hasEntity(enemy)).toBe(true);

    // Run boundary system check
    const boundarySystem = new BoundarySystem();
    boundarySystem.update(world as never, 1 / 60);
    world.getCommandBuffer().flush(world as never);

    expect(world.hasEntity(enemy)).toBe(false);
  });
});
