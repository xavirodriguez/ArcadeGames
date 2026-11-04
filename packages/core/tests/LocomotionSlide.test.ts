import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { PlatformerSlideSystem } from "../src/physics/systems/PlatformerSlideSystem";
import { PlatformerMovementSystem } from "../src/physics/systems/PlatformerMovementSystem";
import { LOCOMOTION_PROFILE_PRESETS } from "../src/physics/LocomotionProfiles";
import { ShapeType } from "../src/physics/shapes/Shapes";

describe("Locomotion B2 slide posture", () => {
  const createPlayer = (withCeiling = false) => {
    const world = new World<CoreComponentRegistry>();
    const tilemap = world.createEntity();
    world.addComponent(tilemap, {
      type: "Tilemap",
      data: withCeiling ? [[1], [0], [1]] : [[0], [0], [1]],
      tileSize: 40,
      tileDefinitions: { 1: { solid: true } }
    });
    world.addComponent(tilemap, {
      type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });
    const player = world.createEntity();
    world.addComponent(player, {
      type: "Transform", x: 20, y: 55, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 20, worldY: 55, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });
    world.addComponent(player, { type: "Velocity", vx: 180, vy: 0, angularVelocity: 0 });
    world.addComponent(player, {
      type: "Collider2D", shape: { type: "aabb", halfWidth: 8, halfHeight: 25 },
      layer: 1, mask: 0xffff, offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
    });
    world.addComponent(player, {
      type: "PlatformerInput", moveDir: 0, jumpPressed: false, jumpHeld: false, jumpReleased: false, slideHeld: true
    });
    world.addComponent(player, { type: "PlatformerGroundState", isGrounded: true });
    world.addComponent(player, {
      type: "LocomotionProfile", ...LOCOMOTION_PROFILE_PRESETS.responsive
    });
    world.addComponent(player, {
      type: "PlatformerPosture", current: "standing", desired: "standing",
      standingHeight: 50, slidingHeight: 20, slideElapsed: 0,
      slideMinimumDuration: 0.2, slideMaximumDuration: 0.9
    });
    return { world, player, tilemap };
  };

  it("enters slide above the minimum entry speed and preserves the foot position", () => {
    const { world, player } = createPlayer();
    new PlatformerSlideSystem().update(world, 1 / 60);
    const posture = world.getComponent(player, "PlatformerPosture")!;
    const collider = world.getComponent(player, "Collider2D")!;
    const transform = world.getComponent(player, "Transform")!;
    expect(posture.current).toBe("sliding");
    expect(collider.shape.type === "aabb" ? collider.shape.halfHeight : 0).toBe(10);
    expect(transform.y + 10).toBeCloseTo(80, 5);
  });

  it("emits one slide-start event only after a successful posture transition", () => {
    const { world, player } = createPlayer();
    const events: Array<{ entity: number; x: number; y: number; velocityX: number; velocityY: number }> = [];
    world.getEventBus().on("locomotion:slide_started", event => events.push(event));
    const system = new PlatformerSlideSystem();
    system.update(world, 1 / 60);
    system.update(world, 1 / 60);
    expect(events).toEqual([{ entity: player, x: 20, y: 55, velocityX: 180, velocityY: 0 }]);
  });

  it("rejects slide entry below the configured minimum speed", () => {
    const { world, player } = createPlayer();
    world.mutateComponent(player, "Velocity", velocity => { velocity.vx = 20; });
    new PlatformerSlideSystem().update(world, 1 / 60);
    expect(world.getComponent(player, "PlatformerPosture")?.current).toBe("standing");
    expect(world.getComponent(player, "Collider2D")?.shape).toEqual({ type: "aabb", halfWidth: 8, halfHeight: 25 });
  });

  it("forces a slide exit at maximum duration even while the action remains held", () => {
    const { world, player } = createPlayer();
    world.mutateComponent(player, "PlatformerPosture", posture => { posture.slideMaximumDuration = 0.05; });
    const system = new PlatformerSlideSystem();
    system.update(world, 1 / 60);
    system.update(world, 0.1);
    expect(world.getComponent(player, "PlatformerPosture")?.current).toBe("standing");
  });

  it("waits for minimum duration and then restores standing posture when clearance is free", () => {
    const { world, player } = createPlayer();
    const system = new PlatformerSlideSystem();
    system.update(world, 1 / 60);
    world.mutateComponent(player, "PlatformerInput", input => { input.slideHeld = false; });
    for (let tick = 0; tick < 20; tick++) system.update(world, 1 / 60);
    expect(world.getComponent(player, "PlatformerPosture")?.current).toBe("standing");
    expect(world.getComponent(player, "Collider2D")?.shape).toEqual({ type: "aabb", halfWidth: 8, halfHeight: 25 });
    expect(world.getComponent(player, "Transform")?.y).toBeCloseTo(55, 5);
  });

  it("stays blocked under a low ceiling and retries standing when the obstruction is removed", () => {
    const { world, player, tilemap } = createPlayer(true);
    const system = new PlatformerSlideSystem();
    system.update(world, 1 / 60);
    world.mutateComponent(player, "PlatformerInput", input => { input.slideHeld = false; });
    for (let tick = 0; tick < 20; tick++) system.update(world, 1 / 60);
    expect(world.getComponent(player, "PlatformerPosture")?.current).toBe("blocked");
    world.mutateComponent(tilemap, "Tilemap", map => { map.data[0][0] = 0; });
    system.update(world, 1 / 60);
    expect(world.getComponent(player, "PlatformerPosture")?.current).toBe("standing");
  });

  it("applies slide friction through the profile movement path", () => {
    const { world, player } = createPlayer();
    const posture = world.getMutableComponent(player, "PlatformerPosture")!;
    posture.current = "sliding";
    const movement = new PlatformerMovementSystem();
    const before = world.getComponent(player, "Velocity")!.vx;
    movement.update(world, 0.1);
    expect(world.getComponent(player, "Velocity")!.vx).toBeLessThan(before);
  });

  it("continues to apply slide movement while standing clearance is blocked", () => {
    const { world, player } = createPlayer(true);
    const slide = new PlatformerSlideSystem();
    slide.update(world, 1 / 60);
    world.mutateComponent(player, "PlatformerInput", input => { input.slideHeld = false; });
    for (let tick = 0; tick < 20; tick++) slide.update(world, 1 / 60);

    expect(world.getComponent(player, "PlatformerPosture")?.current).toBe("blocked");
    const before = world.getComponent(player, "Velocity")!.vx;
    new PlatformerMovementSystem().update(world, 0.1);
    expect(world.getComponent(player, "Velocity")!.vx).toBeLessThan(before);
  });

  it("keeps the reduced posture when a solid non-trigger box collider blocks standing", () => {
    const { world, player } = createPlayer();
    const ceiling = world.createEntity();
    world.addComponent(ceiling, {
      type: "Transform", x: 20, y: 35, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 20, worldY: 35, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });
    world.addComponent(ceiling, {
      type: "Collider", shape: { type: ShapeType.Box, width: 40, height: 10 },
      layer: 1, mask: 0xffff, enabled: true, isTrigger: false
    });
    const system = new PlatformerSlideSystem();
    system.update(world, 1 / 60);
    world.mutateComponent(player, "PlatformerInput", input => { input.slideHeld = false; });
    for (let tick = 0; tick < 20; tick++) system.update(world, 1 / 60);
    expect(world.getComponent(player, "PlatformerPosture")?.current).toBe("blocked");
    world.mutateComponent(ceiling, "Collider", collider => { collider.enabled = false; });
    system.update(world, 1 / 60);
    expect(world.getComponent(player, "PlatformerPosture")?.current).toBe("standing");
  });

  it("does not change entities that do not opt into posture and slide profiles", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Velocity", vx: 180, vy: 0, angularVelocity: 0 });
    world.addComponent(entity, { type: "PlatformerInput", moveDir: 0, jumpPressed: false, jumpHeld: false, jumpReleased: false });
    new PlatformerSlideSystem().update(world, 1 / 60);
    expect(world.getComponent(entity, "PlatformerPosture")).toBeUndefined();
    expect(world.getComponent(entity, "Velocity")?.vx).toBe(180);
  });
});
