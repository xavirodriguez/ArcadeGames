import { World, TouchInputState } from "@tiny-aster/core";
import { FlappyBirdGame } from "../FlappyBirdGame";

describe("FlappyBirdInputSystem TouchInputState Integration", () => {
  it("should trigger bird flap when TouchInputState 'flap' button or tap is active", async () => {
    const game = new FlappyBirdGame({ gameOptions: { seed: 12345 } });
    await game.init();
    const world = game.getWorld();

    const touchState = new TouchInputState();
    world.setResource("TouchInputState", touchState);

    const birds = world.query("Bird");
    expect(birds.length).toBeGreaterThan(0);
    const birdEntity = birds[0];

    const initialVel = world.getComponent(birdEntity, "Velocity")?.vy ?? 0;

    // Simulate touch flap button press
    touchState.setButton("flap", true);
    world.update(1 / 60);

    const flappedVel = world.getComponent(birdEntity, "Velocity")?.vy ?? 0;
    expect(flappedVel).toBeLessThan(initialVel);

    // Release button and run next frame
    touchState.setButton("flap", false);
    world.update(1 / 60);

    // Simulate tap event via pushTap
    touchState.pushTap({ x: 100, y: 100 });
    world.update(1 / 60);
    const tapFlappedVel = world.getComponent(birdEntity, "Velocity")?.vy ?? 0;
    expect(tapFlappedVel).toBeLessThan(0);
  });
});
