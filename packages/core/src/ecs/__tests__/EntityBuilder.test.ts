import { World, ShapeType } from "@tiny-aster/core";
import { EntityBuilder } from "../EntityBuilder";

describe("EntityBuilder", () => {
  it("should build entity with core components in World directly", () => {
    const world = new World<any>();
    const entity = EntityBuilder.create(world)
      .withTransform({ x: 100, y: 200, rotation: 1.57 })
      .withVelocity({ vx: 10, vy: -20 })
      .withRender({ shape: "circle", size: 12, color: "#ff0000" })
      .withCollider({
        shape: { type: ShapeType.Circle, radius: 12 },
        layer: 1,
        mask: 2,
        isTrigger: true
      })
      .withTTL(5.0)
      .withCollisionEvents()
      .build();

    expect(world.hasEntity(entity)).toBe(true);
    expect(world.hasComponent(entity, "Transform")).toBe(true);
    expect(world.hasComponent(entity, "Velocity")).toBe(true);
    expect(world.hasComponent(entity, "Render")).toBe(true);
    expect(world.hasComponent(entity, "Collider")).toBe(true);
    expect(world.hasComponent(entity, "TTL")).toBe(true);
    expect(world.hasComponent(entity, "CollisionEvents")).toBe(true);

    const transform = world.getComponent(entity, "Transform");
    expect(transform?.x).toBe(100);
    expect(transform?.y).toBe(200);
    expect(transform?.rotation).toBe(1.57);

    const velocity = world.getComponent(entity, "Velocity");
    expect(velocity?.vx).toBe(10);
    expect(velocity?.vy).toBe(-20);

    const ttl = world.getComponent(entity, "TTL");
    expect(ttl?.remaining).toBe(5.0);
  });

  it("should queue component additions when using createDeferred", () => {
    const world = new World<any>();
    const entity = EntityBuilder.createDeferred(world)
      .withTransform({ x: 50, y: 50 })
      .withVelocity({ vx: 5, vy: 5 })
      .build();

    expect(world.hasEntity(entity)).toBe(true);
    // Before buffer flush, components are not yet in World
    expect(world.hasComponent(entity, "Transform")).toBe(false);

    world.getCommandBuffer().flush(world);

    expect(world.hasComponent(entity, "Transform")).toBe(true);
    expect(world.hasComponent(entity, "Velocity")).toBe(true);
  });

  it("should configure an existing entity via fromEntity", () => {
    const world = new World<any>();
    const existing = world.createEntity();

    EntityBuilder.fromEntity(world, existing)
      .withTransform({ x: 300, y: 400 })
      .build();

    expect(world.getComponent(existing, "Transform")?.x).toBe(300);
  });
});
