import {
  World,
  CoreComponentRegistry,
  PhysicsIntegrateSystem,
  BinaryCompression,
  SoAWorldSnapshot,
  AoSWorldSnapshot
} from "../src";

// Helper to reliably convert various serialized representations of arrays to standard JS number arrays
function getArray(entities: any): number[] {
  if (!entities) return [];
  if (typeof entities.length === "number") {
    return Array.from(entities) as number[];
  }
  // Handle plain objects representing index-value collections (e.g. { '0': 1 })
  return Object.keys(entities)
    .filter(k => !isNaN(Number(k)))
    .sort((a, b) => Number(a) - Number(b))
    .map(k => Number(entities[k]));
}

describe("Rollback & Resimulation Stability", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    world.addSystem(new PhysicsIntegrateSystem(), { phase: "Simulation" as any });
  });

  const setupWorldEntities = (w: World<CoreComponentRegistry>) => {
    // Entity 1: moving right
    const e1 = w.createEntity();
    w.addComponent(e1, {
      type: "Transform",
      x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 10, worldY: 20, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    });
    w.addComponent(e1, {
      type: "Velocity",
      vx: 100, vy: 0, angularVelocity: 0.5
    });

    // Entity 2: moving diagonally
    const e2 = w.createEntity();
    w.addComponent(e2, {
      type: "Transform",
      x: -50, y: 150, rotation: Math.PI / 4, scaleX: 2, scaleY: 2,
      worldX: -50, worldY: 150, worldRotation: Math.PI / 4, worldScaleX: 2, worldScaleY: 2,
      dirty: false
    });
    w.addComponent(e2, {
      type: "Velocity",
      vx: -50, vy: 200, angularVelocity: -0.1
    });

    // Entity 3: stationary
    const e3 = w.createEntity();
    w.addComponent(e3, {
      type: "Transform",
      x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    });
    w.addComponent(e3, {
      type: "Velocity",
      vx: 0, vy: 0, angularVelocity: 0
    });
  };

  it("should successfully execute rollback resimulation and produce identical outcomes on AoS snapshots", () => {
    setupWorldEntities(world);

    const N = 10;
    const M = 15;
    const dt = 1 / 60;

    // 1. Advance N ticks
    for (let i = 0; i < N; i++) {
      world.update(dt);
    }

    // 2. Snapshot at tick N (AoS)
    const snapshotN = world.snapshot();
    expect(snapshotN.isSoA).toBeFalsy();

    // 3. Advance M ticks
    for (let i = 0; i < M; i++) {
      world.update(dt);
    }

    const finalSnapshot_pass1 = world.snapshot();

    // 4. Restore to tick N
    world.restore(snapshotN);

    // 5. Advance M ticks again (Resimulation / Rollback phase)
    world.isReSimulating = true;
    for (let i = 0; i < M; i++) {
      world.update(dt);
    }
    world.isReSimulating = false;

    const finalSnapshot_pass2 = world.snapshot();

    // 6. Compare functional equivalence of pass 1 vs pass 2
    expect(finalSnapshot_pass1.entities).toEqual(finalSnapshot_pass2.entities);

    const data1 = (finalSnapshot_pass1 as AoSWorldSnapshot).componentData;
    const data2 = (finalSnapshot_pass2 as AoSWorldSnapshot).componentData;

    expect(Object.keys(data1).sort()).toEqual(Object.keys(data2).sort());

    for (const compType of Object.keys(data1)) {
      const entities1 = Object.keys(data1[compType]).sort();
      const entities2 = Object.keys(data2[compType]).sort();
      expect(entities1).toEqual(entities2);

      for (const entStr of entities1) {
        const ent = Number(entStr);
        const c1 = data1[compType][ent] as Record<string, any>;
        const c2 = data2[compType][ent] as Record<string, any>;

        // Ensure bit-perfect / high precision matches
        for (const prop of Object.keys(c1)) {
          if (typeof c1[prop] === "number") {
            expect(c1[prop]).toBeCloseTo(c2[prop], 10);
          } else {
            expect(c1[prop]).toEqual(c2[prop]);
          }
        }
      }
    }
  });

  it("should successfully execute rollback resimulation and produce identical outcomes on SoA snapshots", () => {
    world.setResource("UseSoASnapshots", true);
    setupWorldEntities(world);

    const N = 10;
    const M = 15;
    const dt = 1 / 60;

    // 1. Advance N ticks
    for (let i = 0; i < N; i++) {
      world.update(dt);
    }

    // 2. Snapshot at tick N (SoA)
    const snapshotN = world.snapshot();
    expect(snapshotN.isSoA).toBe(true);

    // 3. Advance M ticks
    for (let i = 0; i < M; i++) {
      world.update(dt);
    }

    const finalSnapshot_pass1 = world.snapshot();

    // 4. Restore to tick N
    world.restore(snapshotN);

    // 5. Advance M ticks again
    world.isReSimulating = true;
    for (let i = 0; i < M; i++) {
      world.update(dt);
    }
    world.isReSimulating = false;

    const finalSnapshot_pass2 = world.snapshot();

    // 6. Compare functional equivalence of pass 1 vs pass 2
    expect(finalSnapshot_pass1.entities).toEqual(finalSnapshot_pass2.entities);

    const data1 = (finalSnapshot_pass1 as SoAWorldSnapshot).soaComponentData!;
    const data2 = (finalSnapshot_pass2 as SoAWorldSnapshot).soaComponentData!;

    expect(Object.keys(data1).sort()).toEqual(Object.keys(data2).sort());

    for (const compType of Object.keys(data1)) {
      const soa1 = data1[compType];
      const soa2 = data2[compType];

      expect(getArray(soa1.entities)).toEqual(getArray(soa2.entities));

      // Compare values flat arrays
      const val1 = getArray(soa1.values);
      const val2 = getArray(soa2.values);
      expect(val1.length).toBe(val2.length);
      for (let i = 0; i < val1.length; i++) {
        expect(val1[i]).toBeCloseTo(val2[i], 10);
      }
    }
  });

  it("should preserve perfect determinism through Binary Compression roundtrip on SoA snapshots", () => {
    world.setResource("UseSoASnapshots", true);
    setupWorldEntities(world);

    // Simulate several ticks
    for (let i = 0; i < 20; i++) {
      world.update(1 / 60);
    }

    const snapshot = world.snapshot();
    expect(snapshot.isSoA).toBe(true);

    // Pack to binary representation
    const packed = BinaryCompression.pack(snapshot);
    expect(packed).toBeInstanceOf(Uint8Array);

    // Unpack from binary
    const unpacked = BinaryCompression.unpack(packed);
    expect(unpacked.isSoA).toBe(true);
    expect(unpacked.soaComponentData).toBeDefined();

    // Compare unpacked data to original snapshot
    const originalData = (snapshot as SoAWorldSnapshot).soaComponentData!;
    const unpackedData = unpacked.soaComponentData!;

    expect(Object.keys(originalData).sort()).toEqual(Object.keys(unpackedData).sort());

    for (const compType of Object.keys(originalData)) {
      const orig = originalData[compType];
      const unp = unpackedData[compType];

      expect(getArray(orig.entities)).toEqual(getArray(unp.entities));

      const vOrig = getArray(orig.values);
      const vUnp = getArray(unp.values);
      expect(vOrig.length).toBe(vUnp.length);
      for (let i = 0; i < vOrig.length; i++) {
        expect(vOrig[i]).toBeCloseTo(vUnp[i], 10);
      }
    }
  });
});
