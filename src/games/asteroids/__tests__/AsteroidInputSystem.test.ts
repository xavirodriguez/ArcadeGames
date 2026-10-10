import { World, TouchInputState } from "@tiny-aster/core";
import { AsteroidsGame } from "../AsteroidsGame";

describe("AsteroidInputSystem TouchInputState Integration", () => {
  let game: AsteroidsGame;

  afterEach(() => {
    if (game) {
      game.destroy();
    }
  });

  it("should process ship rotation, thrust, and shooting from TouchInputState", async () => {
    game = new AsteroidsGame({ headless: true, gameOptions: { seed: 12345 } });
    await game.init();
    const world = game.getWorld();

    const touchState = new TouchInputState();
    world.setResource("TouchInputState", touchState);

    const players = world.query("LocalPlayer", "Transform", "Velocity");
    expect(players.length).toBeGreaterThan(0);
    const shipEntity = players[0];

    const initialTransform = { ...world.getComponent(shipEntity, "Transform")! };
    const initialVel = { ...world.getComponent(shipEntity, "Velocity")! };

    // 1. Simulate joystick rotation (moveX = 1.0)
    touchState.setMoveAxis(1.0, 0);
    world.update(1 / 60);

    const rotatedTransform = world.getComponent(shipEntity, "Transform")!;
    expect(rotatedTransform.rotation).not.toEqual(initialTransform.rotation);

    // 2. Simulate thrust (moveY = -1.0)
    touchState.setMoveAxis(0, -1.0);
    world.update(1 / 60);

    const thrustVel = world.getComponent(shipEntity, "Velocity")!;
    expect(Math.hypot(thrustVel.vx, thrustVel.vy)).toBeGreaterThan(Math.hypot(initialVel.vx, initialVel.vy));

    // Reset axis
    touchState.setMoveAxis(0, 0);

    // 3. Simulate shooting button
    const bulletCountBefore = world.query("Bullet").length;
    touchState.setButton("shoot", true);
    world.update(1 / 60);

    const bulletCountAfter = world.query("Bullet").length;
    expect(bulletCountAfter).toBeGreaterThan(bulletCountBefore);
  });
});
