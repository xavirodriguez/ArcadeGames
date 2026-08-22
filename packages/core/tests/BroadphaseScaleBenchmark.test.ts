import { World } from "../src/ecs/World";
import { TransformComponent, ColliderComponent } from "../src/ecs/CoreComponents";
import { BroadPhase } from "../src/physics/collision/BroadPhase";
import { ShapeType } from "../src/physics/shapes/Shapes";

describe("Broadphase Scale Benchmark (Sweep-and-Prune)", () => {
  function runBenchmark(entityCount: number) {
    const world = new World();

    for (let i = 0; i < entityCount; i++) {
      const entity = world.createEntity();

      const transform: TransformComponent = {
        type: "Transform",
        x: (i * 17) % 2000,
        y: (i * 31) % 2000,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: (i * 17) % 2000,
        worldY: (i * 31) % 2000,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      };
      world.addComponent(entity, transform);

      const collider: ColliderComponent = {
        type: "Collider",
        shape: {
          type: ShapeType.Circle,
          radius: 10
        },
        offsetX: 0,
        offsetY: 0,
        layer: 1,
        mask: 1,
        enabled: true,
        isTrigger: false
      };
      world.addComponent(entity, collider);
    }

    const query = world.query("Transform", "Collider");

    const start = performance.now();
    const pairs = BroadPhase.sweepAndPrune(query, world as any);
    const durationMs = performance.now() - start;

    return {
      entityCount,
      pairCount: pairs.length,
      durationMs
    };
  }

  it("measures broadphase pair computation scaling up to 5,000 entities", () => {
    const counts = [100, 1000, 2000, 5000];
    const results = counts.map(count => runBenchmark(count));

    console.log("Broadphase Scale Benchmark Results:");
    for (const r of results) {
      console.log(`- ${r.entityCount} entities: ${r.pairCount} candidate collision pairs computed in ${r.durationMs.toFixed(2)}ms`);
      expect(r.durationMs).toBeLessThan(100);
    }
  });
});
