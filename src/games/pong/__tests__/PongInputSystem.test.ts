import { World, TouchInputState } from "@tiny-aster/core";
import { PongInputSystem } from "../systems/PongInputSystem";
import { PongGame } from "../PongGame";

describe("PongInputSystem TouchInputState Integration", () => {
  it("should update paddle velocity based on TouchInputState button presses and moveY axis", async () => {
    const game = new PongGame({ gameOptions: { seed: 12345 } });
    await game.init();
    const world = game.getWorld();

    const touchState = new TouchInputState();
    world.setResource("TouchInputState", touchState);

    // Initial tick - no inputs, paddle vy should be 0
    world.update(1 / 60);
    const paddles = world.query("Paddle");
    expect(paddles.length).toBeGreaterThan(0);

    const leftPaddle = paddles.find((e) => world.getComponent(e, "Paddle")?.side === "left")!;
    expect(leftPaddle).toBeDefined();

    // 1. Simulate button "p1Up"
    touchState.setButton("p1Up", true);
    world.update(1 / 60);
    let vel = world.getComponent(leftPaddle, "Velocity");
    expect(vel?.vy).toBeLessThan(0); // moving up (negative vy)

    // Release button
    touchState.setButton("p1Up", false);
    world.update(1 / 60);
    vel = world.getComponent(leftPaddle, "Velocity");
    expect(vel?.vy).toBe(0);

    // 2. Simulate continuous moveY axis (downward)
    touchState.setMoveAxis(0, 0.5);
    world.update(1 / 60);
    vel = world.getComponent(leftPaddle, "Velocity");
    expect(vel?.vy).toBeGreaterThan(0); // moving down (positive vy)

    // Reset axis
    touchState.setMoveAxis(0, 0);
    world.update(1 / 60);
    vel = world.getComponent(leftPaddle, "Velocity");
    expect(vel?.vy).toBe(0);
  });
});
