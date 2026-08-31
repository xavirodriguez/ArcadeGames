import { World } from "../src/ecs/World";
import { CoreComponentRegistry, RunState } from "../src/ecs/CoreComponents";
import { EventBus } from "../src/events/EventBus";
import { BlueprintRegistry } from "../src/ecs/BlueprintRegistry";
import { CollectibleSystem } from "../src/systems/CollectibleSystem";
import { CheckpointSystem } from "../src/systems/CheckpointSystem";
import { DeathSystem } from "../src/systems/DeathSystem";
import { RespawnSystem } from "../src/systems/RespawnSystem";
import { EnemySensorSystem } from "../src/systems/EnemySensorSystem";
import { StateMachineSystem } from "../src/systems/StateMachineSystem";
import { registerEnemyStateMachines } from "../src/systems/EnemyBehaviorRegistry";
import { SegmentGenerator, SegmentTemplate, LevelPlan } from "../src/systems/SegmentGenerator";

describe("Platformer Level 3 - Content & Design Tests", () => {
  let world: World<CoreComponentRegistry>;
  let eventBus: EventBus;
  let runState: RunState;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    eventBus = new EventBus();
    world.setResource("EventBus", eventBus);

    // Initialize global RunState
    runState = {
      attempt: 1,
      lives: 3,
      activeCheckpoint: null,
      elapsedTime: 0,
      deaths: 0,
      collectedPermanentIds: [],
      collectedTemporalIds: []
    };
    world.setResource("RunState", runState);

    // Register empty Blueprints Registry
    const blueprints = new BlueprintRegistry<CoreComponentRegistry, any, any>();
    world.setResource("BlueprintRegistry", blueprints);

    // Register basic blueprints for testing
    blueprints.register("enemy" as any, {
      spawn: (w: any, entity: number, args: any) => {
        w.addComponent(entity, {
          type: "Transform",
          x: args.x,
          y: args.y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          worldX: args.x,
          worldY: args.y,
          worldRotation: 0,
          worldScaleX: 1,
          worldScaleY: 1,
          dirty: false
        });
        w.addComponent(entity, {
          type: "Velocity",
          vx: 0,
          vy: 0,
          angularVelocity: 0
        });
      }
    });

    blueprints.register("collectible" as any, {
      spawn: (w: any, entity: number, args: any) => {
        w.addComponent(entity, {
          type: "Transform",
          x: args.x,
          y: args.y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          worldX: args.x,
          worldY: args.y,
          worldRotation: 0,
          worldScaleX: 1,
          worldScaleY: 1,
          dirty: false
        });
        w.addComponent(entity, {
          type: "Collectible",
          kind: args.kind,
          value: args.value,
          persistent: args.persistent,
          collectOnce: args.collectOnce,
          id: args.id
        });
      }
    });

    blueprints.register("tilemap" as any, {
      spawn: (w: any, entity: number, args: any) => {
        w.addComponent(entity, {
          type: "Tilemap",
          data: args.data,
          tileSize: 40,
          tileDefinitions: args.tileDefinitions
        });
        w.addComponent(entity, {
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
      }
    });
  });

  describe("Checkpoints, Reinicios y Muerte", () => {
    it("should activate a checkpoint when the player overlaps a RespawnPoint", () => {
      const checkpointSys = new CheckpointSystem();

      const player = world.createEntity();
      world.addComponent(player, {
        type: "PlatformerInput",
        moveDir: 0,
        jumpPressed: false,
        jumpHeld: false,
        jumpReleased: false
      });
      world.addComponent(player, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      });

      const checkpoint = world.createEntity();
      world.addComponent(checkpoint, {
        type: "RespawnPoint",
        x: 300,
        y: 200,
        checkpointId: "checkpoint_alpha"
      });

      // Simulate physical overlap inside CollisionEvents
      world.mutateComponent(player, "CollisionEvents", (events) => {
        events.activeTriggers.push(checkpoint);
      });

      let eventPayload: any = null;
      eventBus.on("CheckpointActivated", (payload) => {
        eventPayload = payload;
      });

      checkpointSys.update(world, 0.1);
      eventBus.flushDeferred();

      expect(runState.activeCheckpoint).toBe("checkpoint_alpha");
      expect(eventPayload).not.toBeNull();
      expect(eventPayload.checkpointId).toBe("checkpoint_alpha");
    });

    it("should detect death, mark player with Dead component, emit PlayerDied, and update RunState", () => {
      const deathSys = new DeathSystem();

      const player = world.createEntity();
      world.addComponent(player, {
        type: "PlatformerInput",
        moveDir: 0,
        jumpPressed: false,
        jumpHeld: false,
        jumpReleased: false
      });
      world.addComponent(player, {
        type: "Transform",
        x: 100,
        y: 1050, // lower than deathPlaneY (1000)
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 1050,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });

      let diedPayload: any = null;
      eventBus.on("PlayerDied", (payload) => {
        diedPayload = payload;
      });

      deathSys.update(world, 0.1);
      eventBus.flushDeferred();
      world.flush(); // Flush commands to add Dead component

      expect(world.hasComponent(player, "Dead")).toBe(true);
      expect(runState.deaths).toBe(1);
      expect(runState.lives).toBe(2);
      expect(runState.attempt).toBe(2);
      expect(diedPayload).not.toBeNull();
      expect(diedPayload.playerEntity).toBe(player);
    });

    it("should respawn player at checkpoint, restore health, clear velocity, and recreate Respawnables deterministically", () => {
      const respawnSys = new RespawnSystem();

      // Set active checkpoint
      runState.activeCheckpoint = "checkpoint_beta";

      // Register checkpoint coordinates
      const cpEntity = world.createEntity();
      world.addComponent(cpEntity, {
        type: "RespawnPoint",
        x: 500,
        y: 400,
        checkpointId: "checkpoint_beta"
      });

      // Player entity currently Dead
      const player = world.createEntity();
      world.addComponent(player, {
        type: "PlatformerInput",
        moveDir: 0,
        jumpPressed: false,
        jumpHeld: false,
        jumpReleased: false
      });
      world.addComponent(player, {
        type: "Transform",
        x: 100,
        y: 1050,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 100,
        worldY: 1050,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(player, {
        type: "Velocity",
        vx: 150,
        vy: -200,
        angularVelocity: 0
      });
      world.addComponent(player, {
        type: "Health",
        current: 0,
        max: 3
      });
      world.addComponent(player, {
        type: "Dead"
      });

      // Create a Respawnable enemy entity
      const enemy = world.createEntity();
      world.addComponent(enemy, {
        type: "Respawnable",
        blueprintKey: "enemy",
        initialArgs: { x: 600, y: 400 }
      });

      // Run respawn system
      respawnSys.update(world, 0.1);
      world.flush();

      // Player checks
      const trans = world.getComponent(player, "Transform")!;
      const vel = world.getComponent(player, "Velocity")!;
      const health = world.getComponent(player, "Health")!;

      expect(trans.x).toBe(500);
      expect(trans.y).toBe(400);
      expect(vel.vx).toBe(0);
      expect(vel.vy).toBe(0);
      expect(health.current).toBe(3);
      expect(world.hasComponent(player, "Dead")).toBe(false);

      // Check that the old enemy was removed and a new one was spawned from the blueprint
      expect(world.hasEntity(enemy)).toBe(false);

      const respawnables = world.query("Respawnable");
      expect(respawnables.length).toBe(1);

      const newEnemy = respawnables[0];
      const enemyTrans = world.getComponent(newEnemy, "Transform")!;
      expect(enemyTrans.x).toBe(600);
      expect(enemyTrans.y).toBe(400);
    });
  });

  describe("Coleccionables, Secretos y Progreso", () => {
    it("should pick up non-persistent and persistent collectibles and separate permanent vs temporal progress", () => {
      const collSys = new CollectibleSystem();

      const player = world.createEntity();
      world.addComponent(player, {
        type: "PlatformerInput",
        moveDir: 0,
        jumpPressed: false,
        jumpHeld: false,
        jumpReleased: false
      });
      world.addComponent(player, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      });

      // Persistent collectible
      const persistentColl = world.createEntity();
      world.addComponent(persistentColl, {
        type: "Collectible",
        kind: "secret_orb",
        value: 100,
        persistent: true,
        collectOnce: true,
        id: "persistent_orb_1"
      });

      // Temporal collectible
      const temporalColl = world.createEntity();
      world.addComponent(temporalColl, {
        type: "Collectible",
        kind: "coin",
        value: 10,
        persistent: false,
        collectOnce: false,
        id: "temp_coin_1"
      });

      // Emulate collision with persistent collectible
      world.mutateComponent(player, "CollisionEvents", (events) => {
        events.activeTriggers.push(persistentColl);
      });

      collSys.update(world, 0.1);
      world.flush();

      expect(runState.collectedPermanentIds).toContain("persistent_orb_1");
      expect(runState.collectedTemporalIds).not.toContain("temp_coin_1");
      expect(world.hasEntity(persistentColl)).toBe(false);

      // Emulate collision with temporal collectible
      world.mutateComponent(player, "CollisionEvents", (events) => {
        events.activeTriggers = [temporalColl];
      });

      collSys.update(world, 0.1);
      world.flush();

      expect(runState.collectedTemporalIds).toContain("temp_coin_1");
      expect(world.hasEntity(temporalColl)).toBe(false);
    });
  });

  describe("Enemies, Sensors & State Machines", () => {
    it("should verify EnemySensorSystem scanning and StateMachine transitions for Patrol arquetype", () => {
      const sensorSys = new EnemySensorSystem();
      const smSystem = new StateMachineSystem();
      registerEnemyStateMachines(world);

      // Create Player
      const player = world.createEntity();
      world.addComponent(player, {
        type: "PlatformerInput",
        moveDir: 0,
        jumpPressed: false,
        jumpHeld: false,
        jumpReleased: false
      });
      world.addComponent(player, {
        type: "Transform",
        x: 180, // Near the enemy!
        y: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 180,
        worldY: 100,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });

      // Create Patrol Enemy
      const enemy = world.createEntity();
      world.addComponent(enemy, {
        type: "Transform",
        x: 150,
        y: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 150,
        worldY: 100,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: false
      });
      world.addComponent(enemy, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      });
      world.addComponent(enemy, {
        type: "Enemy",
        kind: "patrol"
      });
      world.addComponent(enemy, {
        type: "Patrol",
        startX: 100,
        endX: 200,
        direction: 1,
        patrolSpeed: 50
      });
      world.addComponent(enemy, {
        type: "PlayerSensor",
        visionRange: 100,
        detectedPlayerEntity: undefined
      });
      world.addComponent(enemy, {
        type: "StateMachine",
        currentState: "Patrol",
        elapsedInState: 0,
        data: {
          patrolSpeed: 50,
          alertDuration: 0.2,
          windupDuration: 0.2,
          attackDuration: 0.2,
          recoveryDuration: 0.2
        },
        machineId: "patrol",
        elapsedMs: 0
      });

      // 1. Run sensor system -> should detect player (distance 30 <= 100)
      sensorSys.update(world, 0.1);
      const sensor = world.getComponent(enemy, "PlayerSensor")!;
      expect(sensor.detectedPlayerEntity).toBe(player);

      // 2. Update SM -> Patrol state transition to Alert because player is detected
      smSystem.update(world, 0.05);
      let sm = world.getComponent(enemy, "StateMachine")!;

      // 3. Wait alertDuration (0.2s) -> Alert transition to Windup
      smSystem.update(world, 0.2);
      sm = world.getComponent(enemy, "StateMachine")!;
      expect(sm.currentState).toBe("Windup");

      // 4. Wait windupDuration (0.2s) -> Windup transition to Attack
      smSystem.update(world, 0.2);
      sm = world.getComponent(enemy, "StateMachine")!;
      expect(sm.currentState).toBe("Attack");
      let vel = world.getComponent(enemy, "Velocity")!;
      expect(vel.vx).toBe(50 * 1.5); // Lunges forward!

      // 5. Wait attackDuration (0.2s) -> Attack transition to Recovery
      smSystem.update(world, 0.2);
      sm = world.getComponent(enemy, "StateMachine")!;
      expect(sm.currentState).toBe("Recovery");
      vel = world.getComponent(enemy, "Velocity")!;
      expect(vel.vx).toBe(0); // Recovers and stops!
    });
  });

  describe("Modular Segments and Generation Plan", () => {
    it("should generate deterministic plans and align entry and exit points correctly", () => {
      const templates: SegmentTemplate[] = [
        {
          id: "intro_segment",
          entry: { x: 0, y: 5 },
          exit: { x: 10, y: 5 },
          bounds: { width: 10, height: 10 },
          difficulty: 1,
          tags: ["intro"],
          tileData: [
            [0, 0, 0],
            [1, 1, 1]
          ],
          spawnPoints: [
            { x: 2, y: 1, type: "enemy" }
          ]
        },
        {
          id: "combat_segment",
          entry: { x: 0, y: 5 },
          exit: { x: 12, y: 5 },
          bounds: { width: 12, height: 10 },
          difficulty: 2,
          tags: ["combat"],
          tileData: [
            [0, 0, 0],
            [1, 1, 1]
          ],
          spawnPoints: [
            { x: 3, y: 1, type: "enemy" }
          ]
        }
      ];

      const grammar = ["intro", "combat"];
      const seed = 12345;

      const plan: LevelPlan = SegmentGenerator.generatePlan(templates, grammar, seed);

      expect(plan.seed).toBe(seed);
      expect(plan.segments.length).toBe(2);

      // Check entry/exit alignment
      const first = plan.segments[0];
      const second = plan.segments[1];

      // exit of first must align with entry of second
      const firstGlobalExitX = first.offsetX + first.exit.x;
      const firstGlobalExitY = first.offsetY + first.exit.y;

      const secondGlobalEntryX = second.offsetX + second.entry.x;
      const secondGlobalEntryY = second.offsetY + second.entry.y;

      expect(secondGlobalEntryX).toBe(firstGlobalExitX);
      expect(secondGlobalEntryY).toBe(firstGlobalExitY);

      // Verify instantiation spawns the LevelPlan accurately
      SegmentGenerator.instantiatePlan(world, plan, 40, {});
      world.flush();

      const tilemaps = world.query("Tilemap");
      expect(tilemaps.length).toBe(1);

      const respawnables = world.query("Respawnable");
      expect(respawnables.length).toBe(2); // Spawns of spawnPoints
    });
  });
});
