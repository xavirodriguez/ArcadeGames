import { GalaxianGame } from "../GalaxianGame";

describe("Galaxian snapshot determinism", () => {
  it.each([false, true])("restores and replays ECS and visual RNG state with SoA snapshots=%s", async (useSoA) => {
    const game = new GalaxianGame({ headless: true, seed: 8675309 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    world.setResource("UseSoASnapshots", useSoA);
    game.update(1 / 60);

    const enemy = world.query("GalaxianEnemy", "Transform")[0];
    const enemyTransform = world.getComponent(enemy, "Transform");
    const enemyComponent = world.getComponent(enemy, "GalaxianEnemy");
    if (!enemyTransform || !enemyComponent) throw new Error("Expected a spawned enemy for deterministic FX test");

    const eventPayload = {
      entity: enemy,
      points: enemyComponent.pointsFormation,
      x: enemyTransform.x,
      y: enemyTransform.y,
      enemyType: enemyComponent.enemyType,
      inDive: false,
    };
    const snapshot = game.snapshot();
    const initialRenderRngState = world.renderRandom.getSeed();
    const eventBus = world.getEventBus();
    if (!eventBus) throw new Error("Galaxian event bus was not initialized");

    const continueSimulation = (): void => {
      eventBus.emit("combat:enemy_hit", eventPayload);
      world.flush();

      for (let tick = 0; tick < 24; tick++) {
        if (tick % 6 === 0) {
          game.setInput({ moveLeft: tick % 12 === 0, moveRight: tick % 12 !== 0, shoot: true });
        } else {
          game.setInput({ shoot: false });
        }
        game.update(1 / 60);
      }
    };

    continueSimulation();
    expect(world.renderRandom.getSeed()).not.toBe(initialRenderRngState);
    const expectedHash = game.hash();

    game.restore(snapshot);
    expect(world.renderRandom.getSeed()).toBe(initialRenderRngState);
    continueSimulation();

    expect(game.hash()).toBe(expectedHash);
    game.destroy();
  });

  it("restores pooled projectile availability without relying on an instance-side array", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const bullet = game.getBulletPool().acquirePlayerBullet(world, 120, 240);
    world.flush();
    game.getBulletPool().release(world, bullet);
    world.flush();

    expect(world.getComponent(bullet, "GalaxianBulletPoolEntry")?.available).toBe(true);
    const snapshot = game.snapshot();

    expect(game.getBulletPool().acquirePlayerBullet(world, 120, 240)).toBe(bullet);
    world.flush();

    game.restore(snapshot);

    expect(game.getBulletPool().acquirePlayerBullet(world, 140, 260)).toBe(bullet);
    world.flush();
    expect(world.hasComponent(bullet, "PlayerBullet")).toBe(true);

    game.destroy();
  });
});
