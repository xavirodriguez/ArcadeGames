import { VerticalShmupGame } from "../VerticalShmupGame";
import { createEnemy } from "../EntityFactory";

describe("Vertical Shmup combat polish", () => {
  let game: VerticalShmupGame;

  beforeEach(async () => {
    game = new VerticalShmupGame({ headless: true, manualLoop: true });
    await game.init();
    game.start();
    // Let ShmupCollisionSystem subscribe to combat events before the assertions.
    game.update(1 / 60);
  });

  afterEach(() => {
    game.destroy();
  });

  it("gives hit enemies a short visual flash without changing their health", () => {
    const world = game.getWorld();
    const enemy = createEnemy(world, 180, 180, "straight", 1, "scout");
    const healthBefore = world.getComponent(enemy, "Health")?.current;

    world.getEventBus()?.emit("combat:hit", {
      targetEntity: enemy,
      amount: 1,
      remainingHealth: healthBefore ?? 1
    });

    expect(world.getComponent(enemy, "Render")?.hitFlashFrames).toBe(5);
    expect(world.getComponent(enemy, "Health")?.current).toBe(healthBefore);
  });
});
