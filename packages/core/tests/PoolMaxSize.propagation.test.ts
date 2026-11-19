import { ComponentSetPool } from "../src/utils/ComponentSetPool";
import { PrefabPool } from "../src/utils/PrefabPool";

function makeFactory() {
  return () => ({
    transform: {
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
      dirty: true
    },
    reclaimable: { type: "Reclaimable", poolId: "t", poolName: "t" }
  });
}

describe("ComponentSetPool / PrefabPool maxSize propagation", () => {
  it("ComponentSetPool forwards maxSize to capacity", () => {
    const pool = new ComponentSetPool(makeFactory() as never, () => {}, 0, 4);
    expect(pool.capacity).toBe(4);
  });

  it("ComponentSetPool without maxSize has undefined capacity", () => {
    const pool = new ComponentSetPool(makeFactory() as never, () => {}, 0);
    expect(pool.capacity).toBeUndefined();
  });

  it("PrefabPool config.maxSize appears on capacity", () => {
    const pool = new PrefabPool({
      factory: makeFactory() as never,
      reset: () => {},
      initializer: () => {},
      initialSize: 0,
      maxSize: 8
    });
    expect(pool.capacity).toBe(8);
  });

  it("PrefabPool without maxSize has undefined capacity", () => {
    const pool = new PrefabPool({
      factory: makeFactory() as never,
      reset: () => {},
      initializer: () => {}
    });
    expect(pool.capacity).toBeUndefined();
  });

  it("PrefabPool clamps initialSize via underlying ObjectPool when maxSize is set", () => {
    const pool = new PrefabPool({
      factory: makeFactory() as never,
      reset: () => {},
      initializer: () => {},
      initialSize: 20,
      maxSize: 3
    });
    // CSP ctor releases one template into the pool after pre-warm (clamped to 3),
    // so idle size is at most maxSize.
    expect(pool.size).toBeLessThanOrEqual(3);
    expect(pool.capacity).toBe(3);
  });
});
