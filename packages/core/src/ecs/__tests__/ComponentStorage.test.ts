import { MapStorage } from "../storage/MapStorage";
import { SparseSetStorage } from "../storage/SparseSetStorage";
import { ComponentStorage } from "../storage/ComponentStorage";
import { packEntity } from "../Entity";

describe("ComponentStorage implementation: MapStorage", () => {
  let storage: ComponentStorage<string>;

  beforeEach(() => {
    storage = new MapStorage<string>();
  });

  it("should perform basic CRUD operations correctly", () => {
    const e1 = packEntity(1, 1);
    const e2 = packEntity(2, 1);

    expect(storage.has(e1)).toBe(false);
    expect(storage.get(e1)).toBeUndefined();

    storage.set(e1, "pos1");
    storage.set(e2, "pos2");

    expect(storage.has(e1)).toBe(true);
    expect(storage.get(e1)).toBe("pos1");
    expect(storage.get(e2)).toBe("pos2");
    expect(storage.size).toBe(2);

    expect(storage.delete(e1)).toBe(true);
    expect(storage.has(e1)).toBe(false);
    expect(storage.get(e1)).toBeUndefined();
    expect(storage.size).toBe(1);
  });

  it("should handle clearing storage", () => {
    const e1 = packEntity(1, 1);
    storage.set(e1, "data");
    expect(storage.size).toBe(1);

    storage.clear();
    expect(storage.size).toBe(0);
    expect(storage.get(e1)).toBeUndefined();
    expect(Array.from(storage.entities())).toEqual([]);
  });
});

describe("ComponentStorage implementation: SparseSetStorage", () => {
  let storage: SparseSetStorage<string>;

  beforeEach(() => {
    storage = new SparseSetStorage<string>();
  });

  it("should perform basic CRUD operations correctly", () => {
    const e1 = packEntity(1, 1);
    const e2 = packEntity(2, 1);

    expect(storage.has(e1)).toBe(false);
    expect(storage.get(e1)).toBeUndefined();

    storage.set(e1, "pos1");
    storage.set(e2, "pos2");

    expect(storage.has(e1)).toBe(true);
    expect(storage.get(e1)).toBe("pos1");
    expect(storage.get(e2)).toBe("pos2");
    expect(storage.size).toBe(2);

    expect(storage.delete(e1)).toBe(true);
    expect(storage.has(e1)).toBe(false);
    expect(storage.get(e1)).toBeUndefined();
    expect(storage.size).toBe(1);
  });

  it("should validate entity generation in SparseSetStorage", () => {
    const e1_gen1 = packEntity(5, 1);
    const e1_gen2 = packEntity(5, 2);

    storage.set(e1_gen1, "gen1_data");
    expect(storage.get(e1_gen1)).toBe("gen1_data");

    // Entity with same slot index but different generation should NOT retrieve gen1_data
    expect(storage.get(e1_gen2)).toBeUndefined();
    expect(storage.has(e1_gen2)).toBe(false);
  });

  it("should maintain deterministic sorted iteration order by Entity ID regardless of insertion order", () => {
    const e3 = packEntity(3, 1);
    const e1 = packEntity(1, 1);
    const e2 = packEntity(2, 1);

    storage.set(e3, "three");
    storage.set(e1, "one");
    storage.set(e2, "two");

    const entityList = Array.from(storage.entities());
    const valueList = Array.from(storage.values());

    expect(entityList).toEqual([e1, e2, e3]);
    expect(valueList).toEqual(["one", "two", "three"]);
  });

  it("should handle clearing storage", () => {
    const e1 = packEntity(1, 1);
    storage.set(e1, "data");
    expect(storage.size).toBe(1);

    storage.clear();
    expect(storage.size).toBe(0);
    expect(storage.get(e1)).toBeUndefined();
    expect(Array.from(storage.entities())).toEqual([]);
  });
});
