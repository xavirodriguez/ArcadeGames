import { GalaxianGame } from "../GalaxianGame";
import type { GalaxianInputComponent } from "../types/GalaxianTypes";

describe("Galaxian lifecycle and input integration", () => {
  it("creates the initial scene during entity initialization without requiring a simulation tick", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });

    await game.init();

    const world = game.getWorld();
    expect(world.query("Player")).toHaveLength(1);
    expect(world.query("Formation")).toHaveLength(1);
    expect(world.query("GalaxianEnemy").length).toBeGreaterThan(0);
    expect(game.getGameState().enemiesRemaining).toBe(world.query("GalaxianEnemy").length);

    game.destroy();
  });

  it("retains input received before the player entity exists", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    game.setInputState({ moveRight: true, shoot: true });

    await game.init();
    game.stop();

    const world = game.getWorld();
    const player = world.query("Player", "Input")[0];
    const input = world.getComponent(player, "Input") as GalaxianInputComponent;

    expect(input.moveRight).toBe(true);
    expect(input.shoot).toBe(true);

    game.update(1 / 60);

    expect(world.query("PlayerBullet")).toHaveLength(1);
    game.destroy();
  });

  it("maps canonical axes and actions independently, including action-only movement", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const player = world.query("Player", "Input")[0];

    game.setInputState({ axes: { moveX: -1 }, actions: ["fire"] });
    let input = world.getComponent(player, "Input") as GalaxianInputComponent;
    expect(input.moveLeft).toBe(true);
    expect(input.moveRight).toBe(false);
    expect(input.shoot).toBe(true);

    game.setInputState({ actions: ["right"] });
    input = world.getComponent(player, "Input") as GalaxianInputComponent;
    expect(input.moveLeft).toBe(false);
    expect(input.moveRight).toBe(true);
    expect(input.shoot).toBe(false);

    game.destroy();
  });

  it("preserves untouched controls when applying partial boolean input", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const player = world.query("Player", "Input")[0];

    game.setInputState({ moveLeft: true });
    game.setInputState({ shoot: true });

    const input = world.getComponent(player, "Input") as GalaxianInputComponent;
    expect(input.moveLeft).toBe(true);
    expect(input.shoot).toBe(true);

    game.destroy();
  });
});
