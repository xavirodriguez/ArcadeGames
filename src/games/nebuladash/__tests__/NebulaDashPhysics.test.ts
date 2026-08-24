import { NebulaDashGame } from "../NebulaDashGame";

describe("NebulaDash Physics & ClimberInputSystem", () => {
  it("alters Velocity and Transform based on moveLeft, moveRight, and jump inputs", async () => {
    const game = new NebulaDashGame();
    await game.init();

    const world = game.getWorld();
    const player = world.query("Player")[0];

    expect(player).toBeDefined();

    // Initial state check
    let transform = world.getComponent(player, "Transform")!;
    let velocity = world.getComponent(player, "Velocity")!;
    const initialY = transform.y;

    expect(velocity.vx).toBe(0);
    expect(velocity.vy).toBe(0);

    // Apply moveRight and jump
    game.setInputState({ moveRight: true, jump: true });
    world.update(0.1); // dt = 0.1s

    transform = world.getComponent(player, "Transform")!;
    velocity = world.getComponent(player, "Velocity")!;

    // Lateral speed default is 320 -> vx should be 320
    expect(velocity.vx).toBe(320);
    // Jump impulse default is -420
    expect(velocity.vy).toBe(-420);

    // Position should move upwards (y decreases) and rightwards (x increases)
    expect(transform.x).toBeGreaterThan(400);
    expect(transform.y).toBeLessThan(initialY);

    // Release jump, apply moveLeft
    game.setInputState({ moveLeft: true, moveRight: false, jump: false });
    world.update(0.1);

    velocity = world.getComponent(player, "Velocity")!;
    expect(velocity.vx).toBe(-320);
    // After dt=0.1s without jump, gravity (980 * 0.1 = 98) adds to -420 -> -322
    expect(velocity.vy).toBeCloseTo(-322, 1);
  });
});
