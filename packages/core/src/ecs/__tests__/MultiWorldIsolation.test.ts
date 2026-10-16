import { World } from "../World";
import { CollisionSystem2D } from "../../physics/collision/CollisionSystems";
import { ShapeType, CircleShape } from "../../physics/shapes/Shapes";

describe("Multi-World Isolation Test", () => {
  it.each([
    ["Both MapStorage", false, false],
    ["Both SparseSetStorage", true, true],
    ["Mixed Map and SparseSet", false, true]
  ])("should run two parallel worlds without cross-talk or state contamination (%s)", (_name, sparseA, sparseB) => {
    const worldA = new World();
    const worldB = new World();

    if (sparseA) worldA.setResource("UseSparseSetStorage", true);
    if (sparseB) worldB.setResource("UseSparseSetStorage", true);

    const systemA = new CollisionSystem2D();
    const systemB = new CollisionSystem2D();

    worldA.addSystem(systemA);
    worldB.addSystem(systemB);

    let collisionsA = 0;
    let collisionsB = 0;

    systemA.onCollision(() => { collisionsA++; });
    systemB.onCollision(() => { collisionsB++; });

    // World A: two overlapping entities
    const eA1 = worldA.createEntity();
    const eA2 = worldA.createEntity();
    worldA.addComponent(eA1, { type: "Transform", x: 10, y: 10, rotation: 0, scaleX: 1, scaleY: 1, worldX: 10, worldY: 10, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    worldA.addComponent(eA1, { type: "Collider", shape: { type: ShapeType.Circle, radius: 10 } as CircleShape, layer: 1, mask: 1, enabled: true, isTrigger: false, offsetX: 0, offsetY: 0 });
    worldA.addComponent(eA2, { type: "Transform", x: 12, y: 10, rotation: 0, scaleX: 1, scaleY: 1, worldX: 12, worldY: 10, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    worldA.addComponent(eA2, { type: "Collider", shape: { type: ShapeType.Circle, radius: 10 } as CircleShape, layer: 1, mask: 1, enabled: true, isTrigger: false, offsetX: 0, offsetY: 0 });

    // World B: two far apart entities (no collision)
    const eB1 = worldB.createEntity();
    const eB2 = worldB.createEntity();
    worldB.addComponent(eB1, { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, worldX: 100, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    worldB.addComponent(eB1, { type: "Collider", shape: { type: ShapeType.Circle, radius: 10 } as CircleShape, layer: 1, mask: 1, enabled: true, isTrigger: false, offsetX: 0, offsetY: 0 });
    worldB.addComponent(eB2, { type: "Transform", x: 500, y: 500, rotation: 0, scaleX: 1, scaleY: 1, worldX: 500, worldY: 500, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    worldB.addComponent(eB2, { type: "Collider", shape: { type: ShapeType.Circle, radius: 10 } as CircleShape, layer: 1, mask: 1, enabled: true, isTrigger: false, offsetX: 0, offsetY: 0 });

    worldA.update(0.016);
    worldB.update(0.016);

    expect(collisionsA).toBeGreaterThan(0);
    expect(collisionsB).toBe(0);
  });
});
