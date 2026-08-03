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
    pool.release({ world, entity: entity1 });

    // Remove entity from world so its components are no longer active
    world.removeEntity(entity1);

    // Re-acquire - should reuse the components and initialize them correctly
    const entity2 = pool.acquire(world, { x: 100 });
    const pos2 = world.getComponent(entity2, "Transform") as any;

    expect(pos2.x).toBe(100);
  });

  it("throws on double release in development", () => {
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
    expect(() => pool.release({ world, entity })).not.toThrow();
    expect(pool.size).toBe(initialSize + 1);

    // Release second time (should throw double release error in dev/test)
    expect(() => {
      pool.release({ world, entity });
    }).toThrow(/double release/i);
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
    expect(() => pool.release({ world, entity })).not.toThrow();
    expect(pool.size).toBe(initialSize); // Size did not increase
  });

  it("releases an entity using a named context", () => {
    const factory = () => ({
      position: { type: "Transform", x: 0, y: 0 } as any,
      ttl: { type: "TTL", remaining: 1.0, timeLeft: 1.0 } as any,
      reclaimable: { type: "Reclaimable", poolId: "TestPoolContext", poolName: "TestPoolContext" } as any
    });

    const pool = new PrefabPool({
      factory,
      reset: () => {},
      initializer: () => {},
      initialSize: 1
    });

    const entity = pool.acquire(world, {});
    expect(world.hasEntity(entity)).toBe(true);

    pool.release({ world, entity });

    // Removing the entity via commands or removing it manually to check
    world.getCommandBuffer().removeEntity(entity);
    world.flush();
    expect(world.hasEntity(entity)).toBe(false);
  });

  it("passes the correct world and entity to onReclaim", () => {
    const onReclaimMock = jest.fn();
    const factory = () => ({
      position: { type: "Transform", x: 0, y: 0 } as any,
      ttl: { type: "TTL", remaining: 1.0, timeLeft: 1.0 } as any,
      reclaimable: {
        type: "Reclaimable",
        poolId: "TestPoolReclaim",
        poolName: "TestPoolReclaim",
        onReclaim: onReclaimMock
      } as any
    });

    const pool = new PrefabPool({
      factory,
      reset: () => {},
      initializer: () => {},
      initialSize: 1
    });

    world.setResource("TestPoolReclaim", pool);

    const entity = pool.acquire(world, {});

    // Wire up custom mock onReclaim on the acquired component
    const reclaimable = world.getMutableComponent(entity, "Reclaimable") as any;
    reclaimable.onReclaim = onReclaimMock;

    // Tick the world by 1.1s so it expires
    world.update(1.1);
    world.flush();

    expect(onReclaimMock).toHaveBeenCalledWith({
      world,
      entity,
    });
  });

  it("returns an expired Space Invaders projectile to its pool", () => {
    const factory = () => ({
      position: { type: "Transform", x: 0, y: 0 } as any,
      ttl: { type: "TTL", remaining: 1.0, timeLeft: 1.0 } as any,
      reclaimable: { type: "Reclaimable", poolId: "playerBulletPool", poolName: "playerBulletPool" } as any
    });

    const mockPool = {
      release: jest.fn()
    };

    world.setResource("playerBulletPool", mockPool as any);

    const pool = new PrefabPool({
      factory,
      reset: () => {},
      initializer: () => {},
      initialSize: 1
    });

    const entity = pool.acquire(world, {});

    // Clear onReclaim so TTLSystem is forced to fall back to the resource poolId lookup
    const reclaimable = world.getMutableComponent(entity, "Reclaimable") as any;
    reclaimable.onReclaim = undefined;

    // Tick the world by 1.1s so it expires
    world.update(1.1);
    world.flush();

    expect(mockPool.release).toHaveBeenCalledWith({
      world,
      entity,
    });
  });

  it("fails descriptively when the referenced pool is not registered", () => {
    const factory = () => ({
      position: { type: "Transform", x: 0, y: 0 } as any,
      ttl: { type: "TTL", remaining: 1.0, timeLeft: 1.0 } as any,
      reclaimable: { type: "Reclaimable", poolId: "NonExistentPool", poolName: "NonExistentPool" } as any
    });

    const pool = new PrefabPool({
      factory,
      reset: () => {},
      initializer: () => {},
      initialSize: 1
    });

    const entity = pool.acquire(world, {});

    // Clear onReclaim so TTLSystem is forced to fall back to the resource poolId lookup
    const reclaimable = world.getMutableComponent(entity, "Reclaimable") as any;
    reclaimable.onReclaim = undefined;

    // Tick the world by 1.1s so it expires. It should throw an error in dev/test environment.
    expect(() => {
      world.update(1.1);
      world.flush();
    }).toThrow(/unregistered pool/i);
  });

  it("rejects entities not owned by the pool", () => {
    const factory = () => ({
      position: { type: "Transform", x: 0, y: 0 } as any,
      ttl: { type: "TTL", remaining: 1.0, timeLeft: 1.0 } as any,
      reclaimable: { type: "Reclaimable", poolId: "TestPoolForeign", poolName: "TestPoolReclaim" } as any
    });

    const pool = new PrefabPool({
      factory,
      reset: () => {},
      initializer: () => {},
      initialSize: 1
    });

    const foreignEntity = 9999; // Not owned/acquired by pool
    expect(() => {
      pool.release({ world, entity: foreignEntity });
    }).toThrow(/foreign entity/i);
  });
});
