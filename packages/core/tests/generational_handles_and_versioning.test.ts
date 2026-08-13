import { World, CoreComponentRegistry, TransformComponent } from "../src";
import { unpackEntityIndex, unpackEntityGeneration } from "../src/ecs/Entity";

describe("Generational Handles and ECS Versioning Integration Tests", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
  });

  const createTransform = (): TransformComponent => ({
    type: "Transform",
    x: 10,
    y: 20,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldX: 10,
    worldY: 20,
    worldRotation: 0,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: false
  });

  describe("1. Integrity & Liveness Checks", () => {
    it("should prevent operations on destroyed entities and throw in development", () => {
      const a = world.createEntity();
      world.addComponent(a, createTransform());

      world.removeEntity(a);

      // It is not alive
      expect(world.isAlive(a)).toBe(false);

      // Attempting addComponent using the destroyed handle must throw
      expect(() => {
        world.addComponent(a, createTransform());
      }).toThrow(/Cannot add component.*entity is not alive/);

      // Attempting removeComponent using the destroyed handle must throw
      expect(() => {
        world.removeComponent(a, "Transform");
      }).toThrow(/Cannot remove component.*entity is not alive/);

      // Attempting mutateComponent using the destroyed handle must throw
      expect(() => {
        world.mutateComponent(a, "Transform", (t) => { t.x = 100; });
      }).toThrow(/Cannot mutate component.*entity is not alive/);

      // Attempting removeEntity using the destroyed handle must throw
      expect(() => {
        world.removeEntity(a);
      }).toThrow(/Cannot remove entity.*entity is not alive/);

      // Queries should simply return false/undefined safely
      expect(world.hasComponent(a, "Transform")).toBe(false);
      expect(world.getComponent(a, "Transform")).toBeUndefined();
      expect(world.getMutableComponent(a, "Transform")).toBeUndefined();
    });

    it("should ensure a recycled slot does not inherit components from the destroyed entity", () => {
      const a = world.createEntity();
      world.addComponent(a, createTransform());
      world.removeEntity(a);

      const b = world.createEntity();
      // Ensure they reused the same slot index
      expect(unpackEntityIndex(a)).toBe(unpackEntityIndex(b));
      // Ensure generations differ
      expect(unpackEntityGeneration(a)).not.toBe(unpackEntityGeneration(b));

      // Entity b should not have entity a's Transform component
      expect(world.hasComponent(b, "Transform")).toBe(false);
      expect(world.getComponent(b, "Transform")).toBeUndefined();
    });
  });

  describe("2. World Versioning System", () => {
    it("should increment versions consistently and precisely on each operation", () => {
      // Initially 0
      expect(world.stateVersion).toBe(0);
      expect(world.structureVersion).toBe(0);

      // createEntity: stateVersion +1, structureVersion +1
      const a = world.createEntity();
      expect(world.stateVersion).toBe(1);
      expect(world.structureVersion).toBe(1);

      // addComponent (new component): stateVersion +1, structureVersion +1
      world.addComponent(a, createTransform());
      expect(world.stateVersion).toBe(2);
      expect(world.structureVersion).toBe(2);

      // mutateComponent: stateVersion +1, structureVersion remains same
      world.mutateComponent(a, "Transform", (t) => {
        t.x = 99;
      });
      expect(world.stateVersion).toBe(3);
      expect(world.structureVersion).toBe(2);

      // removeComponent: stateVersion +1, structureVersion +1
      world.removeComponent(a, "Transform");
      expect(world.stateVersion).toBe(4);
      expect(world.structureVersion).toBe(3);

      // removeEntity: stateVersion +1, structureVersion +1
      world.removeEntity(a);
      expect(world.stateVersion).toBe(5);
      expect(world.structureVersion).toBe(4);
    });
  });

  describe("3. Generational Handles", () => {
    it("should handle generational checks correctly on slot reuse", () => {
      const a = world.createEntity();
      world.removeEntity(a);

      const b = world.createEntity();

      expect(unpackEntityIndex(a)).toBe(unpackEntityIndex(b));
      expect(unpackEntityGeneration(a)).toBe(1);
      expect(unpackEntityGeneration(b)).toBe(2);
      expect(a).not.toBe(b);

      expect(world.isAlive(a)).toBe(false);
      expect(world.isAlive(b)).toBe(true);

      // getComponent(a) should not act on b or return b's component
      world.addComponent(b, createTransform());
      expect(world.getComponent(a, "Transform")).toBeUndefined();
      expect(world.getComponent(b, "Transform")).toBeDefined();

      // addComponent(a) should fail and not affect b
      expect(() => {
        world.addComponent(a, createTransform());
      }).toThrow();

      // removeComponent(a) should fail and not affect b
      expect(() => {
        world.removeComponent(a, "Transform");
      }).toThrow();

      // removeEntity(a) should fail and not affect b
      expect(() => {
        world.removeEntity(a);
      }).toThrow();

      expect(world.isAlive(b)).toBe(true);
    });
  });

  describe("4. Command Buffer Safety", () => {
    it("should protect against obsolete commands modifying new entities on slot reuse", () => {
      const a = world.createEntity();
      // Schedule add component on a
      world.commands.addComponent(a, createTransform());

      // Immediately remove a before flush
      world.removeEntity(a);

      // Create b which reuses the same slot with an incremented generation
      const b = world.createEntity();
      expect(unpackEntityIndex(a)).toBe(unpackEntityIndex(b));
      expect(unpackEntityGeneration(a)).toBe(1);
      expect(unpackEntityGeneration(b)).toBe(2);

      // Flush commands
      // Since 'a' is dead, the scheduled addComponent command targeting 'a' must be ignored in production
      // or throw in development (which we catch or handle).
      // Since Jest runs with DEV mode enabled, it will throw. Let's make sure it throws safely
      // and we verify it does not touch B!
      expect(() => {
        world.commands.flush(world);
      }).toThrow(/Cannot add component/);

      // Ensure b is NOT modified
      expect(world.hasComponent(b, "Transform")).toBe(false);
    });
  });

  describe("5. Snapshot & Rollback Timeline Safety", () => {
    it("should safely restore liveness and generational states on rollback", () => {
      // 1. Create a (generation 1)
      const a = world.createEntity();
      expect(unpackEntityGeneration(a)).toBe(1);

      // 2. Take a snapshot
      const snapshot = world.snapshot();

      // 3. Destroy a (generation of slot 1 will be set to 2)
      world.removeEntity(a);
      expect(world.isAlive(a)).toBe(false);

      // 4. Create b (which reuses slot 1 with generation 2)
      const b = world.createEntity();
      expect(unpackEntityIndex(a)).toBe(unpackEntityIndex(b));
      expect(unpackEntityGeneration(b)).toBe(2);
      expect(world.isAlive(b)).toBe(true);

      // 5. Restore snapshot (rollback to time when a was alive and b did not exist)
      world.restore(snapshot);

      // 6. Verify timeline consistency
      // a should be alive again
      expect(world.isAlive(a)).toBe(true);
      // b should NOT be alive anymore
      expect(world.isAlive(b)).toBe(false);

      // If we now create a new entity, it should have the correct next generation
      // Wait, since we rolled back to the state where a was alive, slot 1 is occupied by a (generation 1).
      // Next entity created should be slot 2 (generation 1).
      const c = world.createEntity();
      expect(unpackEntityIndex(c)).toBe(2);
      expect(unpackEntityGeneration(c)).toBe(1);
    });
  });
});
