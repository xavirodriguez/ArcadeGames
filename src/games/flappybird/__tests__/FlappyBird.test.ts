import { World, SystemPhase, CollisionSystem2D } from "@tiny-aster/core";
import { FlappyBirdGame } from "../FlappyBirdGame";
import { FLAPPY_CONFIG } from "../types/FlappyBirdTypes";

describe("Flappy Bird Gameplay, Input and Collision Mechanics", () => {
  let game: FlappyBirdGame;
  let world: any;

  beforeEach(async () => {
    game = new FlappyBirdGame({ isMultiplayer: false });
    await game.init();
    world = game.getWorld();
  });

  afterEach(() => {
    game.destroy();
  });

  test("should activate glide when held for more than 200ms", () => {
    const bird = world.query("Bird")[0];

    console.log("Start glide test");
    // Simulate continuous holding via setInputState + update sequence
    game.setInputState({ flap: true, glide: true });
    game.update(0.1); // 100ms
    console.log("After 100ms, vel.vy:", world.getComponent(bird, "Velocity").vy);

    // Keep holding glide, but flap is false after initial tap to avoid auto-flapping on cooldown
    game.setInputState({ flap: false, glide: true });
    game.update(0.15); // Total 250ms hold
    const inputComp = world.getComponent(bird, "FlappyInput");
    console.log("After 250ms, vel.vy:", world.getComponent(bird, "Velocity").vy);
    console.log("After 250ms, inputComp.glide:", inputComp.glide);
    console.log("After 250ms, inputComp.pressDuration:", inputComp.pressDuration);

    expect(inputComp.glide).toBe(true);

    // Run for another 200ms in small steps so the bird starts falling (vy > 0)
    console.log("Before final 200ms update, vy:", world.getComponent(bird, "Velocity").vy);
    game.setInputState({ flap: false, glide: true });
    game.update(0.05);
    console.log("After 300ms, vy:", world.getComponent(bird, "Velocity").vy, "isGliding:", world.getComponent(bird, "Bird").isGliding);
    game.update(0.05);
    console.log("After 350ms, vy:", world.getComponent(bird, "Velocity").vy, "isGliding:", world.getComponent(bird, "Bird").isGliding);
    game.update(0.05);
    console.log("After 400ms, vy:", world.getComponent(bird, "Velocity").vy, "isGliding:", world.getComponent(bird, "Bird").isGliding);
    game.update(0.05);
    console.log("After 450ms, vy:", world.getComponent(bird, "Velocity").vy, "isGliding:", world.getComponent(bird, "Bird").isGliding);

    const birdComp = world.getComponent(bird, "Bird");
    expect(birdComp.isGliding).toBe(true);
  });
});
