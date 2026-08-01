import { World, SystemPhase, TransformComponent } from "../src";
import { ParallaxSystem } from "../src/systems/ParallaxSystem";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";

describe("ParallaxSystem", () => {
  let world: World<CoreComponentRegistry>;
  let system: ParallaxSystem;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    system = new ParallaxSystem();
    world.addSystem(system, { phase: SystemPhase.Presentation });
  });

  test("should synchronize layer transform based on factorX and factorY when camera moves", () => {
    // 1. Create a Camera2D entity
    const cameraEntity = world.createEntity();
    world.addComponent(cameraEntity, {
      type: "Camera2D",
      x: 100,
      y: 50,
      targetX: 100,
      targetY: 50,
      zoom: 1,
      isMain: true
    });

    // 2. Create a ParallaxLayer entity
    const layerEntity = world.createEntity();
    world.addComponent(layerEntity, {
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
      dirty: false
    } as TransformComponent);
    world.addComponent(layerEntity, {
      type: "ParallaxLayer",
      factorX: 0.5,
      factorY: 0.2,
      tileWidth: 100,
      tileHeight: 100,
      initialX: 200,
      initialY: 300,
      autoScrollX: 0,
      autoScrollY: 0,
      layerType: "test",
      paused: false
    });

    // Run system tick
    world.update(0.16);

    // Verify coordinates updated using formula: initial - camera * factor
    const transform = world.getComponent(layerEntity, "Transform")!;
    expect(transform.x).toBe(200 - 100 * 0.5); // 200 - 50 = 150
    expect(transform.y).toBe(300 - 50 * 0.2);  // 300 - 10 = 290
    expect(transform.dirty).toBe(true);
  });

  test("should accumulate independent autoScrollX and autoScrollY when unpaused", () => {
    const layerEntity = world.createEntity();
    world.addComponent(layerEntity, {
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
      dirty: false
    } as TransformComponent);
    world.addComponent(layerEntity, {
      type: "ParallaxLayer",
      factorX: 0,
      factorY: 0,
      tileWidth: 100,
      tileHeight: 100,
      initialX: 10,
      initialY: 20,
      speedX: -50,
      speedY: 10,
      autoScrollX: 0,
      autoScrollY: 0,
      layerType: "test",
      paused: false
    });

    // Tick once with deltaTime = 1 second
    world.update(1.0);

    const layer = world.getComponent(layerEntity, "ParallaxLayer")!;
    expect(layer.autoScrollX).toBe(-50);
    expect(layer.autoScrollY).toBe(10);

    // Verify Transform position matches autoScroll
    const transform = world.getComponent(layerEntity, "Transform")!;
    expect(transform.x).toBe(10 - 50); // -40
    expect(transform.y).toBe(20 + 10);  // 30
  });

  test("should NOT accumulate autoScroll displacement when paused", () => {
    const layerEntity = world.createEntity();
    world.addComponent(layerEntity, {
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
      dirty: false
    } as TransformComponent);
    world.addComponent(layerEntity, {
      type: "ParallaxLayer",
      factorX: 0,
      factorY: 0,
      tileWidth: 100,
      tileHeight: 100,
      initialX: 10,
      initialY: 20,
      speedX: -50,
      speedY: 10,
      autoScrollX: 5,
      autoScrollY: 5,
      layerType: "test",
      paused: true
    });

    // Tick once with deltaTime = 1.0
    world.update(1.0);

    const layer = world.getComponent(layerEntity, "ParallaxLayer")!;
    expect(layer.autoScrollX).toBe(5); // No change
    expect(layer.autoScrollY).toBe(5); // No change

    const transform = world.getComponent(layerEntity, "Transform")!;
    expect(transform.x).toBe(10 + 5); // 15
    expect(transform.y).toBe(20 + 5); // 25
  });

  test("should integrate camera screen shake (visualOffset) into transform calculations", () => {
    const cameraEntity = world.createEntity();
    world.addComponent(cameraEntity, {
      type: "Camera2D",
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      zoom: 1,
      isMain: true
    });
    world.addComponent(cameraEntity, {
      type: "VisualOffset",
      offsetX: 15,
      offsetY: -10
    });

    const layerEntity = world.createEntity();
    world.addComponent(layerEntity, {
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
      dirty: false
    } as TransformComponent);
    world.addComponent(layerEntity, {
      type: "ParallaxLayer",
      factorX: 1.0,
      factorY: 1.0,
      tileWidth: 100,
      tileHeight: 100,
      initialX: 100,
      initialY: 100,
      autoScrollX: 0,
      autoScrollY: 0,
      layerType: "test",
      paused: false
    });

    world.update(0.16);

    const transform = world.getComponent(layerEntity, "Transform")!;
    // formula: initial - (cam + vo) * factor
    expect(transform.x).toBe(100 - (0 + 15) * 1.0); // 85
    expect(transform.y).toBe(100 - (0 - 10) * 1.0); // 110
  });
});
