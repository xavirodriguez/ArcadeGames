import { World, System, SystemPhase, GameplayFreeze } from "../src";

interface TestRegistry {
  Position: { type: "Position"; x: number; y: number };
  Velocity: { type: "Velocity"; vx: number; vy: number };
  TTL: { type: "TTL"; remaining: number };
}

class TestInputSystem extends System<any> {
  public updated = 0;
  update(world: World<any>, deltaTime: number): void {
    this.updated++;
  }
}

class TestMovementSystem extends System<any> {
  public updated = 0;
  update(world: World<any>, deltaTime: number): void {
    this.updated++;
  }
}

class TestCollisionSystem extends System<any> {
  public updated = 0;
  update(world: World<any>, deltaTime: number): void {
    this.updated++;
  }
}

class TestRulesSystem extends System<any> {
  public updated = 0;
  update(world: World<any>, deltaTime: number): void {
    this.updated++;
  }
}

class TestPresentationSystem extends System<any> {
  public updated = 0;
  update(world: World<any>, deltaTime: number): void {
    this.updated++;
  }
}

class TTLSystem extends System<any> {
  public updated = 0;
  update(world: World<any>, deltaTime: number): void {
    this.updated++;
  }
}

class JuiceSystem extends System<any> {
  public updated = 0;
  update(world: World<any>, deltaTime: number): void {
    this.updated++;
  }
}

describe("GameplayFreeze (Soft Pause) System Tests", () => {
  let world: World<any>;
  let inputSys: TestInputSystem;
  let movementSys: TestMovementSystem;
  let collisionSys: TestCollisionSystem;
  let rulesSys: TestRulesSystem;
  let presentationSys: TestPresentationSystem;
  let ttlSys: TTLSystem;
  let juiceSys: JuiceSystem;

  beforeEach(() => {
    world = new World<any>();
    inputSys = new TestInputSystem();
    movementSys = new TestMovementSystem();
    collisionSys = new TestCollisionSystem();
    rulesSys = new TestRulesSystem();
    presentationSys = new TestPresentationSystem();
    ttlSys = new TTLSystem();
    juiceSys = new JuiceSystem();

    world.addSystem(inputSys, { phase: SystemPhase.Input });
    world.addSystem(movementSys, { phase: SystemPhase.Simulation });
    world.addSystem(ttlSys, { phase: SystemPhase.Simulation });
    world.addSystem(juiceSys, { phase: SystemPhase.Simulation });
    world.addSystem(collisionSys, { phase: SystemPhase.Collision });
    world.addSystem(rulesSys, { phase: SystemPhase.GameRules });
    world.addSystem(presentationSys, { phase: SystemPhase.Presentation });
  });

  it("should run all systems normally when not frozen", () => {
    world.update(0.1);

    expect(inputSys.updated).toBe(1);
    expect(movementSys.updated).toBe(1);
    expect(ttlSys.updated).toBe(1);
    expect(juiceSys.updated).toBe(1);
    expect(collisionSys.updated).toBe(1);
    expect(rulesSys.updated).toBe(1);
    expect(presentationSys.updated).toBe(1);
  });

  it("should skip simulation/gameplay systems but execute TTL, Juice, and Presentation systems when frozen", () => {
    world.setResource("GameplayFreeze", {} as GameplayFreeze);
    world.update(0.1);

    expect(inputSys.updated).toBe(0);
    expect(movementSys.updated).toBe(0);
    expect(collisionSys.updated).toBe(0);
    expect(rulesSys.updated).toBe(0);

    // Presentation runs normally
    expect(presentationSys.updated).toBe(1);

    // TTL and Juice in Simulation run normally
    expect(ttlSys.updated).toBe(1);
    expect(juiceSys.updated).toBe(1);
  });

  it("should decrement freeze duration and automatically unfreeze when duration reaches 0", () => {
    world.setResource("GameplayFreeze", { remaining: 0.25 } as GameplayFreeze);

    // First update: 0.1s passes. Still frozen.
    world.update(0.1);
    expect(world.getResource("GameplayFreeze") !== undefined).toBe(true);
    expect(world.getResource<GameplayFreeze>("GameplayFreeze")?.remaining).toBeCloseTo(0.15, 5);
    expect(movementSys.updated).toBe(0);
    expect(presentationSys.updated).toBe(1);

    // Second update: 0.15s passes. Reaches exactly 0, unfreezes.
    world.update(0.15);
    expect(world.getResource("GameplayFreeze") !== undefined).toBe(false);

    // Since the freeze was cleared *during* this tick when its remaining reached 0,
    // wait, our Schedule updates freeze duration first, and if it becomes <= 0, deletes the resource,
    // so during this second tick, `isFrozen` will be false! Let's check:
    // If freeze is deleted, the systems in the second tick will run!
    expect(movementSys.updated).toBe(1);
    expect(presentationSys.updated).toBe(2);
  });
});
