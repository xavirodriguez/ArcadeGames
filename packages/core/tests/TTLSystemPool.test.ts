import {
  World,
  TTLSystem,
  PrefabPool,
  ProjectilePool,
  ComponentSetPool,
  CoreComponentRegistry
} from "../src";

describe("TTLSystem and Pool interactions", () => {
  let world: World<CoreComponentRegistry>;
  let ttlSystem: TTLSystem;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    ttlSystem = new TTLSystem();
    world.addSystem(ttlSystem);
  });

  it("should release expired particles back to the pool via TTLSystem", () => {
    // Setup a projectile pool
    const factory = () => ({
      position: { type: "Transform", x: 0, y: 0 } as any,
      velocity: { type: "Velocity", vx: 0, vy: 0 } as any,
      ttl: { type: "TTL", remaining: 1.0, timeLeft: 1.0 } as any,
      reclaimable: { type: "Reclaimable", poolId: "TestPool", poolName: "TestPool" } as any
    });

    const reset = (data: any) => {
      data.position.x = 0;
      data.position.y = 0;
    };

    const initializer = (components: any, params: any) => {
      components.position.x = params.x;
      components.position.y = params.y;
      components.ttl.remaining = params.ttl;
    };

    const pool = new PrefabPool({
      factory,
      reset,
      initializer,
      initialSize: 2
    });

    // Register pool as resource under the pool ID
    world.setResource("TestPool", pool);

    // Acquire an entity
    const entity = pool.acquire(world, { x: 10, y: 20, ttl: 0.5 });
    expect(world.hasComponent(entity, "TTL")).toBe(true);

    // Verify initial pool size
    const initialPoolSize = pool.size;

    // Tick the world by 0.2s (no expiration yet)
    world.update(0.2);
    world.flush();
    expect(world.hasComponent(entity, "TTL")).toBe(true);
    expect(pool.size).toBe(initialPoolSize);

    // Tick the world by 0.4s (expires entity as remaining goes to -0.1)
    world.update(0.4);
    world.flush();

    // The entity should be scheduled for removal, and released back to the pool
    expect(world.hasComponent(entity, "TTL")).toBe(false);
    expect(pool.size).toBe(initialPoolSize + 1);
  });

  it("should recycle component instances correctly", () => {
    const factory = () => ({
      position: { type: "Transform", x: 0, y: 0 } as any,
      ttl: { type: "TTL", remaining: 1.0, timeLeft: 1.0 } as any,
      reclaimable: { type: "Reclaimable", poolId: "TestPool2", poolName: "TestPool2" } as any
    });

    const reset = (data: any) => {
      data.position.x = -999;
    };

    const initializer = (components: any, params: any) => {
      components.position.x = params.x;
    };

    const pool = new PrefabPool({
      factory,
      reset,
      initializer,
      initialSize: 1
    });

    world.setResource("TestPool2", pool);

    const entity1 = pool.acquire(world, { x: 50 });

    // Release entity1 back to the pool
    pool.release(world, entity1);

    // Remove entity from world so its components are no longer active
    world.removeEntity(entity1);

    // Re-acquire - should reuse the components and initialize them correctly
    const entity2 = pool.acquire(world, { x: 100 });
    const pos2 = world.getComponent(entity2, "Transform") as any;

    expect(pos2.x).toBe(100);
  });

  it("should handle repeated calls to release gracefully", () => {
    const factory = () => ({
      position: { type: "Transform", x: 0, y: 0 } as any,
      ttl: { type: "TTL", remaining: 1.0, timeLeft: 1.0 } as any,
      reclaimable: { type: "Reclaimable", poolId: "TestPool3", poolName: "TestPool3" } as any
    });

    const pool = new PrefabPool({
      factory,
      reset: () => {},
      initializer: () => {},
      initialSize: 1
    });

    const entity = pool.acquire(world, {});
    const initialSize = pool.size;

    // Release once
    expect(() => pool.release(world, entity)).not.toThrow();
    expect(pool.size).toBe(initialSize + 1);

    // Remove entity from world so components are not found next time
    world.removeEntity(entity);

    // Release second time (should be safe and ignore/not increment size because components are already stripped from entity or missing)
    expect(() => pool.release(world, entity)).not.toThrow();
    expect(pool.size).toBe(initialSize + 1); // Remains same, did not double-add
  });

  it("should handle partially released or destroyed entities gracefully", () => {
    const factory = () => ({
      position: { type: "Transform", x: 0, y: 0 } as any,
      ttl: { type: "TTL", remaining: 1.0, timeLeft: 1.0 } as any,
      reclaimable: { type: "Reclaimable", poolId: "TestPool4", poolName: "TestPool4" } as any
    });

    const pool = new PrefabPool({
      factory,
      reset: () => {},
      initializer: () => {},
      initialSize: 1
    });

    const entity = pool.acquire(world, {});
    const initialSize = pool.size;

    // Manually remove one of the components from the world to simulate a partially destroyed entity
    world.removeComponent(entity, "Transform");

    // Releasing this entity should fail the "allFound" check in ComponentSetPool and NOT return components to the pool
    expect(() => pool.release(world, entity)).not.toThrow();
    expect(pool.size).toBe(initialSize); // Size did not increase
  });

  describe("Robustness, Swapped Arguments, and Double-Release Prevention", () => {
    it("should handle swapped arguments on release(entity, world) gracefully", () => {
      const factory = () => ({
        position: { type: "Transform", x: 0, y: 0 } as any,
        reclaimable: { type: "Reclaimable", poolId: "SwappedPool", poolName: "SwappedPool" } as any
      });
      const pool = new PrefabPool({
        factory,
        reset: () => {},
        initializer: () => {},
        initialSize: 1
      });
      world.setResource("SwappedPool", pool);
      const entity = pool.acquire(world, {});
      const initialSize = pool.size;

      // Call release with arguments swapped: release(entity, world)
      expect(() => pool.release(entity as any, world as any)).not.toThrow();
      expect(pool.size).toBe(initialSize + 1);
    });

    it("should throw a TypeError if release is called with only an Entity ID and no World instance", () => {
      const factory = () => ({
        position: { type: "Transform", x: 0, y: 0 } as any,
        reclaimable: { type: "Reclaimable", poolId: "SingleArgPool", poolName: "SingleArgPool" } as any
      });
      const pool = new PrefabPool({
        factory,
        reset: () => {},
        initializer: () => {},
        initialSize: 1
      });
      world.setResource("SingleArgPool", pool);
      const entity = pool.acquire(world, {});

      // Call release with only 1 argument: release(entity)
      expect(() => pool.release(entity as any, undefined as any)).toThrow(TypeError);
    });

    it("should prevent double-release in the same frame/state", () => {
      const factory = () => ({
        position: { type: "Transform", x: 0, y: 0 } as any,
        reclaimable: { type: "Reclaimable", poolId: "DoubleReleasePool", poolName: "DoubleReleasePool" } as any
      });
      const pool = new PrefabPool({
        factory,
        reset: () => {},
        initializer: () => {},
        initialSize: 1
      });
      world.setResource("DoubleReleasePool", pool);
      const entity = pool.acquire(world, {});
      const initialSize = pool.size;

      // First release
      pool.release(world, entity);
      expect(pool.size).toBe(initialSize + 1);

      // Second release immediately (should be ignored due to _released flag)
      pool.release(world, entity);
      expect(pool.size).toBe(initialSize + 1); // No increase!
    });

    it("should reset the _released flag on the reclaimable component when acquired again", () => {
      const factory = () => ({
        position: { type: "Transform", x: 0, y: 0 } as any,
        reclaimable: { type: "Reclaimable", poolId: "ReAcquirePool", poolName: "ReAcquirePool" } as any
      });
      const pool = new PrefabPool({
        factory,
        reset: () => {},
        initializer: () => {},
        initialSize: 1
      });
      world.setResource("ReAcquirePool", pool);
      const entity = pool.acquire(world, {});
      const initialSize = pool.size;

      // Release first time
      pool.release(world, entity);
      expect(pool.size).toBe(initialSize + 1);

      // Remove from world to completely recycle ID
      world.removeEntity(entity);

      // Re-acquire - should clear/delete _released flag so it can be released again
      const entity2 = pool.acquire(world, {});
      expect(pool.size).toBe(initialSize);

      // Release entity2
      pool.release(world, entity2);
      expect(pool.size).toBe(initialSize + 1); // Succeeds and increments again!
    });

    it("should process multiple expired entities and release them in a single tick update", () => {
      const factory = () => ({
        position: { type: "Transform", x: 0, y: 0 } as any,
        ttl: { type: "TTL", remaining: 0.1, timeLeft: 0.1 } as any,
        reclaimable: { type: "Reclaimable", poolId: "MultiPool", poolName: "ReAcquirePool" } as any
      });
      const pool = new PrefabPool<any, any>({
        factory,
        reset: () => {},
        initializer: (components, params: any) => {
          components.ttl.remaining = params.ttl;
        },
        initialSize: 2
      });
      world.setResource("MultiPool", pool);

      const entity1 = pool.acquire(world, { ttl: 0.05 });
      const entity2 = pool.acquire(world, { ttl: 0.05 });

      expect(world.hasComponent(entity1, "TTL")).toBe(true);
      expect(world.hasComponent(entity2, "TTL")).toBe(true);

      const initialSize = pool.size;

      // Update world by 0.1s to trigger expiration of both entities
      world.update(0.1);
      world.flush();

      expect(world.hasComponent(entity1, "TTL")).toBe(false);
      expect(world.hasComponent(entity2, "TTL")).toBe(false);
      expect(pool.size).toBe(initialSize + 2); // Both released back to the pool
    });
  });
});
