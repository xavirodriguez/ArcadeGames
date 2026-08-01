import { World, Juice } from "@tiny-aster/core";
import { AsteroidInputSystem } from "../systems/AsteroidInputSystem";

describe("Delta Time Unit Parity & Timing Parity Tests", () => {
  it("should correctly rotate ship in AsteroidInputSystem using standard seconds-based deltaTime", () => {
    const world = new World<any, any>();
    const config = {
      SHIP_THRUST: 150,
      SHIP_ROTATION_SPEED: 4.0,
      SHIP_FRICTION: 0.99,
      SHIP_SHOOT_COOLDOWN: 0.25,
      BULLET_SPEED: 300
    };
    world.setResource("GameConfig", config);

    const inputSys = new AsteroidInputSystem(config as any);
    world.addSystem(inputSys);

    const entity = world.createEntity();
    world.addComponent(entity, { type: "LocalPlayer" });
    world.addComponent(entity, { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 });
    world.addComponent(entity, { type: "Velocity", vx: 0, vy: 0 });
    world.addComponent(entity, {
      type: "Input",
      actions: { rotateRight: true }
    });

    // Run system for 1/60s (seconds)
    world.update(1 / 60);

    // Verify rotation occurred by a correct magnitude: rotation speed * dt
    const transform = world.getComponent(entity, "Transform")!;
    const expectedRotation = 4.0 * (1 / 60);
    expect(transform.rotation).toBeCloseTo(expectedRotation, 4);
  });

  it("should correctly update shoot cooldowns in seconds", () => {
    const world = new World<any, any>();
    const config = {
      SHIP_THRUST: 150,
      SHIP_ROTATION_SPEED: 4.0,
      SHIP_FRICTION: 0.99,
      SHIP_SHOOT_COOLDOWN: 0.25,
      BULLET_SPEED: 300
    };
    world.setResource("GameConfig", config);

    const inputSys = new AsteroidInputSystem(config as any);
    world.addSystem(inputSys);

    const entity = world.createEntity();
    world.addComponent(entity, { type: "LocalPlayer" });
    world.addComponent(entity, { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 });
    world.addComponent(entity, { type: "Velocity", vx: 0, vy: 0 });
    world.addComponent(entity, { type: "Input", actions: {} });
    world.addComponent(entity, { type: "Ship", shootCooldownRemaining: 0.25 });

    // 1 frame update of 1/60s (seconds)
    world.update(1 / 60);

    const ship = world.getComponent(entity, "Ship")!;
    expect(ship.shootCooldownRemaining).toBeCloseTo(0.25 - (1 / 60), 4);
  });

  it("should scale Juice duration from milliseconds to seconds internally", () => {
    const world = new World<any, any>();
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 });

    Juice.add(world as any, entity, {
      property: "scaleX",
      target: 2.0,
      duration: 1000 // 1000 ms, should be converted to 1.0 seconds
    });

    const juice = world.getComponent(entity, "Juice") as any;
    expect(juice).toBeDefined();
    expect(juice.animations[0].duration).toBe(1.0);
  });
});
