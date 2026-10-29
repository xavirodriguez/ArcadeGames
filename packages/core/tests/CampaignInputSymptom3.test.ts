import { computeShipPhysics } from "../src";

describe("Symptom 3 Baseline Test", () => {
  it("verifies ship position is unchanged without input and updates when thrust input is supplied", () => {
    // Isolated headless physics verification matching AsteroidInputSystem and MovementSystem
    const config = { SHIP_THRUST: 300, SHIP_ROTATION_SPEED: 3, SHIP_FRICTION: 0.1 };
    const transform = { x: 400, y: 300, rotation: 0 };
    const velocity = { vx: 0, vy: 0 };

    // 10 ticks without input
    const emptyInput = { actions: {}, axes: {} };
    for (let i = 0; i < 10; i++) {
      const phys = computeShipPhysics(transform, velocity, emptyInput, config, 0.016);
      velocity.vx = phys.vx;
      velocity.vy = phys.vy;
      transform.x += velocity.vx * 0.016;
      transform.y += velocity.vy * 0.016;
    }

    expect(transform.x).toBe(400);
    expect(transform.y).toBe(300);

    // 10 ticks with thrust input (facing rotation=0, forward vector is +X)
    const thrustInput = { actions: { thrust: true }, axes: {}, thrust: true };
    for (let i = 0; i < 10; i++) {
      const phys = computeShipPhysics(transform, velocity, thrustInput, config, 0.016);
      velocity.vx = phys.vx;
      velocity.vy = phys.vy;
      transform.x += velocity.vx * 0.016;
      transform.y += velocity.vy * 0.016;
    }

    expect(transform.x).toBeGreaterThan(400);
  });
});
