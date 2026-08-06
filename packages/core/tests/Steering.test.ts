import { World, SteeringSystem, CoreComponentRegistry } from "../src";

describe("Steering and Faction System Tests", () => {
  let world1: World<CoreComponentRegistry>;
  let system: SteeringSystem<CoreComponentRegistry>;

  beforeEach(() => {
    world1 = new World<CoreComponentRegistry>();
    system = new SteeringSystem<CoreComponentRegistry>();
  });

  it("should correctly Seek a target entity dynamically via targetFaction", () => {
    // Steering entity
    const entity = world1.createEntity();
    world1.addComponent(entity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    world1.addComponent(entity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });
    world1.addComponent(entity, {
      type: "Steering",
      mode: "seek",
      targetFaction: "alliance",
      maxSpeed: 10,
      maxAcceleration: 5,
    });

    // Target entity with faction "alliance"
    const target = world1.createEntity();
    world1.addComponent(target, {
      type: "Transform",
      x: 10,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 10,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    world1.addComponent(target, {
      type: "Faction",
      value: "alliance",
    });

    // Run SteeringSystem update
    system.update(world1, 1);

    const v = world1.getComponent(entity, "Velocity")!;
    const steer = world1.getComponent(entity, "Steering")!;

    // Should have updated steering.targetEntity dynamically to the target entity ID
    expect(steer?.targetEntity).toBe(target);

    // Speed should be constrained by maxAcceleration and maxSpeed
    // Desired velocity is (10, 0) / 10 * 10 = (10, 0)
    // Force is (10, 0) - (0, 0) = (10, 0). Capped by maxAcceleration = 5 → force is (5, 0)
    // Velocity vx += 5 * 1 = 5
    expect(v.vx).toBeCloseTo(5);
    expect(v.vy).toBeCloseTo(0);
  });

  it("should Flee a target entity dynamically via targetFaction", () => {
    const entity = world1.createEntity();
    world1.addComponent(entity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    world1.addComponent(entity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });
    world1.addComponent(entity, {
      type: "Steering",
      mode: "flee",
      targetFaction: "horde",
      maxSpeed: 10,
      maxAcceleration: 4,
    });

    const target = world1.createEntity();
    world1.addComponent(target, {
      type: "Transform",
      x: 5,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 5,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    world1.addComponent(target, {
      type: "Faction",
      value: "horde",
    });

    system.update(world1, 1);

    const v = world1.getComponent(entity, "Velocity")!;
    // Desired: move away from target (0,0) -> target (5,0) => direction is (-1, 0)
    // Desired velocity vx is -10
    // Force is (-10, 0) - (0,0) = (-10, 0). Capped by maxAcceleration = 4 → force is (-4, 0)
    // Velocity vx += -4 * 1 = -4
    expect(v.vx).toBeCloseTo(-4);
  });

  it("should slow down smoothly with arrivalRadius on Seek mode", () => {
    const entity = world1.createEntity();
    world1.addComponent(entity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    world1.addComponent(entity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });
    world1.addComponent(entity, {
      type: "Steering",
      mode: "seek",
      targetFaction: "alliance",
      maxSpeed: 10,
      maxAcceleration: 100, // Large acceleration so force is not capped
      arrivalRadius: 5,
    });

    const target = world1.createEntity();
    world1.addComponent(target, {
      type: "Transform",
      x: 2, // Within arrival radius of 5
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 2,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    world1.addComponent(target, {
      type: "Faction",
      value: "alliance",
    });

    system.update(world1, 1);

    const v = world1.getComponent(entity, "Velocity")!;
    // Distance = 2. Inside arrival radius = 5.
    // Desired speed should be 10 * (2 / 5) = 4.
    // Since acceleration is huge, velocity instantly becomes 4.
    expect(v.vx).toBeCloseTo(4);
  });

  it("should not move if targetFaction exists but no alive entity has that faction", () => {
    const entity = world1.createEntity();
    world1.addComponent(entity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    world1.addComponent(entity, {
      type: "Velocity",
      vx: 5, // Starts moving
      vy: 5,
      angularVelocity: 0,
    });
    world1.addComponent(entity, {
      type: "Steering",
      mode: "seek",
      targetFaction: "alliance",
      maxSpeed: 10,
      maxAcceleration: 5,
    });

    // Run update with no target entity of faction "alliance"
    system.update(world1, 1);

    const v = world1.getComponent(entity, "Velocity")!;
    // Velocity should be reset to 0/0 and not crash
    expect(v.vx).toBe(0);
    expect(v.vy).toBe(0);
  });

  it("should resolve distance ties deterministically using lower Entity ID", () => {
    const entity = world1.createEntity();
    world1.addComponent(entity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    world1.addComponent(entity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });
    world1.addComponent(entity, {
      type: "Steering",
      mode: "seek",
      targetFaction: "alliance",
      maxSpeed: 10,
      maxAcceleration: 5,
    });

    // Two target entities at the exact same distance (5 units away, on different axes)
    // Target A (id should be smaller as it is created first)
    const targetA = world1.createEntity();
    world1.addComponent(targetA, {
      type: "Transform",
      x: 5,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 5,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    world1.addComponent(targetA, {
      type: "Faction",
      value: "alliance",
    });

    // Target B (id should be larger)
    const targetB = world1.createEntity();
    world1.addComponent(targetB, {
      type: "Transform",
      x: 0,
      y: 5,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 5,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    world1.addComponent(targetB, {
      type: "Faction",
      value: "alliance",
    });

    system.update(world1, 1);

    const steer = world1.getComponent(entity, "Steering")!;
    // Should choose targetA because it has a smaller entity ID
    expect(steer?.targetEntity).toBe(targetA);
  });

  it("should preserve trajectories deterministically across two independent runs", () => {
    const run = () => {
      const w = new World<CoreComponentRegistry>();
      const s = new SteeringSystem<CoreComponentRegistry>();

      const entity = w.createEntity();
      w.addComponent(entity, {
        type: "Transform",
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 0,
        worldY: 0,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true,
      });
      w.addComponent(entity, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0,
      });
      w.addComponent(entity, {
        type: "Steering",
        mode: "seek",
        targetFaction: "alliance",
        maxSpeed: 10,
        maxAcceleration: 2,
      });

      const target = w.createEntity();
      w.addComponent(target, {
        type: "Transform",
        x: 20,
        y: 20,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 20,
        worldY: 20,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true,
      });
      w.addComponent(target, {
        type: "Faction",
        value: "alliance",
      });

      const positions: { x: number; y: number }[] = [];
      const velocities: { vx: number; vy: number }[] = [];

      for (let i = 0; i < 10; i++) {
        s.update(w, 0.1);
        // Integrate physics manually for testing trajectory
        const v = w.getComponent(entity, "Velocity")!;
        w.mutateComponent(entity, "Transform", (trans) => {
          trans.x += v.vx * 0.1;
          trans.y += v.vy * 0.1;
        });
        const t = w.getComponent(entity, "Transform")!;
        positions.push({ x: t.x, y: t.y });
        velocities.push({ vx: v.vx, vy: v.vy });
      }

      return { positions, velocities };
    };

    const run1 = run();
    const run2 = run();

    expect(run1).toEqual(run2);
  });

  it("should support snapshot and restore mid-execution with exact trajectory preservation", () => {
    const w = new World<CoreComponentRegistry>();
    const s = new SteeringSystem<CoreComponentRegistry>();

    const entity = w.createEntity();
    w.addComponent(entity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    w.addComponent(entity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });
    w.addComponent(entity, {
      type: "Steering",
      mode: "seek",
      targetFaction: "alliance",
      maxSpeed: 10,
      maxAcceleration: 2,
    });

    const target = w.createEntity();
    w.addComponent(target, {
      type: "Transform",
      x: 20,
      y: 20,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 20,
      worldY: 20,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    w.addComponent(target, {
      type: "Faction",
      value: "alliance",
    });

    // Run first 5 steps
    for (let i = 0; i < 5; i++) {
      s.update(w, 0.1);
      const v = w.getComponent(entity, "Velocity")!;
      w.mutateComponent(entity, "Transform", (trans) => {
        trans.x += v.vx * 0.1;
        trans.y += v.vy * 0.1;
      });
    }

    // Snapshot at step 5
    const snapshot = w.snapshot();

    // Run remaining 5 steps on original world
    const originalPositions: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) {
      s.update(w, 0.1);
      const v = w.getComponent(entity, "Velocity")!;
      w.mutateComponent(entity, "Transform", (trans) => {
        trans.x += v.vx * 0.1;
        trans.y += v.vy * 0.1;
      });
      const t = w.getComponent(entity, "Transform")!;
      originalPositions.push({ x: t.x, y: t.y });
    }

    // Restore to new world
    const restoredWorld = new World<CoreComponentRegistry>();
    restoredWorld.restore(snapshot);

    // Run remaining 5 steps on restored world
    const restoredPositions: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) {
      s.update(restoredWorld, 0.1);
      const v = restoredWorld.getComponent(entity, "Velocity")!;
      restoredWorld.mutateComponent(entity, "Transform", (trans) => {
        trans.x += v.vx * 0.1;
        trans.y += v.vy * 0.1;
      });
      const t = restoredWorld.getComponent(entity, "Transform")!;
      restoredPositions.push({ x: t.x, y: t.y });
    }

    expect(restoredPositions).toEqual(originalPositions);
  });

  it("should run on a synthetic consumer representing custom game requirements without coupling", () => {
    // Custom registries mimicking another game entirely
    interface CustomGameComponents extends CoreComponentRegistry {
      SyntheticPowerup: { type: "SyntheticPowerup"; strength: number };
    }

    const customWorld = new World<CustomGameComponents>();
    const customSystem = new SteeringSystem<CustomGameComponents>();

    const dynamicMover = customWorld.createEntity();
    customWorld.addComponent(dynamicMover, {
      type: "Transform",
      x: 10,
      y: 10,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 10,
      worldY: 10,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    customWorld.addComponent(dynamicMover, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });
    customWorld.addComponent(dynamicMover, {
      type: "Steering",
      mode: "seek",
      targetFaction: "synthetic-enemy",
      maxSpeed: 20,
      maxAcceleration: 10,
    });

    const mockEnemy = customWorld.createEntity();
    customWorld.addComponent(mockEnemy, {
      type: "Transform",
      x: 50,
      y: 10,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 50,
      worldY: 10,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
    });
    customWorld.addComponent(mockEnemy, {
      type: "Faction",
      value: "synthetic-enemy",
    });

    // Verify it updates velocity cleanly on custom typed world
    customSystem.update(customWorld, 0.5);

    const v = customWorld.getComponent(dynamicMover, "Velocity")!;
    expect(v.vx).toBeGreaterThan(0);
    expect(v.vy).toBe(0); // Only movement on x-axis
  });
});
