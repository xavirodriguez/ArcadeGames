import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { PhysicsQuery } from "../src/physics/query/PhysicsQuery";
import { ShapeType, CircleShape } from "../src/physics/shapes/Shapes";
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
    const castShape: CircleShape = { type: ShapeType.Circle, radius: 5 };
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

  it("should find nearest entity with radius limit, filter, and tie-breaking", () => {
    // Spawn entity 1 at (100, 100)
    const e1 = world.createEntity();
    world.addComponent(e1, {
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
    world.addComponent(e1, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 5 },
      layer: 1,
      mask: 0xffff,
      enabled: true,
      isTrigger: false,
    });

    // Spawn entity 2 at (105, 100) -> distance 5
    const e2 = world.createEntity();
    world.addComponent(e2, {
      type: "Transform",
      x: 105,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 105,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(e2, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 5 },
      layer: 1,
      mask: 0xffff,
      enabled: true,
      isTrigger: false,
    });

    // Query nearest to (100, 100) -> should be e1 (distance 0)
    const resultNearest = PhysicsQuery.nearest(world, 100, 100);
    expect(resultNearest).not.toBeNull();
    expect(resultNearest?.entity).toBe(e1);
    expect(resultNearest?.distance).toBe(0);

    // Query nearest to (103, 100) -> e1 is at distance 3, e2 is at distance 2 -> e2
    const resultNearestE2 = PhysicsQuery.nearest(world, 103, 100);
    expect(resultNearestE2?.entity).toBe(e2);
    expect(resultNearestE2?.distance).toBeCloseTo(2);

    // With radius limit of 1 -> neither within range of (100, 100) if querying from (120, 100)
    const resultOut = PhysicsQuery.nearest(world, 120, 100, { radius: 5 });
    expect(resultOut).toBeNull();

    // Filter out e1 -> should return e2
    const resultFiltered = PhysicsQuery.nearest(world, 100, 100, {
      filter: (ent) => ent !== e1,
    });
    expect(resultFiltered?.entity).toBe(e2);
    expect(resultFiltered?.distance).toBe(5);

    // Tie-breaking check: e1 and e2 equidistant from (102.5, 100) -> both distance 2.5
    // Lower entity ID (e1) should win
    const resultTie = PhysicsQuery.nearest(world, 102.5, 100);
    expect(resultTie?.entity).toBe(e1);
  });

  it("should raycast against circle, box, and polygon colliders", () => {
    // 1. Circle at (100, 0), radius 10
    const circleEnt = world.createEntity();
    world.addComponent(circleEnt, {
      type: "Transform",
      x: 100,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(circleEnt, {
      type: "Collider",
      shape: { type: ShapeType.Circle, radius: 10 },
      layer: 1,
      mask: 0xffff,
      enabled: true,
      isTrigger: false,
    });

    // 2. Box at (200, 0), 20x20 box (spans [190, 210])
    const boxEnt = world.createEntity();
    world.addComponent(boxEnt, {
      type: "Transform",
      x: 200,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 200,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(boxEnt, {
      type: "Collider",
      shape: { type: ShapeType.Box, width: 20, height: 20 },
      layer: 1,
      mask: 0xffff,
      enabled: true,
      isTrigger: false,
    });

    // 3. Polygon at (300, 0), 20x20 quad
    const polyEnt = world.createEntity();
    world.addComponent(polyEnt, {
      type: "Transform",
      x: 300,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 300,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(polyEnt, {
      type: "Collider",
      shape: {
        type: ShapeType.Polygon,
        vertices: [
          { x: -10, y: -10 },
          { x: 10, y: -10 },
          { x: 10, y: 10 },
          { x: -10, y: 10 },
        ],
      },
      layer: 1,
      mask: 0xffff,
      enabled: true,
      isTrigger: false,
    });

    // Raycast from (0, 0) pointing right along X axis (1, 0) with distance 500
    const firstHit = PhysicsQuery.raycast(world, { x: 0, y: 0 }, { x: 1, y: 0 }, 500);
    expect(firstHit).not.toBeNull();
    expect(firstHit?.entity).toBe(circleEnt);
    expect(firstHit?.distance).toBeCloseTo(90); // 100 - 10 radius
    expect(firstHit?.point.x).toBeCloseTo(90);
    expect(firstHit?.point.y).toBeCloseTo(0);
    expect(firstHit?.normal.x).toBeCloseTo(-1);
    expect(firstHit?.normal.y).toBeCloseTo(0);

    // RaycastAll from (0, 0)
    const allHits = PhysicsQuery.raycastAll(world, { x: 0, y: 0 }, { x: 1, y: 0 }, 500);
    expect(allHits.length).toBe(3);
    expect(allHits[0].entity).toBe(circleEnt);
    expect(allHits[1].entity).toBe(boxEnt);
    expect(allHits[1].distance).toBeCloseTo(190);
    expect(allHits[2].entity).toBe(polyEnt);
    expect(allHits[2].distance).toBeCloseTo(290);

    // Raycast with maxDistance shorter than first target
    const shortHit = PhysicsQuery.raycast(world, { x: 0, y: 0 }, { x: 1, y: 0 }, 50);
    expect(shortHit).toBeNull();

    // Raycast with filter excluding circleEnt
    const filteredHit = PhysicsQuery.raycast(
      world,
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      500,
      { filter: (e) => e !== circleEnt }
    );
    expect(filteredHit?.entity).toBe(boxEnt);
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
