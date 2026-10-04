import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { CollisionSystem2D } from "../src/physics/collision/CollisionSystems";
import { ShapeType } from "../src/physics/shapes/Shapes";
import { Entity } from "../src/ecs/Entity";

describe("Trigger Characterization and Rollback Tests", () => {
  let world: World<CoreComponentRegistry>;
  let collisionSystem: CollisionSystem2D;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    collisionSystem = new CollisionSystem2D();
    world.addSystem(collisionSystem);
  });

  afterEach(() => {
    collisionSystem.dispose();
  });

  function spawnTriggerEntity(x: number, y: number, radius = 20): Entity {
    const e = world.createEntity();
    world.addComponent(e, {
      type: "Transform",
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: x,
      worldY: y,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(e, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius },
      layer: 1,
      mask: 0xffff,
      enabled: true,
      isTrigger: true,
    });
    world.addComponent(e, {
      type: "CollisionEvents",
      collisions: [],
      triggersEntered: [],
      triggersExited: [],
      activeTriggers: [],
    });
    return e;
  }

  function spawnSolidEntity(x: number, y: number, radius = 5): Entity {
    const e = world.createEntity();
    world.addComponent(e, {
      type: "Transform",
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: x,
      worldY: y,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(e, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius },
      layer: 1,
      mask: 0xffff,
      enabled: true,
      isTrigger: false,
    });
    world.addComponent(e, {
      type: "CollisionEvents",
      collisions: [],
      triggersEntered: [],
      triggersExited: [],
      activeTriggers: [],
    });
    return e;
  }

  it("should fire enter on overlap and exit on separation", () => {
    const trigger = spawnTriggerEntity(100, 100, 20);
    const actor = spawnSolidEntity(100, 100, 5); // Overlapping

    let enteredA: Entity | null = null;
    let enteredB: Entity | null = null;
    let exitedA: Entity | null = null;
    let exitedB: Entity | null = null;

    collisionSystem.onTriggerEnter((_w, a, b) => {
      enteredA = a;
      enteredB = b;
    });

    collisionSystem.onTriggerExit((_w, a, b) => {
      exitedA = a;
      exitedB = b;
    });

    // Frame 1: enter
    collisionSystem.update(world, 0.016);

    expect(enteredA).toBe(trigger);
    expect(enteredB).toBe(actor);

    let triggerEvents = world.getComponent(trigger, "CollisionEvents")!;
    expect(triggerEvents.triggersEntered).toContain(actor);
    expect(triggerEvents.activeTriggers).toContain(actor);

    // Frame 2: stay inside -> no new enter/exit, activeTriggers persists
    collisionSystem.update(world, 0.016);
    triggerEvents = world.getComponent(trigger, "CollisionEvents")!;
    expect(triggerEvents.triggersEntered.length).toBe(0);
    expect(triggerEvents.activeTriggers).toContain(actor);

    // Frame 3: Move actor away to (200, 200) -> exit
    const actorTrans = world.getMutableComponent(actor, "Transform")!;
    actorTrans.x = 200;
    actorTrans.y = 200;
    actorTrans.worldX = 200;
    actorTrans.worldY = 200;

    collisionSystem.update(world, 0.016);

    triggerEvents = world.getComponent(trigger, "CollisionEvents")!;
    expect(exitedA).not.toBeNull();
    expect(triggerEvents.triggersExited).toContain(actor);
    expect(triggerEvents.activeTriggers).not.toContain(actor);
  });

  it("should handle entities spawned already overlapping", () => {
    const trigger = spawnTriggerEntity(0, 0, 50);
    const actor = spawnSolidEntity(10, 10, 5);

    collisionSystem.update(world, 0.016);

    const triggerEvents = world.getComponent(trigger, "CollisionEvents")!;
    expect(triggerEvents.triggersEntered).toContain(actor);
    expect(triggerEvents.activeTriggers).toContain(actor);
  });

  it("should clean up trigger tracking when an overlapping entity is destroyed", () => {
    const trigger = spawnTriggerEntity(0, 0, 50);
    const actor = spawnSolidEntity(10, 10, 5);

    collisionSystem.update(world, 0.016);

    // Destroy actor entity
    world.removeEntity(actor);

    // Next update
    collisionSystem.update(world, 0.016);

    const triggerEvents = world.getComponent(trigger, "CollisionEvents")!;
    expect(triggerEvents.activeTriggers).not.toContain(actor);
  });

  it("should remain consistent after world snapshot serialization and restoration", () => {
    const trigger = spawnTriggerEntity(0, 0, 50);
    const actor = spawnSolidEntity(10, 10, 5);

    // Frame 1: enter trigger
    collisionSystem.update(world, 0.016);

    // Save world snapshot
    const snapshot = world.snapshot();

    // Frame 2: move actor away
    const actorTrans = world.getMutableComponent(actor, "Transform")!;
    actorTrans.x = 200;
    actorTrans.y = 200;
    actorTrans.worldX = 200;
    actorTrans.worldY = 200;
    collisionSystem.update(world, 0.016);

    // Restore snapshot (actor back at (10, 10))
    world.restore(snapshot);

    // Verify trigger activeTriggers component was restored
    const restoredEvents = world.getComponent(trigger, "CollisionEvents")!;
    expect(restoredEvents?.activeTriggers).toContain(actor);

    // Frame 3 post-restore: update collision system while still overlapping
    collisionSystem.update(world, 0.016);

    // Should NOT re-fire triggerEnter if state is properly synchronized
    const eventsPostRestore = world.getComponent(trigger, "CollisionEvents")!;
    expect(eventsPostRestore.triggersEntered.length).toBe(0);
    expect(eventsPostRestore.activeTriggers).toContain(actor);
  });
});
