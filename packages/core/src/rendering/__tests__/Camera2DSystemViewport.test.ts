import { World } from "../../ecs/World";
import { SystemPhase } from "../../ecs/System";
import { Camera2DSystem } from "../Camera2D";
import { EntityBuilder } from "../../ecs/EntityBuilder";

describe("Camera2DSystem Viewport and Group Tracking", () => {
  it("computes viewport bounds and checks entity visibility", () => {
    const world = new World();
    const cameraSystem = new Camera2DSystem();
    world.addSystem(cameraSystem, { phase: SystemPhase.Presentation });

    world.setResource("ScreenConfig", { width: 800, height: 600 });

    const cameraEntity = EntityBuilder.create(world).build();
    world.addComponent(cameraEntity, {
      type: "Camera2D",
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      zoom: 1,
      isMain: true
    });

    const insideEntity = EntityBuilder.create(world)
      .withTransform({ x: 400, y: 300 })
      .build();

    const outsideEntity = EntityBuilder.create(world)
      .withTransform({ x: 1200, y: 900 })
      .build();

    world.update(1 / 60);

    const bounds = Camera2DSystem.getViewportBounds(world, cameraEntity);
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBe(800);
    expect(bounds!.height).toBe(600);

    expect(Camera2DSystem.isEntityInViewport(world, insideEntity, 0, cameraEntity)).toBe(true);
    expect(Camera2DSystem.isEntityInViewport(world, outsideEntity, 0, cameraEntity)).toBe(false);
  });

  it("tracks the centroid of followEntities", () => {
    const world = new World();
    const cameraSystem = new Camera2DSystem();
    world.addSystem(cameraSystem, { phase: SystemPhase.Presentation });

    world.setResource("ScreenConfig", { width: 800, height: 600 });

    const ent1 = EntityBuilder.create(world).withTransform({ x: 100, y: 100 }).build();
    const ent2 = EntityBuilder.create(world).withTransform({ x: 300, y: 100 }).build();

    const cameraEntity = EntityBuilder.create(world).build();
    world.addComponent(cameraEntity, {
      type: "Camera2D",
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      zoom: 1,
      isMain: true,
      followEntities: [ent1, ent2],
      smoothingX: 100,
      smoothingY: 100
    });

    world.update(1 / 60);

    const cam = world.getComponent(cameraEntity, "Camera2D")!;
    expect(cam.targetX).toBe(-200);
    expect(cam.targetY).toBe(-200);
  });
});
