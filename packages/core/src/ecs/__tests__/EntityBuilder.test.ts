import { World } from "../World";
import { createEntityBuilder, EntityBuilder } from "../EntityBuilder";
import { ShapeType } from "../../physics/shapes/Shapes";

describe("EntityBuilder", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should build an entity with transform, velocity, render, collider, and TTL directly on World when not updating", () => {
    const builder = createEntityBuilder(world);
    const entity = builder
      .withTransform({ x: 100, y: 200, rotation: 1.5 })
      .withVelocity({ vx: 50, vy: -50 })
      .withRender({ shape: "ship", size: 20, color: "blue" })
      .withCollider({ shape: { type: ShapeType.Circle, radius: 20 } as any, layer: 1, mask: 2 })
      .withTTL(5.0)
      .withHealth(3, 3)
      .withCollisionEvents()
      .commit();

    expect(world.isAlive(entity)).toBe(true);
    const transform = world.getComponent(entity, "Transform");
    expect(transform).toEqual({
      type: "Transform",
      x: 100,
      y: 200,
      rotation: 1.5,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 200,
      worldRotation: 1.5,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true,
      parentEntity: undefined
    });

    const velocity = world.getComponent(entity, "Velocity");
    expect(velocity?.vx).toBe(50);
    expect(velocity?.vy).toBe(-50);

    const render = world.getComponent(entity, "Render");
    expect(render?.shape).toBe("ship");
    expect(render?.size).toBe(20);
    expect(render?.color).toBe("blue");

    const ttl = world.getComponent(entity, "TTL");
    expect(ttl?.remaining).toBe(5.0);

    const health = world.getComponent(entity, "Health");
    expect(health?.current).toBe(3);
  });

  it("should defer mutations to CommandBuffer when world is updating", () => {
    world.isUpdating = true;

    const builder = createEntityBuilder(world);
    const entity = builder
      .withTransform({ x: 10, y: 20 })
      .withTag(["Player"])
      .commit();

    // Before flush, components should not be attached yet
    expect(world.getComponent(entity, "Transform")).toBeUndefined();

    // Set updating to false and flush command buffer
    world.isUpdating = false;
    world.flush();

    expect(world.getComponent(entity, "Transform")).toBeDefined();
    expect(world.getComponent(entity, "Tag")?.tags).toEqual(["Player"]);
  });

  it("should support custom component addition via withComponent", () => {
    const entity = createEntityBuilder(world)
      .withComponent({ type: "CustomComp", value: 42 } as any)
      .commit();

    expect(world.getComponent(entity, "CustomComp" as any)).toEqual({
      type: "CustomComp",
      value: 42
    });
  });
});
