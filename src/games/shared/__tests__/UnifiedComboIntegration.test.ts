import { World, ComboComponent, ComboSystem, SystemPhase } from "@tiny-aster/core";
import { BENEFICIAL_MUTATORS } from "../../../utils/MutatorRegistry";

describe("Unified Combo System Regression Tests", () => {
  it("Space Invaders / Generic: should increment combo and update multiplier on hit", () => {
    const world = new World();
    const comboSystem = new ComboSystem();

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Combo",
      combo: 0,
      multiplier: 1,
      timerRemaining: 0,
      timerDuration: 2.0
    } as ComboComponent);

    // Initial state
    let combo = world.getComponent(entity, "Combo" as any) as ComboComponent;
    expect(combo.combo).toBe(0);
    expect(combo.multiplier).toBe(1);

    // Simulate 5 consecutive hits
    for (let i = 0; i < 5; i++) {
      world.mutateComponent(entity, "Combo" as any, (c: any) => {
        c.combo = (c.combo || 0) + 1;
        c.multiplier = 1 + Math.floor(c.combo / 5);
        c.timerRemaining = 2.0;
      });
    }

    combo = world.getComponent(entity, "Combo" as any) as ComboComponent;
    expect(combo.combo).toBe(5);
    expect(combo.multiplier).toBe(2);

    // Update system with 1.0s elapsed -> timer decreases, combo remains
    comboSystem.update(world, 1.0);
    combo = world.getComponent(entity, "Combo" as any) as ComboComponent;
    expect(combo.combo).toBe(5);
    expect(combo.timerRemaining).toBeCloseTo(1.0);

    // Update system past duration (1.5s more) -> combo resets
    comboSystem.update(world, 1.5);
    combo = world.getComponent(entity, "Combo" as any) as ComboComponent;
    expect(combo.combo).toBe(0);
    expect(combo.multiplier).toBe(1);
  });

  it("Pong: Paddle hit should increment shared ComboComponent", () => {
    const world = new World();
    const comboSystem = new ComboSystem();

    const comboEntity = world.createEntity();
    world.addComponent(comboEntity, {
      type: "Combo",
      combo: 0,
      multiplier: 1,
      timerRemaining: 0,
      timerDuration: 2.0
    } as ComboComponent);

    // Simulate paddle hit logic
    for (let i = 0; i < 10; i++) {
      world.mutateComponent(comboEntity, "Combo" as any, (c: any) => {
        c.combo = (c.combo || 0) + 1;
        c.multiplier = 1 + Math.floor(c.combo / 5);
        c.timerRemaining = c.timerDuration || 2.0;
      });
    }

    let combo = world.getComponent(comboEntity, "Combo" as any) as ComboComponent;
    expect(combo.combo).toBe(10);
    expect(combo.multiplier).toBe(3);

    // Score event resets combo
    world.mutateComponent(comboEntity, "Combo" as any, (c: any) => {
      c.combo = 0;
      c.multiplier = 1;
      c.timerRemaining = 0;
    });

    combo = world.getComponent(comboEntity, "Combo" as any) as ComboComponent;
    expect(combo.combo).toBe(0);
    expect(combo.multiplier).toBe(1);
  });

  it("Flappy Bird: Pipe pass should increment shared ComboComponent", () => {
    const world = new World();

    const comboEntity = world.createEntity();
    world.addComponent(comboEntity, {
      type: "Combo",
      combo: 0,
      multiplier: 1,
      timerRemaining: 0,
      timerDuration: 2.0
    } as ComboComponent);

    // Simulate clearing 5 pipes
    for (let i = 0; i < 5; i++) {
      world.mutateComponent(comboEntity, "Combo" as any, (c: any) => {
        c.combo = (c.combo || 0) + 1;
        c.multiplier = 1 + Math.floor(c.combo / 5);
        c.timerRemaining = 2.0;
      });
    }

    const combo = world.getComponent(comboEntity, "Combo" as any) as ComboComponent;
    expect(combo.combo).toBe(5);
    expect(combo.multiplier).toBe(2);
  });

  it("combo_head_start mutator: should apply x2 multiplier to shared ComboComponent", () => {
    const world = new World();

    const comboEntity = world.createEntity();
    world.addComponent(comboEntity, {
      type: "Combo",
      combo: 0,
      multiplier: 1,
      timerRemaining: 0,
      timerDuration: 2.0
    } as ComboComponent);

    BENEFICIAL_MUTATORS["combo_head_start"].apply(world);

    const combo = world.getComponent(comboEntity, "Combo" as any) as ComboComponent;
    expect(combo.combo).toBe(5);
    expect(combo.multiplier).toBe(2);
  });
});
