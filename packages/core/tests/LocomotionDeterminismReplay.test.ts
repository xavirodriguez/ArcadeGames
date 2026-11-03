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
import { SnapshotSerializer } from "../src/snapshots/SnapshotSerializer";
import { SnapshotRestore } from "../src/snapshots/SnapshotRestore";
import { hashAoS } from "../src/snapshots/SnapshotHash";

describe("Locomotion V1 Determinism, Snapshot Roundtrip and Replay", () => {
  const FIXED_DT = 1 / 60;

  function buildSimulationWorld() {
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

    function stepWorld() {
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

    // Set up course
    const tilemap = world.createEntity();
    world.addComponent(tilemap, {
      type: "Tilemap",
      data: [
        [1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 6, 0, 0, 0],
        [1, 1, 2, 2, 3, 5, 1]
      ],
      tileSize: 40,
      tileDefinitions: {
        1: { solid: true, materialId: "normal" },
        2: { solid: true, materialId: "ice" },
        3: { solid: true, materialId: "elastic" },
        5: { solid: true, oneWay: true, materialId: "normal" },
        6: {
          solid: true,
          slope: { start: { x: 0, y: 0 }, end: { x: 40, y: 40 } },
          materialId: "normal"
        }
      },
      physicsMaterials: {
        normal: PHYSICS_MATERIAL_PRESETS.normal,
        ice: PHYSICS_MATERIAL_PRESETS.ice,
        elastic: PHYSICS_MATERIAL_PRESETS.elastic
      }
    });
    world.addComponent(tilemap, {
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
    });

    // Moving platform
    const platform = world.createEntity();
    world.addComponent(platform, {
      type: "Transform",
      x: 100,
      y: 70,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 70,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(platform, { type: "Velocity", vx: 30, vy: 0, angularVelocity: 0 });
    world.addComponent(platform, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: 30, halfHeight: 8 },
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
      startY: 70,
      amplitudeX: 40,
      amplitudeY: 0,
      frequency: 0.3,
      elapsed: 0
    });

    // Player entity
    const player = world.createEntity();
    world.addComponent(player, {
      type: "Transform",
      x: 20,
      y: 55,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 20,
      worldY: 55,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(player, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
    world.addComponent(player, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: 8, halfHeight: 25 },
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

    const profile = LOCOMOTION_PROFILE_PRESETS.momentum;
    world.addComponent(player, {
      type: "LocomotionProfile",
      ground: { ...profile.ground },
      air: { ...profile.air },
      momentum: { ...profile.momentum },
      ...(profile.slide ? { slide: { ...profile.slide } } : {})
    });
    world.addComponent(player, {
      type: "PlatformerPosture",
      current: "standing",
      desired: "standing",
      standingHeight: 50,
      slidingHeight: 20,
      slideElapsed: 0,
      slideMinimumDuration: 0.1,
      slideMaximumDuration: 0.9
    });

    return { world, player, platform, stepWorld };
  }

  interface ScriptedInput {
    moveDir?: number;
    jumpPressed?: boolean;
    jumpHeld?: boolean;
    slideHeld?: boolean;
  }

  function applyScriptedInput(
    world: World<CoreComponentRegistry>,
    player: number,
    input: ScriptedInput
  ) {
    world.mutateComponent(player, "PlatformerInput", (inp) => {
      if (input.moveDir !== undefined) inp.moveDir = input.moveDir;
      if (input.jumpPressed !== undefined) inp.jumpPressed = input.jumpPressed;
      if (input.jumpHeld !== undefined) inp.jumpHeld = input.jumpHeld;
      if (input.slideHeld !== undefined) inp.slideHeld = input.slideHeld;
    });
  }

  it("produces identical final state and snapshot hash for identical input stream (Replay determinism)", () => {
    const inputScript: Record<number, ScriptedInput> = {
      0: { moveDir: 1 },
      10: { slideHeld: true },
      20: { slideHeld: false },
      30: { jumpPressed: true, jumpHeld: true },
      35: { jumpPressed: false, jumpHeld: true },
      45: { jumpHeld: false },
      60: { moveDir: -1 }
    };

    const runSimulation = () => {
      const sim = buildSimulationWorld();
      for (let tick = 0; tick < 80; tick++) {
        if (inputScript[tick]) {
          applyScriptedInput(sim.world, sim.player, inputScript[tick]);
        }
        sim.stepWorld();
      }
      return {
        hash: hashAoS(SnapshotSerializer.snapshot(sim.world)),
        playerPos: { ...sim.world.getComponent(sim.player, "Transform")! },
        playerVel: { ...sim.world.getComponent(sim.player, "Velocity")! },
        platformPos: { ...sim.world.getComponent(sim.platform, "Transform")! }
      };
    };

    const firstRun = runSimulation();
    const secondRun = runSimulation();

    expect(firstRun.hash).toBe(secondRun.hash);
    expect(firstRun.playerPos.x).toBeCloseTo(secondRun.playerPos.x, 8);
    expect(firstRun.playerPos.y).toBeCloseTo(secondRun.playerPos.y, 8);
    expect(firstRun.playerVel.vx).toBeCloseTo(secondRun.playerVel.vx, 8);
    expect(firstRun.playerVel.vy).toBeCloseTo(secondRun.playerVel.vy, 8);
    expect(firstRun.platformPos.x).toBeCloseTo(secondRun.platformPos.x, 8);
  });

  it("preserves continuous simulation state when snapshot is captured during jump and restored", () => {
    const inputScript: Record<number, ScriptedInput> = {
      0: { moveDir: 1 },
      15: { jumpPressed: true, jumpHeld: true },
      20: { jumpPressed: false, jumpHeld: false }
    };

    // Continuous run
    const continuousSim = buildSimulationWorld();
    let snapshotMidJump = SnapshotSerializer.snapshot(continuousSim.world);

    for (let tick = 0; tick < 50; tick++) {
      if (inputScript[tick]) {
        applyScriptedInput(continuousSim.world, continuousSim.player, inputScript[tick]);
      }
      continuousSim.stepWorld();
      if (tick === 25) {
        snapshotMidJump = SnapshotSerializer.snapshot(continuousSim.world);
      }
    }
    const continuousEndHash = hashAoS(SnapshotSerializer.snapshot(continuousSim.world));

    // Restored run from tick 25
    const restoredWorld = new World<CoreComponentRegistry>();
    SnapshotRestore.restore(restoredWorld, snapshotMidJump);

    // Reconstruct systems for the restored world
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

    const restoredPlayer = restoredWorld.query("PlatformerInput")[0];

    for (let tick = 26; tick < 50; tick++) {
      if (inputScript[tick]) {
        applyScriptedInput(restoredWorld, restoredPlayer, inputScript[tick]);
      }
      movingPlatformSys.update(restoredWorld, FIXED_DT);
      slideSys.update(restoredWorld, FIXED_DT);
      movementSys.update(restoredWorld, FIXED_DT);
      gravitySys.update(restoredWorld, FIXED_DT);
      coyoteSys.update(restoredWorld, FIXED_DT);
      jumpSys.update(restoredWorld, FIXED_DT);
      carrySys.update(restoredWorld, FIXED_DT);
      integrateSys.update(restoredWorld, FIXED_DT);
      collisionSys2D.update(restoredWorld, FIXED_DT);
      tileCollisionSys.update(restoredWorld, FIXED_DT);
    }
    const restoredEndHash = hashAoS(SnapshotSerializer.snapshot(restoredWorld));

    expect(restoredEndHash).toBe(continuousEndHash);
  });

  it("preserves continuous simulation state when snapshot is captured during slide and restored", () => {
    const inputScript: Record<number, ScriptedInput> = {
      0: { moveDir: 1 },
      10: { slideHeld: true },
      25: { slideHeld: false }
    };

    const continuousSim = buildSimulationWorld();
    let snapshotMidSlide = SnapshotSerializer.snapshot(continuousSim.world);

    for (let tick = 0; tick < 40; tick++) {
      if (inputScript[tick]) {
        applyScriptedInput(continuousSim.world, continuousSim.player, inputScript[tick]);
      }
      continuousSim.stepWorld();
      if (tick === 15) {
        snapshotMidSlide = SnapshotSerializer.snapshot(continuousSim.world);
      }
    }
    const continuousEndHash = hashAoS(SnapshotSerializer.snapshot(continuousSim.world));

    const restoredWorld = new World<CoreComponentRegistry>();
    SnapshotRestore.restore(restoredWorld, snapshotMidSlide);

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

    const restoredPlayer = restoredWorld.query("PlatformerInput")[0];

    for (let tick = 16; tick < 40; tick++) {
      if (inputScript[tick]) {
        applyScriptedInput(restoredWorld, restoredPlayer, inputScript[tick]);
      }
      movingPlatformSys.update(restoredWorld, FIXED_DT);
      slideSys.update(restoredWorld, FIXED_DT);
      movementSys.update(restoredWorld, FIXED_DT);
      gravitySys.update(restoredWorld, FIXED_DT);
      coyoteSys.update(restoredWorld, FIXED_DT);
      jumpSys.update(restoredWorld, FIXED_DT);
      carrySys.update(restoredWorld, FIXED_DT);
      integrateSys.update(restoredWorld, FIXED_DT);
      collisionSys2D.update(restoredWorld, FIXED_DT);
      tileCollisionSys.update(restoredWorld, FIXED_DT);
    }
    const restoredEndHash = hashAoS(SnapshotSerializer.snapshot(restoredWorld));

    expect(restoredEndHash).toBe(continuousEndHash);
  });
});
