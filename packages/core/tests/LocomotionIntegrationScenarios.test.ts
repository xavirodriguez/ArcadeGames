import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { LOCOMOTION_PROFILE_PRESETS } from "../src/physics/LocomotionProfiles";
import { PHYSICS_MATERIAL_PRESETS } from "../src/physics/PhysicsMaterials";
import { PlatformerMovementSystem } from "../src/physics/systems/PlatformerMovementSystem";
import { PlatformerSlideSystem } from "../src/physics/systems/PlatformerSlideSystem";
import { PlatformerGravitySystem } from "../src/physics/systems/PlatformerGravitySystem";
import { PlatformerCoyoteSystem } from "../src/systems/PlatformerCoyoteSystem";
import { PlatformerJumpSystem } from "../src/systems/PlatformerJumpSystem";
import { MovingPlatformSystem } from "../src/physics/systems/MovingPlatformSystem";
import { PlatformCarrySystem } from "../src/physics/systems/PlatformCarrySystem";
import { PhysicsIntegrateSystem } from "../src/physics/dynamics/PhysicsIntegrateSystem";
import { TileCollisionSystem } from "../src/physics/systems/TileCollisionSystem";
import { CollisionSystem2D } from "../src/physics/collision/CollisionSystems";

type LocalAabb = { type: "aabb"; halfWidth: number; halfHeight: number };

describe("Locomotion V1 Full Multi-Tick Integration Scenarios", () => {
  const FIXED_DT = 1 / 60;

  function createIntegrationWorld() {
    const world = new World<CoreComponentRegistry>();
    const movingPlatformSys = new MovingPlatformSystem();
    const slideSys = new PlatformerSlideSystem();
    const movementSys = new PlatformerMovementSystem();
    const gravitySys = new PlatformerGravitySystem();
    const coyoteSys = new PlatformerCoyoteSystem();
    const jumpSys = new PlatformerJumpSystem();
    const carrySys = new PlatformCarrySystem();
    const integrateSys = new PhysicsIntegrateSystem();
    const collisionSys2D = new CollisionSystem2D();
    const tileCollisionSys = new TileCollisionSystem();

    function step(ticks = 1) {
      for (let t = 0; t < ticks; t++) {
        movingPlatformSys.update(world, FIXED_DT);
        slideSys.update(world, FIXED_DT);
        movementSys.update(world, FIXED_DT);
        gravitySys.update(world, FIXED_DT);
        coyoteSys.update(world, FIXED_DT);
        jumpSys.update(world, FIXED_DT);
        carrySys.update(world, FIXED_DT);
        integrateSys.update(world, FIXED_DT);
        collisionSys2D.update(world, FIXED_DT);
        tileCollisionSys.update(world, FIXED_DT);
      }
    }

    return { world, step };
  }

  function addTransform(world: World<CoreComponentRegistry>, entity: number, x: number, y: number) {
    world.addComponent(entity, {
      type: "Transform",
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: x,
      worldY: y,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
  }

  function spawnPlayer(
    world: World<CoreComponentRegistry>,
    x: number,
    y: number,
    options: {
      profile?: typeof LOCOMOTION_PROFILE_PRESETS.responsive;
      halfW?: number;
      halfH?: number;
      slideEnabled?: boolean;
    } = {}
  ) {
    const player = world.createEntity();
    addTransform(world, player, x, y);
    world.addComponent(player, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
    const halfW = options.halfW ?? 10;
    const halfH = options.halfH ?? 15;
    world.addComponent(player, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: halfW, halfHeight: halfH },
      layer: 1,
      mask: 0xffff,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    });
    world.addComponent(player, { type: "Tag", tags: ["TileCollider", "Player"] });
    world.addComponent(player, {
      type: "PlatformerMovementConfig",
      maxSpeed: 200,
      acceleration: 1000,
      deceleration: 800,
      airAcceleration: 400,
      airDeceleration: 200
    });
    world.addComponent(player, {
      type: "PlatformerGravityConfig",
      riseGravity: 980,
      fallGravity: 1200,
      jumpVelocity: 400,
      minJumpVelocity: 150
    });
    world.addComponent(player, {
      type: "PlatformerGroundState",
      isGrounded: true,
      iceMultiplier: 1.0
    });
    world.addComponent(player, {
      type: "PhysicsContactState",
      contacts: [],
      isGrounded: true
    });
    world.addComponent(player, {
      type: "PlatformerJumper",
      coyoteTimer: 0.15,
      jumpBufferTimer: 0,
      coyoteTimeMax: 0.15,
      jumpBufferMax: 0.1,
      maxJumps: 2,
      jumpsRemaining: 2
    });
    world.addComponent(player, {
      type: "PlatformerInput",
      moveDir: 0,
      jumpPressed: false,
      jumpHeld: false,
      jumpReleased: false,
      slideHeld: false
    });

    const baseProfile = options.profile ?? LOCOMOTION_PROFILE_PRESETS.responsive;
    world.addComponent(player, {
      type: "LocomotionProfile",
      ground: { ...baseProfile.ground },
      air: { ...baseProfile.air },
      momentum: { ...baseProfile.momentum },
      ...(baseProfile.slide ? { slide: { ...baseProfile.slide } } : {})
    });

    if (options.slideEnabled !== false && baseProfile.slide) {
      const standingHeight = halfH * 2;
      world.addComponent(player, {
        type: "PlatformerPosture",
        current: "standing",
        desired: "standing",
        standingHeight,
        slidingHeight: Math.max(8, standingHeight * 0.4),
        slideElapsed: 0,
        slideMinimumDuration: 0.2,
        slideMaximumDuration: 0.9
      });
    }

    return player;
  }

  it("Scenario 1: Acceleration -> Braking -> Direction Reversal", () => {
    const { world, step } = createIntegrationWorld();
    const player = spawnPlayer(world, 100, 100);

    expect(world.getComponent(player, "Velocity")?.vx).toBe(0);

    // Accelerate to the right for 15 ticks
    world.mutateComponent(player, "PlatformerInput", (inp) => { inp.moveDir = 1; });
    step(15);
    const speedAfterAccel = world.getComponent(player, "Velocity")?.vx ?? 0;
    expect(speedAfterAccel).toBeGreaterThan(100);

    // Release input: passive deceleration
    world.mutateComponent(player, "PlatformerInput", (inp) => { inp.moveDir = 0; });
    step(3);
    const speedAfterBraking = world.getComponent(player, "Velocity")?.vx ?? 0;
    expect(speedAfterBraking).toBeLessThan(speedAfterAccel);
    expect(speedAfterBraking).toBeGreaterThan(0);

    // Active reversal to the left
    world.mutateComponent(player, "PlatformerInput", (inp) => { inp.moveDir = -1; });
    step(25);
    const speedAfterReversal = world.getComponent(player, "Velocity")?.vx ?? 0;
    expect(speedAfterReversal).toBeLessThan(0);
  });

  it("Scenario 2: Run -> Descending slope -> Jump preserving momentum", () => {
    const { world, step } = createIntegrationWorld();
    const tilemap = world.createEntity();
    world.addComponent(tilemap, {
      type: "Tilemap",
      data: [
        [0, 0, 0, 0, 0],
        [0, 6, 0, 0, 0],
        [1, 1, 1, 1, 1]
      ],
      tileSize: 40,
      tileDefinitions: {
        1: { solid: true, materialId: "normal" },
        6: {
          solid: true,
          slope: { start: { x: 0, y: 0 }, end: { x: 40, y: 40 } },
          materialId: "normal"
        }
      },
      physicsMaterials: { normal: PHYSICS_MATERIAL_PRESETS.normal }
    });
    addTransform(world, tilemap, 0, 0);

    const player = spawnPlayer(world, 50, 40);

    world.mutateComponent(player, "PlatformerInput", (inp) => { inp.moveDir = 1; });
    step(10);

    world.mutateComponent(player, "PlatformerInput", (inp) => {
      inp.jumpPressed = true;
      inp.jumpHeld = true;
    });
    step(1);

    const vel = world.getComponent(player, "Velocity")!;
    expect(vel.vy).toBeLessThan(-200);
    expect(vel.vx).toBeGreaterThan(20);
  });

  it("Scenario 3: Run on ice -> transition to normal surface maintains continuity", () => {
    const { world, step } = createIntegrationWorld();
    const tilemap = world.createEntity();
    world.addComponent(tilemap, {
      type: "Tilemap",
      data: [
        [0, 0, 0, 0],
        [2, 2, 1, 1]
      ],
      tileSize: 40,
      tileDefinitions: {
        1: { solid: true, materialId: "normal" },
        2: { solid: true, materialId: "ice" }
      },
      physicsMaterials: {
        normal: PHYSICS_MATERIAL_PRESETS.normal,
        ice: PHYSICS_MATERIAL_PRESETS.ice
      }
    });
    addTransform(world, tilemap, 0, 0);

    const player = spawnPlayer(world, 20, 25);
    world.mutateComponent(player, "Velocity", (v) => { v.vy = 50; });
    step(3);
    expect(world.getComponent(player, "PhysicsContactState")?.groundContact?.materialId).toBe("ice");

    // Accelerate on ice and traverse into normal ground (x > 80)
    world.mutateComponent(player, "PlatformerInput", (inp) => { inp.moveDir = 1; });
    step(60);
    const pos = world.getComponent(player, "Transform")!;
    expect(pos.x).toBeGreaterThan(80);
    const contact = world.getComponent(player, "PhysicsContactState")?.groundContact;
    expect(contact?.materialId).toBe("normal");
  });

  it("Scenario 4: Fall onto bounce surface produces restitution bounce", () => {
    const { world, step } = createIntegrationWorld();
    const tilemap = world.createEntity();
    world.addComponent(tilemap, {
      type: "Tilemap",
      data: [
        [0, 0],
        [0, 0],
        [3, 3]
      ],
      tileSize: 40,
      tileDefinitions: {
        3: { solid: true, materialId: "elastic" }
      },
      physicsMaterials: {
        elastic: { ...PHYSICS_MATERIAL_PRESETS.elastic, restitution: 0.8 }
      }
    });
    addTransform(world, tilemap, 0, 0);

    const player = spawnPlayer(world, 20, 50);
    world.mutateComponent(player, "Velocity", (v) => { v.vy = 200; });
    world.mutateComponent(player, "PlatformerGroundState", (g) => { g.isGrounded = false; });

    step(5);

    const bounceVel = world.getComponent(player, "Velocity")!;
    expect(bounceVel.vy).toBeLessThan(0);
  });

  it("Scenario 5: Jump and land on one-way platform from below", () => {
    const { world, step } = createIntegrationWorld();
    const tilemap = world.createEntity();
    world.addComponent(tilemap, {
      type: "Tilemap",
      data: [
        [0, 0, 0],
        [5, 5, 5],
        [0, 0, 0],
        [1, 1, 1]
      ],
      tileSize: 40,
      tileDefinitions: {
        1: { solid: true, materialId: "normal" },
        5: { solid: true, oneWay: true, materialId: "normal" }
      },
      physicsMaterials: { normal: PHYSICS_MATERIAL_PRESETS.normal }
    });
    addTransform(world, tilemap, 0, 0);

    const player = spawnPlayer(world, 40, 75);
    world.mutateComponent(player, "Velocity", (v) => { v.vy = -350; });
    world.mutateComponent(player, "PlatformerGroundState", (g) => { g.isGrounded = false; });

    // Step while rising through platform
    step(12);
    expect(world.getComponent(player, "Transform")?.y).toBeLessThan(35);

    // Gravity pulls down onto one-way platform
    step(25);

    const state = world.getComponent(player, "PlatformerGroundState")!;
    expect(state.isGrounded).toBe(true);
    expect(world.getComponent(player, "Transform")?.y).toBeLessThanOrEqual(30);
  });

  it("Scenario 6: Slide under ceiling -> blocked posture -> restoration of standing height", () => {
    const { world, step } = createIntegrationWorld();
    const tilemap = world.createEntity();
    world.addComponent(tilemap, {
      type: "Tilemap",
      data: [
        [1],
        [0],
        [1]
      ],
      tileSize: 40,
      tileDefinitions: { 1: { solid: true, materialId: "normal" } },
      physicsMaterials: { normal: PHYSICS_MATERIAL_PRESETS.normal }
    });
    addTransform(world, tilemap, 0, 0);

    const player = spawnPlayer(world, 20, 55, { halfW: 8, halfH: 25 });
    world.mutateComponent(player, "Velocity", (v) => { v.vx = 180; });

    // Enter slide while grounded
    world.mutateComponent(player, "PlatformerInput", (inp) => { inp.slideHeld = true; });
    step(2);
    expect(world.getComponent(player, "PlatformerPosture")?.current).toBe("sliding");

    // Release slide key under the ceiling: posture should enter blocked
    world.mutateComponent(player, "PlatformerInput", (inp) => { inp.slideHeld = false; });
    step(15);
    expect(world.getComponent(player, "PlatformerPosture")?.current).toBe("blocked");

    // Remove ceiling obstruction: posture should recover to standing
    world.mutateComponent(tilemap, "Tilemap", (m) => {
      m.data[0][0] = 0;
    });
    step(2);

    expect(world.getComponent(player, "PlatformerPosture")?.current).toBe("standing");
    const restoredShape = world.getComponent(player, "Collider2D")?.shape;
    const restoredHalfH = restoredShape && "halfHeight" in restoredShape ? (restoredShape as LocalAabb).halfHeight : 0;
    expect(restoredHalfH).toBe(25);
  });

  it("Scenario 7: Moving platform passenger transport -> jump inherits platform velocity", () => {
    const { world, step } = createIntegrationWorld();
    const platform = world.createEntity();
    addTransform(world, platform, 100, 200);
    world.addComponent(platform, { type: "Velocity", vx: 60, vy: 15, angularVelocity: 0 });
    world.addComponent(platform, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: 35, halfHeight: 10 },
      layer: 2,
      mask: 0xffff,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    });
    world.addComponent(platform, {
      type: "MovingPlatform",
      pattern: "sine",
      startX: 100,
      startY: 200,
      amplitudeX: 80,
      amplitudeY: 0,
      frequency: 0.25,
      elapsed: 0
    });

    const player = spawnPlayer(world, 100, 175);
    world.mutateComponent(player, "PlatformerGroundState", (g) => {
      g.isGrounded = true;
      g.carrierEntity = platform;
    });

    step(5);
    expect(world.getComponent(player, "PlatformerGroundState")?.carrierEntity).toBe(platform);
    expect(world.getComponent(player, "Transform")?.x).toBeCloseTo(
      world.getComponent(platform, "Transform")!.x,
      1
    );

    world.mutateComponent(player, "PlatformerInput", (inp) => {
      inp.jumpPressed = true;
      inp.jumpHeld = true;
    });
    step(1);

    const postJumpVel = world.getComponent(player, "Velocity")!;
    expect(postJumpVel.vy).toBeLessThan(-200);
    expect(postJumpVel.vx).toBeGreaterThanOrEqual(30);
  });

  it("Scenario 8: Moving platform direction reversal and passenger detachment", () => {
    const { world, step } = createIntegrationWorld();
    const platform = world.createEntity();
    addTransform(world, platform, 100, 200);
    world.addComponent(platform, { type: "Velocity", vx: -50, vy: 0, angularVelocity: 0 });
    world.addComponent(platform, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: 30, halfHeight: 10 },
      layer: 2,
      mask: 0xffff,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    });
    world.addComponent(platform, {
      type: "MovingPlatform",
      pattern: "sine",
      startX: 100,
      startY: 200,
      amplitudeX: 50,
      amplitudeY: 0,
      frequency: 0.5,
      elapsed: 0
    });

    const player = spawnPlayer(world, 100, 175);
    world.mutateComponent(player, "PlatformerGroundState", (g) => {
      g.isGrounded = true;
      g.carrierEntity = platform;
    });

    step(15);
    expect(world.getComponent(player, "Transform")?.x).toBeCloseTo(
      world.getComponent(platform, "Transform")!.x,
      1
    );
  });
});
