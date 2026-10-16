import { World } from "../../ecs/World";
import { CollisionSystem2D } from "../../physics/collision/CollisionSystems";
import { SnapshotSerializerSoA } from "../../snapshots/SnapshotSerializerSoA";
import { hashSoA } from "../../snapshots/SnapshotHash";
import { ShapeType, CircleShape } from "../../physics/shapes/Shapes";

function simulateRun(seed: number, steps: number): string[] {
  const world = new World();
  world.gameplayRandom.setSeed(seed);
  world.addSystem(new CollisionSystem2D());

  for (let i = 0; i < 20; i++) {
    const e = world.createEntity();
    world.addComponent(e, {
      type: "Transform",
      x: (i * 37) % 800,
      y: (i * 53) % 600,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });
    world.addComponent(e, {
      type: "Velocity",
      vx: (i % 2 === 0 ? 1 : -1) * 50,
      vy: (i % 3 === 0 ? 1 : -1) * 30,
      angularVelocity: 0
    });
    world.addComponent(e, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 15 } as CircleShape,
      layer: 1,
      mask: 1,
      enabled: true,
      isTrigger: false,
      offsetX: 0,
      offsetY: 0
    });
  }

  const hashes: string[] = [];
  for (let step = 0; step < steps; step++) {
    world.update(0.016);
    const snap = SnapshotSerializerSoA.snapshot(world);
    hashes.push(hashSoA(snap));
  }

  return hashes;
}

describe("Golden Determinism Test", () => {
  it("should produce identical hashes tick-by-tick across two identical runs", () => {
    const run1 = simulateRun(12345, 30);
    const run2 = simulateRun(12345, 30);

    expect(run1).toEqual(run2);
    expect(run1.length).toBe(30);
  });
});
