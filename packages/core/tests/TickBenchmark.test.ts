import { World } from "../src/ecs/World";
import { CollisionSystem2D } from "../src/physics/collision/CollisionSystems";
import { SnapshotSerializer } from "../src/snapshots/SnapshotSerializer";
import { SnapshotSerializerSoA } from "../src/snapshots/SnapshotSerializerSoA";
import { ShapeType, CircleShape } from "../src/physics/shapes/Shapes";

describe("Tick & Snapshot Benchmark", () => {
  function runWorldBenchmark(entityCount: number, ticks = 20) {
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

    return {
      entityCount,
      msPerTick,
      snapshotAoSMs: endAoS - startAoS,
      snapshotSoAMs: endSoA - startSoA
    };
  }

  it("benchmarks 100, 1000, and 5000 entity performance", () => {
    const results = [100, 1000, 5000].map(count => runWorldBenchmark(count, 10));
    console.log("=== Tick & Snapshot Baseline Metrics ===");
    for (const r of results) {
      console.log(
        `- ${r.entityCount} entities: ${r.msPerTick.toFixed(3)}ms/tick | AoS Snapshot: ${r.snapshotAoSMs.toFixed(3)}ms | SoA Snapshot: ${r.snapshotSoAMs.toFixed(3)}ms`
      );
    }
  });
});
