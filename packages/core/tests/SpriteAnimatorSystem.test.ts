import {
  World,
  SpriteAnimatorSystem,
  createSpriteAnimator,
  EventBus,
  type SpriteSheetDefinition,
  type CoreComponentRegistry
} from "../src";

const TEST_SHEET: SpriteSheetDefinition = {
  id: "test_runner",
  assetPath: "assets/runner.png",
  imageSource: null,
  frameWidth: 32,
  frameHeight: 32,
  animations: {
    run: {
      name: "run",
      frames: [
        { x: 0, y: 0, w: 32, h: 32 },
        { x: 32, y: 0, w: 32, h: 32 },
        { x: 64, y: 0, w: 32, h: 32 }
      ],
      frameDuration: 0.1,
      loop: true
    },
    die: {
      name: "die",
      frames: [
        { x: 0, y: 32, w: 32, h: 32 },
        { x: 32, y: 32, w: 32, h: 32 }
      ],
      frameDuration: 0.1,
      loop: false
    }
  }
};

describe("SpriteAnimatorSystem", () => {
  it("advances looping animation across multiple entities using custom lookup", () => {
    const world = new World<CoreComponentRegistry>();
    const system = new SpriteAnimatorSystem((id) => (id === TEST_SHEET.id ? TEST_SHEET : undefined));
    world.addSystem(system);

    const entityA = world.createEntity();
    world.addComponent(entityA, createSpriteAnimator(TEST_SHEET.id, "run"));

    const entityB = world.createEntity();
    world.addComponent(entityB, createSpriteAnimator(TEST_SHEET.id, "run"));

    world.update(0.15);

    const animA = world.getComponent(entityA, "SpriteAnimator");
    const animB = world.getComponent(entityB, "SpriteAnimator");

    expect(animA?.frameIndex).toBe(1);
    expect(animA?.timer).toBeCloseTo(0.05, 5);
    expect(animB?.frameIndex).toBe(1);
    expect(animB?.timer).toBeCloseTo(0.05, 5);

    // Multi-frame catch-up: dt = 0.2, (0.05 + 0.2) = 0.25 -> 2 frame steps. (1 + 2) % 3 = 0
    world.update(0.2);
    const updatedA = world.getComponent(entityA, "SpriteAnimator");
    expect(updatedA?.frameIndex).toBe(0);
    expect(updatedA?.timer).toBeCloseTo(0.05, 5);
  });

  it("handles one-shot clips and emits animation:completed event", () => {
    const world = new World<CoreComponentRegistry>();
    const bus = new EventBus();
    world.setResource("EventBus", bus);

    let eventPayload: unknown = null;
    bus.on("animation:completed", (data) => {
      eventPayload = data;
    });

    const system = new SpriteAnimatorSystem((id) => (id === TEST_SHEET.id ? TEST_SHEET : undefined));
    world.addSystem(system);

    const entity = world.createEntity();
    world.addComponent(entity, createSpriteAnimator(TEST_SHEET.id, "die"));

    world.update(0.25);

    const anim = world.getComponent(entity, "SpriteAnimator");
    expect(anim?.finished).toBe(true);
    expect(anim?.frameIndex).toBe(1);
    expect(eventPayload).toEqual({
      entity,
      sheetId: TEST_SHEET.id,
      animation: "die"
    });

    // Further updates do not advance finished one-shot clip
    world.update(0.5);
    const afterAnim = world.getComponent(entity, "SpriteAnimator");
    expect(afterAnim?.finished).toBe(true);
    expect(afterAnim?.frameIndex).toBe(1);
  });

  it("resolves definitions from SpriteRegistry world resource if no lookup provided", () => {
    const world = new World<CoreComponentRegistry>();
    world.setResource("SpriteRegistry", {
      get: (id: string) => (id === TEST_SHEET.id ? TEST_SHEET : undefined)
    });

    world.addSystem(new SpriteAnimatorSystem());

    const entity = world.createEntity();
    world.addComponent(entity, createSpriteAnimator(TEST_SHEET.id, "run"));

    world.update(0.15);
    const anim = world.getComponent(entity, "SpriteAnimator");
    expect(anim?.frameIndex).toBe(1);
  });

  it("does not advance on invalid or non-positive dt", () => {
    const world = new World<CoreComponentRegistry>();
    const system = new SpriteAnimatorSystem((id) => (id === TEST_SHEET.id ? TEST_SHEET : undefined));
    world.addSystem(system);

    const entity = world.createEntity();
    world.addComponent(entity, createSpriteAnimator(TEST_SHEET.id, "run"));

    world.update(0);
    expect(world.getComponent(entity, "SpriteAnimator")?.timer).toBe(0);

    world.update(-0.1);
    expect(world.getComponent(entity, "SpriteAnimator")?.timer).toBe(0);

    world.update(Number.NaN);
    expect(world.getComponent(entity, "SpriteAnimator")?.timer).toBe(0);
  });
});
