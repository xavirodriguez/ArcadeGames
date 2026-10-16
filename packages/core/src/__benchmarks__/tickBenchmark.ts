import { World } from "../ecs/World";
import { CollisionSystem2D } from "../physics/collision/CollisionSystems";
import { SnapshotSerializer } from "../snapshots/SnapshotSerializer";
import { SnapshotSerializerSoA } from "../snapshots/SnapshotSerializerSoA";
import { ShapeType, CircleShape } from "../physics/shapes/Shapes";

export interface BenchmarkMetrics {
  storageMode: string;
  entityCount: number;
  msPerTick: number;
  snapshotAoSMs: number;
  snapshotSoAMs: number;
  residentMemoryMB: number;
}

export function runWorldBenchmark(entityCount: number, ticks = 50, useSparseSet = false): BenchmarkMetrics {
  const world = new World();
  if (useSparseSet) {
    world.setResource("UseSparseSetStorage", true);
  }
  world.addSystem(new CollisionSystem2D());

  for (let i = 0; i < entityCount; i++) {
    const e = world.createEntity();
    world.addComponent(e, {
      type: "Transform",
      x: (i * 13) % 800,
      y: (i * 17) % 600,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: (i * 13) % 800,
      worldY: (i * 17) % 600,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(e, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 10 } as CircleShape,
      layer: 1,
      mask: 1,
      enabled: true,
      isTrigger: false,
      offsetX: 0,
      offsetY: 0
    });
  }

  // Warmup
  world.update(0.016);

  const startTick = performance.now();
  for (let i = 0; i < ticks; i++) {
    world.update(0.016);
  }
  const endTick = performance.now();
  const msPerTick = (endTick - startTick) / ticks;

  const startAoS = performance.now();
  SnapshotSerializer.snapshot(world);
  const endAoS = performance.now();

  const startSoA = performance.now();
  SnapshotSerializerSoA.snapshot(world);
  const endSoA = performance.now();

  const memUsage = process.memoryUsage?.().rss ?? 0;

  return {
    storageMode: useSparseSet ? "SparseSetStorage" : "MapStorage",
    entityCount,
    msPerTick,
    snapshotAoSMs: endAoS - startAoS,
    snapshotSoAMs: endSoA - startSoA,
    residentMemoryMB: memUsage / (1024 * 1024)
  };
}

if (require.main === module) {
  console.log("=== ECS Storage Benchmark Comparison (MapStorage vs SparseSetStorage) ===");
  for (const count of [100, 1000, 5000]) {
    const resMap = runWorldBenchmark(count, 50, false);
    const resSparse = runWorldBenchmark(count, 50, true);
    console.log(
      `[${count} entities]` +
      ` MapStorage: ${resMap.msPerTick.toFixed(3)}ms/tick (AoS: ${resMap.snapshotAoSMs.toFixed(3)}ms, SoA: ${resMap.snapshotSoAMs.toFixed(3)}ms)` +
      ` | SparseSetStorage: ${resSparse.msPerTick.toFixed(3)}ms/tick (AoS: ${resSparse.snapshotAoSMs.toFixed(3)}ms, SoA: ${resSparse.snapshotSoAMs.toFixed(3)}ms)`
    );
  }
}
