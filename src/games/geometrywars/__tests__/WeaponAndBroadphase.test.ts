import { World, BroadPhase, ShapeType, CircleShape } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry } from "../types/GeometryWarsRegistry";

describe("Weapon and Broadphase Scale & Correctness Tests", () => {
  it("should verify BroadPhase Sweep and Prune produces identical results to $O(N^2)$ brute-force up to 1000 entities", () => {
    const world = new World<GeometryWarsComponentRegistry, GeometryWarsEventRegistry>();
    const entitiesCount = 1000;
    const entities: number[] = [];

    // Unlock RNG for coordinate generation in test setup
    world.gameplayRandom.unlock();
    const rng = world.gameplayRandom;

    for (let i = 0; i < entitiesCount; i++) {
      const entity = world.createEntity();
      entities.push(entity);

      // Generate random coordinates in an 800x600 arena
      const x = rng.nextRange(0, 800);
      const y = rng.nextRange(0, 600);
      const radius = rng.nextRange(5, 20);

      world.addComponent(entity, {
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
        dirty: true,
      });

      world.addComponent(entity, {
        type: "Collider",
        shape: { type: ShapeType.Circle, radius } as CircleShape,
        layer: 1,
        mask: 1,
        enabled: true,
        isTrigger: false,
      });
    }

    // 1. Calculate brute-force collision pairs
    const startBruteForce = Date.now();
    const bruteForcePairs: Array<[number, number]> = [];

    for (let i = 0; i < entitiesCount; i++) {
      const entA = entities[i];
      const tA = world.getComponent(entA, "Transform")!;
      const cA = world.getComponent(entA, "Collider")!;
      const boundsA = BroadPhase.getShapeBounds(tA, cA);

      for (let j = i + 1; j < entitiesCount; j++) {
        const entB = entities[j];
        const tB = world.getComponent(entB, "Transform")!;
        const cB = world.getComponent(entB, "Collider")!;
        const boundsB = BroadPhase.getShapeBounds(tB, cB);

        // Check if bounding boxes overlap
        if (
          boundsA.minX <= boundsB.maxX &&
          boundsB.minX <= boundsA.maxX &&
          boundsA.minY <= boundsB.maxY &&
          boundsB.minY <= boundsA.maxY
        ) {
          bruteForcePairs.push([entA, entB]);
        }
      }
    }
    const endBruteForce = Date.now();
    const bruteForceDuration = endBruteForce - startBruteForce;

    // 2. Calculate Sweep and Prune BroadPhase pairs
    const startSP = Date.now();
    const spPairs = BroadPhase.sweepAndPrune(entities, world as any);
    const endSP = Date.now();
    const spDuration = endSP - startSP;

    // Sort helper to compare both result lists
    const normalizePairs = (pairs: Array<[number, number]>) => {
      return pairs
        .map(([a, b]) => (a < b ? `${a},${b}` : `${b},${a}`))
        .sort();
    };

    const normBrute = normalizePairs(bruteForcePairs);
    const normSP = normalizePairs(spPairs as Array<[number, number]>);

    // Verify equivalency
    expect(normSP).toEqual(normBrute);

    // Document limits/benchmarks
    console.log(`[BroadPhase Benchmark] Successfully verified equivalency for ${entitiesCount} entities.`);
    console.log(`- Brute-force time: ${bruteForceDuration}ms (Found ${bruteForcePairs.length} overlapping pairs)`);
    console.log(`- Sweep and Prune time: ${spDuration}ms (Found ${spPairs.length} overlapping pairs)`);
    if (spDuration > 0) {
      console.log(`- Speedup factor: ${(bruteForceDuration / spDuration).toFixed(2)}x`);
    }
  });
});
