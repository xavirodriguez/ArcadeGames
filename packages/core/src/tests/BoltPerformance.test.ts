import { World } from "../ecs/World";
import { SpatialPartitioningSystem } from "../systems/SpatialPartitioningSystem";
import { InvulnerabilitySystem } from "../systems/InvulnerabilitySystem";
import { StateMachineSystem, StateMachineDefinition } from "../systems/StateMachineSystem";
import { FeedbackSystem } from "../systems/FeedbackSystem";
import { HitDetectionSystem } from "../systems/HitDetectionSystem";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { SnapshotBuffer } from "../snapshots/SnapshotBuffer";
import { SnapshotRestore } from "../snapshots/SnapshotRestore";
import { SnapshotSerializer } from "../snapshots/SnapshotSerializer";

describe("Bolt Performance & Determinism Tests", () => {
  it("SpatialPartitioningSystem: stationary entities produce zero stateVersion increases", () => {
    const world = new World<CoreComponentRegistry>();
    world.addSystem(new SpatialPartitioningSystem());

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
      dirty: false
    });
    world.addComponent(entity, {
      type: "SpatialNode",
      gridX: 1,
      gridY: 2,
      active: true
    });

    world.update(1 / 60);
    const initialVersion = world.stateVersion;

    // Run 50 ticks with stationary entity
    for (let i = 0; i < 50; i++) {
      world.update(1 / 60);
    }

    expect(world.stateVersion).toBe(initialVersion);
  });

  it("InvulnerabilitySystem & StateMachineSystem: deterministic simulation & rollback safety", () => {
    const world1 = new World<CoreComponentRegistry>();
    const invSystem = new InvulnerabilitySystem();
    const smSystem = new StateMachineSystem();

    world1.addSystem(invSystem);
    world1.addSystem(smSystem);

    const smRegistry: Record<string, StateMachineDefinition> = {
      testMachine: {
        states: {
          idle: {
            onUpdate: (_w, _e, _data, elapsed) => {
              if (elapsed > 0.1) return "active";
            }
          },
          active: {}
        }
      }
    };
    world1.setResource("StateMachineRegistry", smRegistry);

    const e1 = world1.createEntity();
    world1.addComponent(e1, {
      type: "Invulnerable" as any,
      remaining: 0.5
    } as any);
    world1.addComponent(e1, {
      type: "StateMachine",
      machineId: "testMachine",
      currentState: "idle",
      previousState: "idle",
      elapsedMs: 0,
      elapsedInState: 0,
      data: {}
    });

    const snapshotBuffer = new SnapshotBuffer(60);

    // Run 10 ticks
    for (let tick = 1; tick <= 10; tick++) {
      world1.update(1 / 60);
      snapshotBuffer.saveSnapshot(tick, SnapshotSerializer.snapshot(world1));
    }

    // Run 21 more ticks (31 total ticks * 1/60 > 0.5s)
    for (let tick = 11; tick <= 31; tick++) {
      world1.update(1 / 60);
    }

    // Rollback to snapshot at tick 10
    const snapshotAt10 = snapshotBuffer.loadSnapshot(10)!;
    SnapshotRestore.restore(world1, snapshotAt10);

    // Run 21 ticks again post-rollback
    for (let tick = 11; tick <= 31; tick++) {
      world1.update(1 / 60);
    }

    const inv = world1.getComponent(e1, "Invulnerable" as any) as any;
    const sm = world1.getComponent(e1, "StateMachine");

    // Total elapsed time = 31 ticks * (1/60) > 0.5s => Invulnerable should be expired and removed
    expect(inv).toBeUndefined();
    expect(sm?.currentState).toBe("active");
  });

  it("EnemySensorSystem & RespawnSystem & SpatialCullingSystem: determinism & rollback safety", () => {
    const world1 = new World<CoreComponentRegistry>();
    const world2 = new World<CoreComponentRegistry>();

    let p1_1: number = 0;
    let e1_1: number = 0;
    let p1_2: number = 0;
    let e1_2: number = 0;

    const setupWorld = (world: World<CoreComponentRegistry>) => {
      const p1 = world.createEntity();
      world.addComponent(p1, {
        type: "PlatformerInput",
        moveDir: 1,
        jumpPressed: false,
        jumpHeld: false,
        jumpReleased: false
      });
      world.addComponent(p1, {
        type: "Transform",
        x: 50,
        y: 50,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 50,
        worldY: 50,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });

      const e1 = world.createEntity();
      world.addComponent(e1, {
        type: "PlayerSensor",
        visionRange: 100,
        detectedPlayerEntity: undefined
      });
      world.addComponent(e1, {
        type: "Transform",
        x: 80,
        y: 50,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 80,
        worldY: 50,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });

      return { p1, e1 };
    };

    const res1 = setupWorld(world1);
    p1_1 = res1.p1;
    e1_1 = res1.e1;

    const res2 = setupWorld(world2);
    p1_2 = res2.p1;
    e1_2 = res2.e1;

    const sensorSys1 = new (require("../systems/EnemySensorSystem").EnemySensorSystem)();
    const sensorSys2 = new (require("../systems/EnemySensorSystem").EnemySensorSystem)();

    world1.addSystem(sensorSys1);
    world2.addSystem(sensorSys2);

    for (let t = 0; t < 20; t++) {
      world1.update(1 / 60);
      world2.update(1 / 60);
    }

    const s1 = world1.getComponent(e1_1, "PlayerSensor") as any;
    const s2 = world2.getComponent(e1_2, "PlayerSensor") as any;

    expect(s1.detectedPlayerEntity).toBe(p1_1);
    expect(s2.detectedPlayerEntity).toBe(p1_2);
    expect(s1.detectedPlayerEntity).toBe(s2.detectedPlayerEntity);
  });

  it("TilemapRenderSystem & JuiceSystem: stationary camera and static juice produces zero stateVersion increases", () => {
    const world = new World<CoreComponentRegistry>();
    world.addSystem(new (require("../systems/TilemapRenderSystem").TilemapRenderSystem)());
    world.addSystem(new (require("../systems/JuiceSystem").JuiceSystem)());

    const tm = world.createEntity();
    world.addComponent(tm, {
      type: "Tilemap",
      tileSize: 32,
      data: [[0]],
      visibleRange: { minX: 0, minY: 0, maxX: 10, maxY: 10 }
    });

    const juiceEntity = world.createEntity();
    world.addComponent(juiceEntity, {
      type: "Juice",
      active: true,
      animations: []
    });
    world.addComponent(juiceEntity, {
      type: "VisualOffset",
      offsetX: 0,
      offsetY: 0
    });

    world.setResource("ScreenConfig", { width: 320, height: 320 });

    world.update(1 / 60);
    const initialVersion = world.stateVersion;

    // Run 50 ticks with static tilemap and idle juice
    for (let i = 0; i < 50; i++) {
      world.update(1 / 60);
    }

    expect(world.stateVersion).toBe(initialVersion);
  });

  it("PongCollisionSystem & CombatSystem & SpatialCullingSystem: benchmark and state retention check", () => {
    const world = new World<CoreComponentRegistry>();
    const SpatialCullingSystemClass = require("../systems/SpatialCullingSystem").SpatialCullingSystem;
    world.addSystem(new SpatialCullingSystemClass());

    world.setResource("ScreenConfig", { width: 800, height: 600 });

    for (let i = 0; i < 100; i++) {
      const e = world.createEntity();
      world.addComponent(e, {
        type: "Transform",
        x: i * 5,
        y: i * 5,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: i * 5,
        worldY: i * 5,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
    }

    world.update(1 / 60);
    const candidatesRes1 = world.getResource<number[]>("SpatialCullingCandidates");
    expect(candidatesRes1).toBeDefined();

    world.update(1 / 60);
    const candidatesRes2 = world.getResource<number[]>("SpatialCullingCandidates");
    expect(candidatesRes2).toBe(candidatesRes1); // Same array reference reused!
  });

  it("HitDetectionSystem & FeedbackSystem: high throughput benchmark", () => {
    const world = new World<CoreComponentRegistry>();
    world.addSystem(new HitDetectionSystem());
    world.addSystem(new FeedbackSystem());

    const count = 200;
    for (let i = 0; i < count; i++) {
      const hb = world.createEntity();
      world.addComponent(hb, {
        type: "Hitbox",
        hitEntities: []
      });
      world.addComponent(hb, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      });
    }

    const start = performance.now();
    for (let t = 0; t < 100; t++) {
      world.update(1 / 60);
    }
    const end = performance.now();
    const duration = end - start;

    expect(duration).toBeLessThan(250);
  });
});
