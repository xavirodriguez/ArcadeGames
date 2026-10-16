import { World } from "../ecs/World";
import { CollisionSystem2D } from "../physics/collision/CollisionSystems";
import { SnapshotSerializer } from "../snapshots/SnapshotSerializer";
import { SnapshotSerializerSoA } from "../snapshots/SnapshotSerializerSoA";
import { ShapeType, CircleShape } from "../physics/shapes/Shapes";

export interface BenchmarkMetrics {
  entityCount: number;
  msPerTick: number;
  snapshotAoSMs: number;
  snapshotSoAMs: number;
  residentMemoryMB: number;
}

export function runWorldBenchmark(entityCount: number, ticks = 50): BenchmarkMetrics {
  const world = new World();
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
    entityCount,
    msPerTick,
    snapshotAoSMs: endAoS - startAoS,
    snapshotSoAMs: endSoA - startSoA,
    residentMemoryMB: memUsage / (1024 * 1024)
  };
}

if (require.main === module) {
  console.log("=== ECS Tick & Snapshot Benchmark ===");
  for (const count of [100, 1000, 5000]) {
    const res = runWorldBenchmark(count);
    console.log(
      `[${res.entityCount} entities] ms/tick: ${res.msPerTick.toFixed(3)}ms | Snapshot AoS: ${res.snapshotAoSMs.toFixed(3)}ms | Snapshot SoA: ${res.snapshotSoAMs.toFixed(3)}ms | RSS: ${res.residentMemoryMB.toFixed(2)}MB`
    );
  }
}
