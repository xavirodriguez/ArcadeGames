import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { PhysicsQuery } from "../src/physics/query/PhysicsQuery";
import { ShapeType } from "../src/physics/shapes/Shapes";
import { SpatialPartitioningSystem } from "../src/systems/SpatialPartitioningSystem";

describe("PhysicsQuery and SpatialPartitioningSystem Tests", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
  });

  it("should cast point and match circle collider", () => {
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(entity, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 10 },
      layer: 1,
      mask: 0xFFFF,
      enabled: true,
      isTrigger: false,
    });

    const matchesInside = PhysicsQuery.pointCast(world, 105, 100);
    expect(matchesInside).toContain(entity);

    const matchesOutside = PhysicsQuery.pointCast(world, 115, 100);
    expect(matchesOutside).not.toContain(entity);
  });

  it("should cast shape and detect intersection", () => {
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(entity, {
      type: "Collider",
      shape: { type: ShapeType.Box, width: 20, height: 20 },
      layer: 1,
      mask: 0xFFFF,
      enabled: true,
      isTrigger: false,
    });

    // Test with overlapping shape
    const castShape = { type: ShapeType.Circle, radius: 5 } as any;
    const matchesOverlap = PhysicsQuery.shapeCast(world, castShape, 112, 100);
    expect(matchesOverlap).toContain(entity);

    // Test with non-overlapping shape
    const matchesNoOverlap = PhysicsQuery.shapeCast(world, castShape, 130, 100);
    expect(matchesNoOverlap).not.toContain(entity);
  });

  it("should detect convex polygon collisions using SAT", () => {
    const polyA = {
      type: ShapeType.Polygon as const,
      vertices: [
        { x: -10, y: -10 },
        { x: 10, y: -10 },
        { x: 10, y: 10 },
        { x: -10, y: 10 }
      ]
    };

    const polyB = {
      type: ShapeType.Polygon as const,
      vertices: [
        { x: -5, y: -5 },
        { x: 5, y: -5 },
        { x: 5, y: 5 },
        { x: -5, y: 5 }
      ]
    };

    // Test polygon vs polygon overlapping
    const entityA = world.createEntity();
    world.addComponent(entityA, {
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
      dirty: false,
    });
    world.addComponent(entityA, {
      type: "Collider",
      shape: polyA,
      layer: 1,
      mask: 0xFFFF,
      enabled: true,
      isTrigger: false,
    });

    const castShape = polyB;
    const matchesOverlap = PhysicsQuery.shapeCast(world, castShape, 12, 0);
    expect(matchesOverlap).toContain(entityA); // 0 and 12 overlaps because polyA is [-10, 10] and polyB is [7, 17]

    const matchesNoOverlap = PhysicsQuery.shapeCast(world, castShape, 20, 0);
    expect(matchesNoOverlap).not.toContain(entityA);
  });

  it("should update spatial partitioning node grid coordinates", () => {
    const system = new SpatialPartitioningSystem();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 150,
      y: 250,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 150,
      worldY: 250,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(entity, {
      type: "SpatialNode",
      gridX: 0,
      gridY: 0,
    });

    system.update(world, 0.016);

    const node = world.getComponent(entity, "SpatialNode")!;
    expect(node.gridX).toBe(1); // 150 / 100 = 1.5 -> floor is 1
    expect(node.gridY).toBe(2); // 250 / 100 = 2.5 -> floor is 2
    expect(node.active).toBe(true);
  });
});
