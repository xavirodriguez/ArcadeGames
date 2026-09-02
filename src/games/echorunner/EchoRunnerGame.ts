/* eslint-disable @typescript-eslint/no-require-imports */
import {
  BaseGame,
  World,
  System,
  SystemPhase,
  BlueprintDefinition,
  CoreComponentRegistry,
  WebAudioPlayer,
  EventBus,
  PhysicsIntegrateSystem,
  PlatformerMovementSystem,
  PlatformerGravitySystem,
  TileCollisionSystem,
  PlatformerCoyoteSystem,
  MovingPlatformSystem,
  PlatformCarrySystem,
  HitDetectionSystem,
  JuiceSystem,
  ScreenShakeSystem,
  RenderUpdateSystem,
  Camera2DSystem,
  TilemapRenderSystem,
  Renderer,
  TransformComponent,
  VelocityComponent,
  Collider2DComponent,
  TagComponent,
  HealthComponent,
  RenderComponent,
  RunState,
  CheckpointSystem,
  DeathSystem,
  RespawnSystem,
  CollectibleSystem,
  EnemySensorSystem,
  StateMachineSystem,
  registerEnemyStateMachines,
  SegmentTemplate,
  SegmentGenerator,
  LevelPlan,
  TTLComponent,
  EntityBuilder
} from "@tiny-aster/core";
import { drawEchoBackground, drawEchoPlayer, drawMemoryFragment, drawMemoryCore, drawCheckpointNode, drawPulseAttack, drawSentinel, drawHopper, drawWatcher, drawCharger } from "./rendering/EchoRunnerCanvasVisuals";
import { EchoRunnerInput, EchoRunnerGameState, ECHO_CONFIG } from "./types/EchoRunnerTypes";
import { PlatformerInputSystem } from "../platformer/systems/PlatformerInputSystem";
import { ArcadeEntityBuilder } from "../shared/arcade";

/**
 * System that manages triggering the Pulse attack and processing its cooldowns.
 */
class EchoRunnerAttackSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const players = world.query("PlatformerInput", "Transform");
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const input = world.getComponent(player, "PlatformerInput") as any;
      const trans = world.getComponent(player, "Transform")!;

      // Manage attack cooldowns
      let cd = input.pulseCooldown ?? 0;
      if (cd > 0) {
        cd -= deltaTime;
        if (cd < 0) cd = 0;
        world.mutateComponent(player, "PlatformerInput" as any, (inp: any) => {
          inp.pulseCooldown = cd;
        });
      }

      // Read trigger and fire!
      if (input.pulsePressed && cd <= 0) {
        world.mutateComponent(player, "PlatformerInput" as any, (inp: any) => {
          inp.pulseCooldown = 0.45; // Cooldown of 0.45s
        });

        // Determine direction of attack
        const vel = world.getComponent(player, "Velocity")!;
        let dir = 1;
        if (vel.vx !== 0) {
          dir = vel.vx > 0 ? 1 : -1;
        } else if (trans.scaleX < 0) {
          dir = -1;
        }

        // Play sound
        const audio = world.getResource<any>("AudioPlayer") || (world as any).audio;
        if (audio) {
          audio.playSFX("pulse");
        }

        // Spawn pulse attack hitbox child entity via deferred commands
        world.commands.spawnFromBlueprint("pulse_hitbox" as any, {
          dir,
          x: trans.x,
          y: trans.y,
          parent: player
        } as any);

        // Clear pulse triggers
        world.mutateComponent(player, "PlatformerInput" as any, (inp: any) => {
          inp.pulsePressed = false;
        });
      }
    }
  }
}

/**
 * System that handles damage when player overlaps an enemy or spikes.
 */
class EchoRunnerDamageSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const players = world.query("PlatformerInput", "Health", "Transform");
    const enemies = world.query("Enemy", "Transform");

    for (let p = 0; p < players.length; p++) {
      const player = players[p];
      const pHealth = world.getComponent(player, "Health")!;
      const pTrans = world.getComponent(player, "Transform")!;

      // Handle invulnerability blink timers
      let invRemaining = pHealth.invulnerableRemaining ?? 0;
      if (invRemaining > 0) {
        invRemaining -= deltaTime;
        if (invRemaining < 0) invRemaining = 0;
        world.mutateComponent(player, "Health", (h) => {
          h.invulnerableRemaining = invRemaining;
        });
      }

      if (invRemaining > 0) continue;

      // Contact check with all active enemies
      let hit = false;
      for (let e = 0; e < enemies.length; e++) {
        const enemy = enemies[e];
        const eTrans = world.getComponent(enemy, "Transform")!;

        const dx = player !== undefined ? pTrans.x - eTrans.x : 0;
        const dy = player !== undefined ? pTrans.y - eTrans.y : 0;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If very close, trigger damage
        if (dist < 20) {
          hit = true;
          break;
        }
      }

      if (hit) {
        // Apply damage to player
        world.mutateComponent(player, "Health", (h) => {
          h.current--;
          h.invulnerableRemaining = 1.0; // 1 second invulnerability
        });
        world.mutateComponent(player, "Render", (r) => {
          r.hitFlashFrames = 8;
        });

        // Request Screenshake
        const cameras = world.query("Camera2D");
        for (let c = 0; c < cameras.length; c++) {
          world.commands.addComponent(cameras[c], {
            type: "ScreenShake",
            intensity: 12,
            duration: 0.25,
            remaining: 0.25
          });
        }

        // Play SFX
        const audio = world.getResource<any>("AudioPlayer") || (world as any).audio;
        if (audio) {
          audio.playSFX("hit");
        }
      }
    }
  }
}

export class EchoRunnerGame extends BaseGame<EchoRunnerGameState, EchoRunnerInput, CoreComponentRegistry, any, any> {
  public readonly gameId = "echorunner";
  private gameOver = false;
  private levelPlan!: LevelPlan;

  constructor(config: { seed?: number; gameOptions?: Record<string, unknown> } = {}) {
    super({
      pauseKey: "KeyP",
      restartKey: "KeyR",
      gameOptions: config.gameOptions,
      seed: config.seed,
      audio: new WebAudioPlayer()
    });
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.world.setResource("ScreenConfig", { width: ECHO_CONFIG.SCREEN_WIDTH, height: ECHO_CONFIG.SCREEN_HEIGHT });
    this.world.setResource("DeathPlaneY", 650);

    // Initializing high-fidelity RunState resource
    const runState: RunState = {
      attempt: 1,
      lives: 3,
      activeCheckpoint: null,
      elapsedTime: 0,
      deaths: 0,
      collectedPermanentIds: [],
      collectedTemporalIds: []
    };
    this.world.setResource("RunState", runState);
    this.world.setResource("AudioPlayer", this.audio);

    // Register blueprints
    this.blueprints.register("pulse_hitbox", {
      spawn: (world, entity, args: { dir: number; x: number; y: number; parent: number }) => {
        ArcadeEntityBuilder.fromEntity(world, entity)
          .withTransform({
            x: args.dir * 25,
            y: 0,
            worldX: args.x + args.dir * 25,
            worldY: args.y,
            parentEntity: args.parent
          })
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 15, halfHeight: 15 },
            layer: 1 << 3,
            mask: 1 << 4,
            isTrigger: true
          })
          .withCollisionEvents()
          .withTTL(0.15)
          .withRender({
            shape: "pulse_attack",
            size: 30,
            order: 5,
            rotation: args.dir < 0 ? Math.PI : 0
          });

        world.addComponent(entity, { type: "Hitbox", hitEntities: [] } as { type: string; [key: string]: unknown });
      }
    });

    this.blueprints.register("player", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        ArcadeEntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
            layer: 1,
            mask: 0xffff,
            enabled: true,
            isTrigger: false
          })
          .withRender({ shape: "player", size: 24, order: 2 })
          .withCollisionEvents();

        world.addComponent(entity, { type: "Health", current: 3, max: 3 } as HealthComponent);
        world.addComponent(entity, { type: "Tag", tags: ["TileCollider", "Player"] } as any);
        world.addComponent(entity, { type: "Hurtbox" } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
          type: "PlatformerMovementConfig",
          acceleration: ECHO_CONFIG.PLAYER_ACCEL,
          maxSpeed: ECHO_CONFIG.PLAYER_SPEED,
          deceleration: ECHO_CONFIG.PLAYER_DECEL,
          airAcceleration: ECHO_CONFIG.PLAYER_AIR_ACCEL,
          airDeceleration: ECHO_CONFIG.PLAYER_AIR_DECEL
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
          type: "PlatformerInput",
          moveDir: 0,
          jumpPressed: false,
          jumpHeld: false,
          jumpReleased: false,
          pulsePressed: false,
          pulseCooldown: 0
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
          type: "PlatformerGravityConfig",
          riseGravity: ECHO_CONFIG.RISE_GRAVITY,
          fallGravity: ECHO_CONFIG.FALL_GRAVITY,
          jumpVelocity: ECHO_CONFIG.PLAYER_JUMP_VEL,
          minJumpVelocity: ECHO_CONFIG.PLAYER_MIN_JUMP_VEL,
          apexThreshold: ECHO_CONFIG.APEX_THRESHOLD,
          apexGravityMultiplier: ECHO_CONFIG.APEX_GRAVITY_MULTIPLIER
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
          type: "PlatformerJumper",
          coyoteTimer: 0,
          jumpBufferTimer: 0,
          coyoteTimeMax: ECHO_CONFIG.COYOTE_TIME_MAX,
          jumpBufferMax: ECHO_CONFIG.JUMP_BUFFER_MAX
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "PlatformerGroundState", isGrounded: false, iceMultiplier: 1.0 } as { type: string; [key: string]: unknown });
      }
    });

    this.blueprints.register("tilemap", {
      spawn: (world, entity, args: { data: number[][]; tileDefinitions: any }) => {
        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: 0, y: 0 });

        world.addComponent(entity, {
          type: "Tilemap",
          data: args.data,
          tileSize: ECHO_CONFIG.TILE_SIZE,
          tileDefinitions: args.tileDefinitions
        } as { type: string; [key: string]: unknown });
      }
    });

    this.blueprints.register("collectible_fragment", {
      spawn: (world, entity, args: { x: number; y: number; id: string }) => {
        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withRender({ shape: "fragment", size: 16, order: 1 });

        world.addComponent(entity, {
          type: "Collectible",
          kind: "fragment",
          value: 10,
          persistent: false,
          collectOnce: false,
          id: args.id
        } as { type: string; [key: string]: unknown });
      }
    });

    this.blueprints.register("collectible_core", {
      spawn: (world, entity, args: { x: number; y: number; id: string }) => {
        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withRender({ shape: "core", size: 24, order: 1 });

        world.addComponent(entity, {
          type: "Collectible",
          kind: "core",
          value: 100,
          persistent: true,
          collectOnce: true,
          id: args.id
        } as { type: string; [key: string]: unknown });
      }
    });

    this.blueprints.register("checkpoint_node", {
      spawn: (world, entity, args: { x: number; y: number; id: string }) => {
        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withRender({ shape: "node", size: 32, order: 1 });

        world.addComponent(entity, {
          type: "RespawnPoint",
          x: args.x,
          y: args.y - 10,
          checkpointId: args.id
        } as { type: string; [key: string]: unknown });
      }
    });

    this.blueprints.register("enemy_sentinel", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withRender({ shape: "sentinel", size: 22, order: 2 });

        world.addComponent(entity, { type: "Health", current: 1, max: 1 } as HealthComponent);
        world.addComponent(entity, { type: "Enemy", kind: "patrol" } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "Patrol", startX: args.x - 80, endX: args.x + 80, direction: 1, patrolSpeed: 70 } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "GroundDetector", hasGroundAhead: true, hasWallAhead: false, sensorOffsetX: 15, sensorOffsetY: 20 } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "PlayerSensor", visionRange: 130, detectedPlayerEntity: undefined } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
          type: "StateMachine",
          currentState: "Patrol",
          elapsedInState: 0,
          data: { patrolSpeed: 70, alertDuration: 0.3, windupDuration: 0.3, attackDuration: 0.4, recoveryDuration: 0.5 },
          machineId: "patrol",
          elapsedMs: 0
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "Hurtbox" } as { type: string; [key: string]: unknown });
      }
    });

    this.blueprints.register("enemy_hopper", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withRender({ shape: "hopper", size: 24, order: 2 });

        world.addComponent(entity, { type: "Health", current: 1, max: 1 } as any);
        world.addComponent(entity, { type: "Enemy", kind: "jumper" } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "PlayerSensor", visionRange: 150, detectedPlayerEntity: undefined } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "PlatformerGroundState", isGrounded: false } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
          type: "StateMachine",
          currentState: "Idle",
          elapsedInState: 0,
          data: { idleDuration: 0.8, alertDuration: 0.3, windupDuration: 0.3, jumpVelocity: 260, patrolSpeed: 60, attackDuration: 0.8, recoveryDuration: 0.4 },
          machineId: "jumper",
          elapsedMs: 0
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "Hurtbox" } as { type: string; [key: string]: unknown });
      }
    });

    this.blueprints.register("enemy_charger", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withRender({ shape: "charger", size: 28, order: 2 });

        world.addComponent(entity, { type: "Health", current: 1, max: 1 } as any);
        world.addComponent(entity, { type: "Enemy", kind: "charger" } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "PlayerSensor", visionRange: 160, detectedPlayerEntity: undefined } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "GroundDetector", hasGroundAhead: true, hasWallAhead: false, sensorOffsetX: 15, sensorOffsetY: 20 } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
          type: "StateMachine",
          currentState: "Idle",
          elapsedInState: 0,
          data: { alertDuration: 0.4, windupDuration: 0.4, chargeSpeed: 200, attackDuration: 1.0, recoveryDuration: 0.8 },
          machineId: "charger",
          elapsedMs: 0
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "Hurtbox" } as { type: string; [key: string]: unknown });
      }
    });

    this.blueprints.register("moving_platform", {
      spawn: (world, entity, args: { x: number; y: number; ampX: number; ampY: number; freq: number }) => {
        ArcadeEntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 30, halfHeight: 10 },
            layer: 2
          })
          .withRender({ shape: "paddle", size: 60, order: 1 });

        world.addComponent(entity, {
          type: "MovingPlatform",
          pattern: "sine",
          startX: args.x,
          startY: args.y,
          amplitudeX: args.ampX,
          amplitudeY: args.ampY,
          frequency: args.freq,
          elapsed: 0
        } as { type: string; [key: string]: unknown });
      }
    });

    // Register State Machine Behaviors
    registerEnemyStateMachines(this.world);

    // Register all platformer & combat systems
    this.world.addSystem(new PlatformerInputSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new EchoRunnerAttackSystem(), { phase: SystemPhase.Input });

    this.world.addSystem(new PlatformerMovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerGravitySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerCoyoteSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovingPlatformSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformCarrySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new EnemySensorSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new StateMachineSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new CheckpointSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new DeathSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new RespawnSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new EchoRunnerDamageSystem(), { phase: SystemPhase.Simulation });

    this.world.addSystem(new PhysicsIntegrateSystem(), { phase: SystemPhase.Simulation, priority: -10 });

    this.world.addSystem(new TileCollisionSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CollectibleSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new HitDetectionSystem(), { phase: SystemPhase.Collision });

    // Presentation Systems
    this.world.addSystem(new Camera2DSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new TilemapRenderSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });

    await this.onPreloadAssets();

    // Listen to Hit Detection events
    const eventBus = this.world.getEventBus();
    if (eventBus) {
      eventBus.on("hitbox:hit", (event: any) => {
        const victim = event.victim;
        const attacker = event.attacker;

        // If player hits an enemy
        if (attacker && this.world.hasComponent(attacker, "PlatformerInput") && victim && this.world.hasComponent(victim, "Enemy")) {
          // Reduce health of enemy (most enemies have 1 health, so they explode!)
          if (this.world.hasComponent(victim, "Health")) {
            this.world.mutateComponent(victim, "Health", (h) => {
              h.current--;
            });
            this.world.mutateComponent(victim, "Render", (r) => {
              r.hitFlashFrames = 8;
            });

            // Play hit/kill sound
            this.audio.playSFX("explosion");

            // Trigger screenshake
            const cameras = this.world.query("Camera2D");
            for (let c = 0; c < cameras.length; c++) {
              this.world.commands.addComponent(cameras[c], {
                type: "ScreenShake",
                intensity: 6,
                duration: 0.15,
                remaining: 0.15
              });
            }

            // Remove enemy if health is <= 0
            const enemyHealth = this.world.getComponent(victim, "Health")!;
            if (enemyHealth.current <= 0) {
              this.world.commands.removeEntity(victim);
            }
          }
        }
      });

      // Listen for collectible pickup to play score sound
      eventBus.on("CollectiblePickedUp", () => {
        this.audio.playSFX("score");
      });

      // Listen for player died to play game over/death sound
      eventBus.on("PlayerDied", () => {
        this.audio.playSFX("game_over");
      });
    }
  }

  protected override async onInitializeEntities(): Promise<void> {
    try {
      const tileDefinitions = {
        1: { solid: true, kind: "normal" as const },
        2: { solid: true, kind: "ice" as const },
        3: { solid: true, kind: "bounce" as const, bounce: 1.5 },
        4: { solid: true, kind: "spike" as const },
        5: { solid: true, oneWay: true, kind: "normal" as const }
      };

    // Design 10 handcrafted beautiful, engaging segments
    const templates: SegmentTemplate[] = [
      {
        id: "intro_01",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 1,
        tags: ["intro"],
        tileData: [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawnPoints: [
          { x: 5, y: 10, type: "collectible_fragment", args: { id: "frag_01" } },
          { x: 10, y: 10, type: "collectible_fragment", args: { id: "frag_02" } },
          { x: 15, y: 10, type: "collectible_fragment", args: { id: "frag_03" } }
        ]
      },
      {
        id: "jump_01",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 1,
        tags: ["movement"],
        tileData: [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,5,5,5,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
          [1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1]
        ],
        spawnPoints: [
          { x: 9, y: 7, type: "collectible_fragment", args: { id: "frag_04" } },
          { x: 10, y: 7, type: "collectible_fragment", args: { id: "frag_05" } },
          { x: 11, y: 7, type: "collectible_fragment", args: { id: "frag_06" } }
        ]
      },
      {
        id: "combat_01",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 2,
        tags: ["combat"],
        tileData: [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawnPoints: [
          { x: 12, y: 10, type: "enemy_sentinel" },
          { x: 6, y: 10, type: "collectible_fragment", args: { id: "frag_07" } },
          { x: 16, y: 10, type: "collectible_fragment", args: { id: "frag_08" } }
        ]
      },
      {
        id: "hazards_01",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 3,
        tags: ["precision"],
        tileData: [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [1,1,1,1,0,0,4,4,4,0,0,5,5,5,0,0,1,1,1,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawnPoints: [
          { x: 13, y: 10, type: "collectible_fragment", args: { id: "frag_09" } }
        ]
      },
      {
        id: "checkpoint_01",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 1,
        tags: ["checkpoint"],
        tileData: [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawnPoints: [
          { x: 10, y: 10, type: "checkpoint_node", args: { id: "cp_node_1" } }
        ]
      },
      {
        id: "ice_and_bounce",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 3,
        tags: ["movement"],
        tileData: [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [1,1,1,2,2,2,3,3,3,2,2,2,1,1,1,1,1,1,1,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawnPoints: [
          { x: 4, y: 10, type: "collectible_fragment", args: { id: "frag_10" } },
          { x: 10, y: 10, type: "collectible_fragment", args: { id: "frag_11" } }
        ]
      },
      {
        id: "hopper_encounter",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 3,
        tags: ["combat"],
        tileData: [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawnPoints: [
          { x: 12, y: 10, type: "enemy_hopper" },
          { x: 8, y: 10, type: "collectible_fragment", args: { id: "frag_12" } }
        ]
      },
      {
        id: "moving_parts_01",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 4,
        tags: ["precision"],
        tileData: [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
          [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1]
        ],
        spawnPoints: [
          { x: 10, y: 10, type: "moving_platform", args: { ampX: 100, ampY: 0, freq: 0.3 } },
          { x: 10, y: 7, type: "collectible_fragment", args: { id: "frag_13" } }
        ]
      },
      {
        id: "charger_encounter",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 4,
        tags: ["combat"],
        tileData: [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawnPoints: [
          { x: 12, y: 10, type: "enemy_charger" },
          { x: 8, y: 10, type: "collectible_fragment", args: { id: "frag_14" } }
        ]
      },
      {
        id: "final_challenge",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 5,
        tags: ["reward"],
        tileData: [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawnPoints: [
          { x: 10, y: 10, type: "collectible_core", args: { id: "archive_core_1" } }
        ]
      }
    ];

    // Define Level Grammar sequence for the 10 levels
    const grammar = ["intro", "movement", "combat", "precision", "checkpoint", "movement", "combat", "precision", "combat", "reward"];

    // Generate deterministic Plan using SegmentGenerator
    const levelSeed = this.getSeed() || 41873;
    this.levelPlan = SegmentGenerator.generatePlan(templates, grammar, levelSeed);

    // Set world resources
    this.world.setResource("PlayerStartPoint", { x: 100, y: 350 });

    // Instantiate Plan
    SegmentGenerator.instantiatePlan(this.world, this.levelPlan, ECHO_CONFIG.TILE_SIZE, tileDefinitions);

    // Spawn Player
    const playerEntity = this.world.createEntity();
    const playerBp = this.blueprints.get("player");
    if (playerBp) {
      playerBp.spawn(this.world as any, playerEntity, { x: 100, y: 350 });
    } else {
      throw new Error("[EchoRunnerGame] Blueprint 'player' is not registered.");
    }

    // Spawn Main Follow Camera centered on player
    const cameraEntity = this.world.createEntity();
    this.world.addComponent(cameraEntity, {
      type: "Camera2D",
      zoom: 1.0,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      isMain: true,
      followEntity: playerEntity,
      lookAheadX: 80,
      smoothingX: 6.0,
      smoothingY: 6.0,
      verticalDeadzone: 45
    });

    // Flush all deferred commands from SegmentGenerator and blueprint spawns
    this.world.flush();
    } catch (err) {
      console.error("[EchoRunnerGame] Failed to initialize entities:", err);
      throw err instanceof Error ? err : new Error(`[EchoRunnerGame] Initialization error: ${String(err)}`);
    }
  }

  public override update(dt: number): void {
    const runState = this.world.getResource<any>("RunState");
    if (runState) {
      runState.elapsedTime += dt;
    }

    // Check level complete (Core collected)
    if (runState && runState.collectedPermanentIds.includes("archive_core_1")) {
      if (!this.gameOver) {
        this.gameOver = true;
        this.eventBus.emit("game:over", {
          state: this.getGameState()
        });
      }
    }

    this.world.update(dt);
  }

  public override setInputState(input: Partial<EchoRunnerInput>): void {
    const world = this.getWorld();
    const playerEntity = world.query("PlatformerInput" as any)[0];
    if (playerEntity !== undefined) {
      world.mutateComponent(playerEntity, "PlatformerInput" as any, (inputComp: any) => {
        const left = input.moveLeft !== undefined ? !!input.moveLeft : (inputComp._moveLeft ?? (inputComp.moveDir === -1));
        const right = input.moveRight !== undefined ? !!input.moveRight : (inputComp._moveRight ?? (inputComp.moveDir === 1));
        inputComp._moveLeft = left;
        inputComp._moveRight = right;
        inputComp.moveDir = left ? -1 : (right ? 1 : 0);

        if (input.jump !== undefined) {
          inputComp.jumpHeld = !!input.jump;
        }
        if (input.pulse !== undefined) {
          inputComp.pulsePressed = !!input.pulse;
        }
      });
    }
  }

  private async onPreloadAssets(): Promise<void> {
    const assets = [
      { id: "pulse", path: "/audio/shoot.mp3" },
      { id: "hit", path: "/audio/hit.mp3" },
      { id: "score", path: "/audio/score.mp3" },
      { id: "game_over", path: "/audio/game_over.mp3" },
      { id: "explosion", path: "/audio/explosion.mp3" }
    ];
    for (const asset of assets) {
      try {
        await this.audio.loadSFX(asset.id, asset.path);
      } catch (e) {
        // Fallback for environment constraints
      }
    }
  }

  public initializeRenderer(renderer: Renderer<any, any>): void {
    if (renderer.type === "canvas") {
      const {
        drawEchoBackground,
        drawEchoPlayer,
        drawMemoryFragment,
        drawMemoryCore,
        drawCheckpointNode,
        drawPulseAttack,
        drawSentinel,
        drawHopper,
        drawWatcher,
        drawCharger
      } = require("./rendering/EchoRunnerCanvasVisuals");

      renderer.registerBackgroundEffect("echo_bg", drawEchoBackground);
      renderer.registerShape("player", drawEchoPlayer);
      renderer.registerShape("fragment", drawMemoryFragment);
      renderer.registerShape("core", drawMemoryCore);
      renderer.registerShape("node", drawCheckpointNode);
      renderer.registerShape("pulse_attack", drawPulseAttack);
      renderer.registerShape("sentinel", drawSentinel);
      renderer.registerShape("hopper", drawHopper);
      renderer.registerShape("watcher", drawWatcher);
      renderer.registerShape("charger", drawCharger);
    } else if (renderer.type === "skia") {
      const {
        drawSkiaEchoBackground,
        drawSkiaEchoPlayer,
        drawSkiaMemoryFragment,
        drawSkiaMemoryCore,
        drawSkiaCheckpointNode,
        drawSkiaPulseAttack,
        drawSkiaSentinel,
        drawSkiaHopper,
        drawSkiaWatcher,
        drawSkiaCharger
      } = require("./rendering/EchoRunnerSkiaVisuals");

      renderer.registerBackgroundEffect("echo_bg", drawSkiaEchoBackground);
      renderer.registerShape("player", drawSkiaEchoPlayer);
      renderer.registerShape("fragment", drawSkiaMemoryFragment);
      renderer.registerShape("core", drawSkiaMemoryCore);
      renderer.registerShape("node", drawSkiaCheckpointNode);
      renderer.registerShape("pulse_attack", drawSkiaPulseAttack);
      renderer.registerShape("sentinel", drawSkiaSentinel);
      renderer.registerShape("hopper", drawSkiaHopper);
      renderer.registerShape("watcher", drawSkiaWatcher);
      renderer.registerShape("charger", drawSkiaCharger);
    }
  }

  public getGameState(): EchoRunnerGameState {
    const runState = this.world.getResource<any>("RunState");
    const score = runState ? runState.collectedTemporalIds.length * 10 + runState.collectedPermanentIds.length * 100 : 0;

    return {
      type: "EchoRunnerGameState",
      score,
      isGameOver: this.gameOver,
      attempts: runState ? runState.attempt : 1,
      deaths: runState ? runState.deaths : 0,
      fragments: runState ? runState.collectedTemporalIds.length : 0,
      cores: runState ? runState.collectedPermanentIds.length : 0,
      activeCheckpoint: runState ? runState.activeCheckpoint : null,
      elapsedTime: runState ? runState.elapsedTime : 0
    };
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }
}

export const EchoRunnerDefinition = {
  name: "echorunner",
  createSimulation: (seed: number) => {
    return new EchoRunnerGame({ seed });
  },
  inputSchema: {
    actions: ["left", "right", "jump", "pulse"]
  },
  assets: {
    sprites: [],
    sounds: []
  }
};
