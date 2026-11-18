import { ObjectPool } from "../src/utils/ObjectPool";

describe("ObjectPool", () => {
  it("pre-warms initialSize instances", () => {
    let created = 0;
    const pool = new ObjectPool(
      () => {
        created += 1;
        return { id: created };
      },
      undefined,
      3
    );
    expect(pool.size).toBe(3);
    expect(created).toBe(3);
  });

  it("reuses released instances without growing when balanced", () => {
    let created = 0;
    const pool = new ObjectPool(() => ({ n: ++created }));
    const a = pool.acquire();
    const b = pool.acquire();
    expect(created).toBe(2);
    pool.release(a);
    pool.release(b);
    expect(pool.size).toBe(2);
    const c = pool.acquire();
    expect(created).toBe(2);
    expect(c).toBe(b);
  });

  it("calls reset on release", () => {
    const reset = jest.fn((obj: { v: number }) => {
      obj.v = 0;
    });
    const pool = new ObjectPool(() => ({ v: 1 }), reset);
    const obj = pool.acquire();
    obj.v = 99;
    pool.release(obj);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(obj.v).toBe(0);
  });

  it("does not grow idle pool beyond maxSize", () => {
    let created = 0;
    const pool = new ObjectPool(
      () => ({ id: ++created }),
      undefined,
      0,
      2
    );
    expect(pool.capacity).toBe(2);

    const items = [pool.acquire(), pool.acquire(), pool.acquire()];
    expect(created).toBe(3);

    for (const item of items) {
      pool.release(item);
    }
    // Only maxSize idle slots retained
    expect(pool.size).toBe(2);
  });

  it("clamps initialSize to maxSize when pre-warming", () => {
    let created = 0;
    const pool = new ObjectPool(
      () => ({ id: ++created }),
      undefined,
      10,
      3
    );
    expect(pool.size).toBe(3);
    expect(created).toBe(3);
  });

  it("treats maxSize 0 as no idle retention", () => {
    const pool = new ObjectPool(() => ({}), undefined, 0, 0);
    const a = pool.acquire();
    pool.release(a);
    expect(pool.size).toBe(0);
  });

  it("remains unbounded when maxSize is omitted", () => {
    const pool = new ObjectPool(() => ({}));
    expect(pool.capacity).toBeUndefined();
    for (let i = 0; i < 50; i++) {
      pool.release({});
    }
    expect(pool.size).toBe(50);
  });

  it("clear empties the idle pool", () => {
    const pool = new ObjectPool(() => ({}), undefined, 5, 10);
    expect(pool.size).toBe(5);
    pool.clear();
    expect(pool.size).toBe(0);
  });
});
