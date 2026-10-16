import { World, CoreComponentRegistry, TransformComponent, VelocityComponent, createEmitter } from "../src";

describe.each([
  ["MapStorage", false],
  ["SparseSetStorage", true]
])("ECS Core (UseSparseSetStorage = %s, flag = %s)", (_name, useSparseSet) => {
  function createWorld(): World<CoreComponentRegistry> {
    const world = new World<CoreComponentRegistry>();
    if (useSparseSet) {
      world.setResource("UseSparseSetStorage", true);
    }
    return world;
  }

  it("should create and manage entities and components", () => {
    const world = createWorld();
    const entity = world.createEntity();

    const transform: TransformComponent = {
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
    };

    world.addComponent(entity, transform);

    const retrievedTransform = world.getComponent(entity, "Transform");
    expect(retrievedTransform).toBeDefined();
    expect(retrievedTransform?.x).toBe(10);

    world.mutateComponent(entity, "Transform", (t) => {
      t.x = 30;
    });

    expect(world.getComponent(entity, "Transform")?.x).toBe(30);
  });

  it("should throw a TypeError when attempting to directly mutate a component returned by getComponent in DEV mode", () => {
    const world = createWorld();
    const entity = world.createEntity();

    const transform: TransformComponent = {
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
    };

    world.addComponent(entity, transform);

    const retrievedTransform = world.getComponent(entity, "Transform") as { x: number };
    expect(retrievedTransform).toBeDefined();

    expect(() => {
      retrievedTransform.x = 999;
    }).toThrow(TypeError);
  });

  it("should deep clone a nested object/array when mutating a frozen component", () => {
    interface NestedComponent {
      type: "Nested";
      data: { value: number; list: number[] };
    }
    const world = new World<CoreComponentRegistry & { Nested: NestedComponent }>();
    if (useSparseSet) {
      world.setResource("UseSparseSetStorage", true);
    }
    const entity = world.createEntity();

    const nested: NestedComponent = {
      type: "Nested",
      data: { value: 10, list: [1, 2, 3] }
    };

    world.addComponent(entity, nested);

    const retrieved = world.getComponent(entity, "Nested");
    expect(retrieved).toBeDefined();

    world.mutateComponent(entity, "Nested", (n) => {
      n.data.value = 42;
      n.data.list.push(4);
    });

    const mutated = world.getComponent(entity, "Nested");
    expect(mutated!.data.value).toBe(42);
    expect(mutated!.data.list).toEqual([1, 2, 3, 4]);

    expect(retrieved!.data.value).toBe(10);
    expect(retrieved!.data.list).toEqual([1, 2, 3]);
  });

  it("should execute queries correctly", () => {
    const world = createWorld();
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const t1: TransformComponent = { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
    const t2: TransformComponent = { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
    const v2: VelocityComponent = { type: "Velocity", vx: 1, vy: 1, angularVelocity: 0 };

    world.addComponent(entity1, t1);
    world.addComponent(entity2, t2);
    world.addComponent(entity2, v2);

    const query = world.query("Transform", "Velocity");
    expect(query.length).toBe(1);
    expect(query[0]).toBe(entity2);
  });

  it("should support readComponent with frozen results and checkUpdatingMutation safeguards", () => {
    const world = createWorld();
    const entity = world.createEntity();

    const t: TransformComponent = { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
    world.addComponent(entity, t);

    const readResult = world.readComponent(entity, "Transform") as { x: number };
    expect(readResult).toBeDefined();
    expect(() => {
      readResult.x = 123;
    }).toThrow(TypeError);

    world.isUpdating = true;
    expect(() => {
      world.createEntity();
    }).toThrow(/Direct structural mutation/);

    expect(() => {
      world.removeEntity(entity);
    }).toThrow(/Direct structural mutation/);

    expect(() => {
      const anotherTransform: TransformComponent = { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
      world.addComponent(entity, anotherTransform);
    }).toThrow(/Direct structural mutation/);

    expect(() => {
      world.removeComponent(entity, "Transform");
    }).toThrow(/Direct structural mutation/);

    world.isUpdating = false;
  });

  describe("createEmitter safe queuing during world update", () => {
    it("queues emitter creation during world update and does not throw exception", () => {
      const world = createWorld();
      world.isUpdating = true;

      let emitterEntity: number | undefined;
      expect(() => {
        emitterEntity = createEmitter(world, {
          type: "test_emitter",
          x: 100,
          y: 200,
          rate: 10,
          count: 1
        } as any);
      }).not.toThrow();

      expect(emitterEntity).toBeDefined();
      expect(world.hasEntity(emitterEntity!)).toBe(false);

      world.isUpdating = false;
    });

    it("creates the emitter after commands are flushed", () => {
      const world = createWorld();
      world.isUpdating = true;

      const emitterEntity = createEmitter(world, {
        type: "test_emitter",
        x: 100,
        y: 200,
        rate: 10,
        count: 1
      } as any);

      expect(world.hasEntity(emitterEntity)).toBe(false);

      world.isUpdating = false;
      world.flush();

      expect(world.hasEntity(emitterEntity)).toBe(true);
      const component = world.getComponent(emitterEntity, "ParticleEmitter");
      expect(component).toBeDefined();
      expect(component?.config.type).toBe("test_emitter");
    });

    it("does not mutate world structure directly from update", () => {
      const world = createWorld();
      const spyCreateEntity = jest.spyOn(world, "createEntity");

      world.isUpdating = true;

      createEmitter(world, {
        type: "test_emitter",
        x: 100,
        y: 200,
        rate: 10,
        count: 1
      } as any);

      expect(spyCreateEntity).not.toHaveBeenCalled();

      world.isUpdating = false;
      world.flush();

      spyCreateEntity.mockRestore();
    });

    it("should validate resource shapes in development mode", () => {
      const world = createWorld();

      world.setResource("ScreenConfig", { width: 800, height: 600 });
      expect(world.getResource("ScreenConfig")).toEqual({ width: 800, height: 600 });

      expect(() => {
        world.setResource("ScreenConfig", { width: "800", height: 600 } as never);
      }).toThrow(/ScreenConfig.*shape/);

      const validBus = { emit: () => {}, on: () => {} };
      world.setResource("EventBus", validBus);
      expect(world.getResource("EventBus")).toBe(validBus);

      expect(() => {
        world.setResource("EventBus", { emit: () => {} } as never);
      }).toThrow(/EventBus.*match/);

      world.setResource("SpatialCullingMargin", 150);
      expect(world.getResource("SpatialCullingMargin")).toBe(150);

      expect(() => {
        world.setResource("SpatialCullingMargin", "150" as never);
      }).toThrow(/SpatialCullingMargin.*must be/);

      world.setResource("UseSparseSetStorage", true);
      expect(world.getResource("UseSparseSetStorage")).toBe(true);

      expect(() => {
        world.setResource("UseSparseSetStorage", "true" as never);
      }).toThrow(/UseSparseSetStorage.*must be/);
    });
  });
});
