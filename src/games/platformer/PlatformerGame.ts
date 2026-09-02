import {
  BaseGame,
  GameDefinition,
  World,
  SystemPhase,
  BlueprintDefinition,
  Component,
  CoreComponentRegistry,
  WebAudioPlayer,
  PhysicsIntegrateSystem,
  PlatformerMovementSystem,
  PlatformerGravitySystem,
  TileCollisionSystem,
  PlatformerCoyoteSystem,
  TTLSystem,
  Renderer,
  TilemapRenderSystem,
  Camera2DSystem,
  EnemySensorSystem,
  StateMachineSystem,
  registerEnemyStateMachines,
  HitDetectionSystem,
  CollectibleSystem,
  CheckpointSystem,
  DeathSystem,
  RespawnSystem,
  AnimationSystem,
  RunState,
  SegmentTemplate,
  SegmentGenerator,
  LevelPlan,
  TransformComponent,
  VelocityComponent,
  Collider2DComponent,
  TagComponent,
  HealthComponent,
  Theme,
  resolveThemeColor,
  createEntityBuilder
} from "@tiny-aster/core";
import { PlatformerInputSystem } from "./systems/PlatformerInputSystem";
import { PlatformerGoalSystem } from "./systems/PlatformerGoalSystem";
import { PlatformerDamageSystem } from "./systems/PlatformerDamageSystem";
import { PlatformerDashSystem } from "./systems/PlatformerDashSystem";
import { PlatformerWallJumpSystem } from "./systems/PlatformerWallJumpSystem";
import { PowerUpSystem, PowerUpEffectRegistry } from "../shared/arcade";
import { drawPlatformerPlayer, drawPlatformerGoal } from "./rendering/PlatformerCanvasVisuals";
import { drawMemoryFragment, drawCheckpointNode, drawSentinel, drawHopper, drawCharger } from "../echorunner/rendering/EchoRunnerCanvasVisuals";
import { createThemeFromGameAccents } from "../../theme/gameAccents";

export interface PlatformerInput {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  dash?: boolean;
  [key: string]: unknown;
}

export interface PlatformerGameState extends Component {
  type: "PlatformerGameState";
  score: number;
  lives: number;
  attempts: number;
  isGameOver: boolean;
}

export interface PlatformerBlueprintMap extends Record<string, BlueprintDefinition<CoreComponentRegistry, any, any>> {
  player: BlueprintDefinition<CoreComponentRegistry, any, { x: number; y: number }>;
  tilemap: BlueprintDefinition<CoreComponentRegistry, any, { data: number[][]; tileDefinitions: any }>;
}

export const PLATFORMER_CONFIG = {
  SCREEN_WIDTH: 800,
  SCREEN_HEIGHT: 600,
  TILE_SIZE: 40,
  PLAYER_SPEED: 200,
  PLAYER_ACCEL: 800,
  PLAYER_DECEL: 1200,
  PLAYER_AIR_ACCEL: 400,
  PLAYER_AIR_DECEL: 600,
  PLAYER_JUMP_VEL: 350,
  PLAYER_MIN_JUMP_VEL: 150,
  RISE_GRAVITY: 800,
  FALL_GRAVITY: 1200,
};

export class PlatformerGame extends BaseGame<PlatformerGameState, PlatformerInput, CoreComponentRegistry, any, PlatformerBlueprintMap> {
  public readonly gameId = "platformer";
  private gameOver = false;
  private levelPlan!: LevelPlan;

  constructor(config: { seed?: number; gameOptions?: Record<string, unknown>; theme?: Theme } = {}) {
    super({
      pauseKey: "KeyP",
      restartKey: "KeyR",
      gameOptions: config.gameOptions,
      seed: config.seed,
      theme: config.theme ?? createThemeFromGameAccents("platformer"),
      audio: new WebAudioPlayer()
    });
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.world.setResource("ScreenConfig", { width: PLATFORMER_CONFIG.SCREEN_WIDTH, height: PLATFORMER_CONFIG.SCREEN_HEIGHT });
    this.world.setResource("DeathPlaneY", 650);

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

    const powerUpRegistry = new PowerUpEffectRegistry();
    powerUpRegistry.attachToWorld(this.world);

    // Event bus listeners
    const eventBus = this.getEventBus();
    if (eventBus) {
      eventBus.on("level:completed", () => {
        this.gameOver = true;
      });
      eventBus.on("PlaySFX", (event: any) => {
        if (event && event.name) {
          this.audio.playSFX(event.name);
        }
      });
      eventBus.on("CollectiblePickedUp", () => {
        this.audio.playSFX("score");
      });
      eventBus.on("PlayerDied", () => {
        this.audio.playSFX("game_over");
      });
    }

    // Register state machines
    registerEnemyStateMachines(this.world);

    // Blueprints
    this.blueprints.register("collectible_fragment", {
      spawn: (world, entity, args: { x: number; y: number; id: string }) => {
        createEntityBuilder(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withRender({ shape: "fragment", size: 16, order: 1 })
          .withComponent({
            type: "Collectible",
            kind: "fragment",
            value: 10,
            persistent: false,
            collectOnce: false,
            id: args.id
          } as any)
          .commit();
      }
    });

    this.blueprints.register("collectible_coin", {
      spawn: (world, entity, args: { x: number; y: number; id: string }) => {
        createEntityBuilder(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withRender({ shape: "fragment", size: 16, order: 1 })
          .withComponent({
            type: "Collectible",
            kind: "coin",
            value: 20,
            persistent: false,
            collectOnce: false,
            id: args.id
          } as any)
          .commit();
      }
    });

    this.blueprints.register("checkpoint_node", {
      spawn: (world, entity, args: { x: number; y: number; id: string }) => {
        createEntityBuilder(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withRender({ shape: "node", size: 32, order: 1 })
          .withComponent({
            type: "RespawnPoint",
            x: args.x,
            y: args.y - 10,
            checkpointId: args.id
          } as any)
          .commit();
      }
    });

    this.blueprints.register("enemy_sentinel", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        createEntityBuilder(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withRender({ shape: "sentinel", size: 22, order: 2 })
          .withHealth(1, 1)
          .withComponent({ type: "Enemy", kind: "patrol" } as any)
          .withComponent({ type: "Patrol", startX: args.x - 80, endX: args.x + 80, direction: 1, patrolSpeed: 70 } as any)
          .withComponent({ type: "GroundDetector", hasGroundAhead: true, hasWallAhead: false, sensorOffsetX: 15, sensorOffsetY: 20 } as any)
          .withComponent({ type: "PlayerSensor", visionRange: 130, detectedPlayerEntity: undefined } as any)
          .withComponent({
            type: "StateMachine",
            currentState: "Patrol",
            elapsedInState: 0,
            data: { patrolSpeed: 70, alertDuration: 0.3, windupDuration: 0.3, attackDuration: 0.4, recoveryDuration: 0.5 },
            machineId: "patrol",
            elapsedMs: 0
          } as any)
          .withComponent({ type: "Hurtbox" } as any)
          .commit();
      }
    });

    this.blueprints.register("enemy_hopper", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        createEntityBuilder(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withRender({ shape: "hopper", size: 24, order: 2 })
          .withHealth(1, 1)
          .withComponent({ type: "Enemy", kind: "jumper" } as any)
          .withComponent({ type: "PlayerSensor", visionRange: 150, detectedPlayerEntity: undefined } as any)
          .withComponent({ type: "PlatformerGroundState", isGrounded: false } as any)
          .withComponent({
            type: "StateMachine",
            currentState: "Idle",
            elapsedInState: 0,
            data: { idleDuration: 0.8, alertDuration: 0.3, windupDuration: 0.3, jumpVelocity: 260, patrolSpeed: 60, attackDuration: 0.8, recoveryDuration: 0.4 },
            machineId: "jumper",
            elapsedMs: 0
          } as any)
          .withComponent({ type: "Hurtbox" } as any)
          .commit();
      }
    });

    this.blueprints.register("enemy_charger", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        createEntityBuilder(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withRender({ shape: "charger", size: 28, order: 2 })
          .withHealth(1, 1)
          .withComponent({ type: "Enemy", kind: "charger" } as any)
          .withComponent({ type: "PlayerSensor", visionRange: 160, detectedPlayerEntity: undefined } as any)
          .withComponent({ type: "GroundDetector", hasGroundAhead: true, hasWallAhead: false, sensorOffsetX: 15, sensorOffsetY: 20 } as any)
          .withComponent({
            type: "StateMachine",
            currentState: "Idle",
            elapsedInState: 0,
            data: { alertDuration: 0.4, windupDuration: 0.4, chargeSpeed: 200, attackDuration: 1.0, recoveryDuration: 0.8 },
            machineId: "charger",
            elapsedMs: 0
          } as any)
          .withComponent({ type: "Hurtbox" } as any)
          .commit();
      }
    });

    this.blueprints.register("powerup_double_jump", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        createEntityBuilder(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 12, halfHeight: 12 },
            isTrigger: true
          })
          .withCollisionEvents()
          .withPowerUp("double_jump")
          .withRender({ shape: "fragment", size: 18, order: 1 })
          .commit();
      }
    });

    this.blueprints.register("powerup_dash", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        createEntityBuilder(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 12, halfHeight: 12 },
            isTrigger: true
          })
          .withCollisionEvents()
          .withPowerUp("dash_unlock")
          .withRender({ shape: "fragment", size: 18, order: 1 })
          .commit();
      }
    });

    this.blueprints.register("goal", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        createEntityBuilder(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withRender({ shape: "goal", size: 32, order: 1 })
          .withComponent({ type: "LevelGoal", reached: false } as any)
          .commit();
      }
    });

    this.blueprints.register("player", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        const theme = world.getResource<Theme>("Theme");
        const assetKey = theme?.spriteMap["player"] ?? "player_sprite";
        const tint = resolveThemeColor(world, "player");

        createEntityBuilder(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withCollider2D({ shape: { type: "aabb", halfWidth: 10, halfHeight: 15 } })
          .withTag(["TileCollider", "Player"])
          .withHealth(3, 3, 0)
          .withRender({ shape: "player", size: 24, color: tint, order: 2 })
          .withSprite({ assetKey, anchor: { x: 0.5, y: 0.5 } })
          .withComponent({
            type: "PlatformerMovementConfig",
            acceleration: PLATFORMER_CONFIG.PLAYER_ACCEL,
            maxSpeed: PLATFORMER_CONFIG.PLAYER_SPEED,
            deceleration: PLATFORMER_CONFIG.PLAYER_DECEL,
            airAcceleration: PLATFORMER_CONFIG.PLAYER_AIR_ACCEL,
            airDeceleration: PLATFORMER_CONFIG.PLAYER_AIR_DECEL
          } as any)
          .withComponent({
            type: "PlatformerInput",
            moveDir: 0,
            jumpPressed: false,
            jumpHeld: false,
            jumpReleased: false,
            dash: false
          } as any)
          .withComponent({
            type: "DashUnlocked",
            unlocked: true,
            dashSpeed: 500,
            cooldown: 0,
            cooldownMax: 0.8,
            dashTimeRemaining: 0
          } as any)
          .withComponent({ type: "WallJumpUnlocked", unlocked: true } as any)
          .withComponent({
            type: "PlatformerGravityConfig",
            riseGravity: PLATFORMER_CONFIG.RISE_GRAVITY,
            fallGravity: PLATFORMER_CONFIG.FALL_GRAVITY,
            jumpVelocity: PLATFORMER_CONFIG.PLAYER_JUMP_VEL,
            minJumpVelocity: PLATFORMER_CONFIG.PLAYER_MIN_JUMP_VEL
          } as any)
          .withComponent({
            type: "PlatformerJumper",
            coyoteTimer: 0,
            jumpBufferTimer: 0,
            coyoteTimeMax: 0.15,
            jumpBufferMax: 0.1,
            maxJumps: 2,
            jumpsRemaining: 2
          } as any)
          .withComponent({ type: "PlatformerGroundState", isGrounded: false, iceMultiplier: 1.0 } as any)
          .withComponent({
            type: "Animator",
            isPlaying: true,
            current: "idle",
            elapsed: 0,
            frame: 0,
            animations: {
              idle: { name: "idle", frameRate: 4, loop: true, frames: [0, 1] },
              run: { name: "run", frameRate: 8, loop: true, frames: [2, 3, 4, 5] },
              jump: { name: "jump", frameRate: 6, loop: false, frames: [6] },
              fall: { name: "fall", frameRate: 6, loop: false, frames: [7] }
            }
          } as any)
          .commit();
      }
    });

    this.blueprints.register("tilemap", {
      spawn: (world, entity, args: { data: number[][]; tileDefinitions: any }) => {
        createEntityBuilder(world, entity)
          .withTransform({ x: 0, y: 0 })
          .withComponent({
            type: "Tilemap",
            data: args.data,
            tileSize: PLATFORMER_CONFIG.TILE_SIZE,
            tileDefinitions: args.tileDefinitions
          } as any)
          .commit();
      }
    });

    // Add Systems
    this.world.addSystem(new PlatformerInputSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new PlatformerDashSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new PlatformerWallJumpSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerMovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerGravitySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerCoyoteSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new EnemySensorSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new StateMachineSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new CheckpointSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new DeathSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new RespawnSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerDamageSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PhysicsIntegrateSystem(), { phase: SystemPhase.Simulation, priority: -10 });
    this.world.addSystem(new TileCollisionSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CollectibleSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new PowerUpSystem() as any, { phase: SystemPhase.Collision });
    this.world.addSystem(new HitDetectionSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new PlatformerGoalSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new Camera2DSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new TilemapRenderSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new AnimationSystem(), { phase: SystemPhase.Presentation });

    await this.onPreloadAssets();
  }

  public initializeRenderer(renderer: Renderer<any, any>): void {
    renderer.registerShape("player", drawPlatformerPlayer);
    renderer.registerShape("goal", drawPlatformerGoal);
    renderer.registerShape("fragment", drawMemoryFragment);
    renderer.registerShape("node", drawCheckpointNode);
    renderer.registerShape("sentinel", drawSentinel);
    renderer.registerShape("hopper", drawHopper);
    renderer.registerShape("charger", drawCharger);
  }

  protected override async onInitializeEntities(): Promise<void> {
    const tileDefinitions = {
      1: { solid: true, kind: "normal" as const },
      2: { solid: true, kind: "ice" as const },
      3: { solid: true, kind: "bounce" as const, bounce: 1.2 },
      4: { solid: true, kind: "spike" as const },
      5: { solid: true, oneWay: true, kind: "normal" as const }
    };

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
          { x: 5, y: 10, type: "collectible_fragment", args: { id: "frag_intro_1" } },
          { x: 10, y: 10, type: "collectible_fragment", args: { id: "frag_intro_2" } }
        ]
      },
      {
        id: "movement_01",
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
          { x: 9, y: 7, type: "collectible_coin", args: { id: "coin_mov_1" } },
          { x: 10, y: 7, type: "collectible_coin", args: { id: "coin_mov_2" } }
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
          { x: 10, y: 10, type: "enemy_sentinel" },
          { x: 15, y: 10, type: "enemy_hopper" }
        ]
      },
      {
        id: "precision_01",
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
          [1,1,1,1,0,0,4,4,4,0,0,3,3,3,0,0,1,1,1,1],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawnPoints: [
          { x: 11, y: 9, type: "collectible_fragment", args: { id: "frag_prec_1" } }
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
          { x: 10, y: 10, type: "checkpoint_node", args: { id: "cp_midway" } }
        ]
      },
      {
        id: "reward_01",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 1,
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
          { x: 5, y: 10, type: "collectible_coin", args: { id: "coin_rew_1" } },
          { x: 10, y: 10, type: "collectible_coin", args: { id: "coin_rew_2" } },
          { x: 15, y: 10, type: "collectible_coin", args: { id: "coin_rew_3" } }
        ]
      },
      {
        id: "goal_01",
        entry: { x: 0, y: 11 },
        exit: { x: 20, y: 11 },
        bounds: { width: 20, height: 15 },
        difficulty: 1,
        tags: ["goal"],
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
          { x: 10, y: 10, type: "goal" }
        ]
      }
    ];

    const grammar = ["intro", "movement", "combat", "precision", "checkpoint", "movement", "combat", "precision", "reward", "goal"];
    const levelSeed = this.getSeed() || 41873;
    this.levelPlan = SegmentGenerator.generatePlan(templates, grammar, levelSeed);

    this.world.setResource("PlayerStartPoint", { x: 100, y: 350 });
    SegmentGenerator.instantiatePlan(this.world, this.levelPlan, PLATFORMER_CONFIG.TILE_SIZE, tileDefinitions);

    // Spawn player
    const playerEntity = this.world.createEntity();
    this.blueprints.get("player")?.spawn(this.world as any, playerEntity, { x: 100, y: 350 });

    // Spawn Main Follow Camera
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
  }

  private async onPreloadAssets(): Promise<void> {
    const assets = [
      { id: "jump", path: "/audio/flap.mp3" },
      { id: "hit", path: "/audio/hit.mp3" },
      { id: "score", path: "/audio/score.mp3" },
      { id: "game_over", path: "/audio/game_over.mp3" }
    ];
    for (const asset of assets) {
      try {
        await this.audio.loadSFX(asset.id, asset.path);
      } catch (e) {
        // Fallback for environment constraints
      }
    }
  }

  public override update(dt: number): void {
    if (this.gameOver) return;

    const runState = this.world.getResource<RunState>("RunState");
    if (runState) {
      runState.elapsedTime += dt;
    }

    this.world.update(dt);
  }

  public override setInputState(input: Partial<PlatformerInput>): void {
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
        if (input.dash !== undefined) {
          inputComp.dash = !!input.dash;
        }
      });
    }
  }

  public getGameState(): PlatformerGameState {
    const runState = this.world.getResource<RunState>("RunState");
    const score = runState ? runState.collectedTemporalIds.length * 10 + runState.collectedPermanentIds.length * 100 : 0;
    const lives = runState ? runState.lives : 3;
    const attempts = runState ? runState.attempt : 1;

    return {
      type: "PlatformerGameState",
      score,
      lives,
      attempts,
      isGameOver: this.gameOver
    };
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }
}

export const PlatformerDefinition: GameDefinition = {
  name: "platformer",
  createSimulation: (seed: number) => {
    const game = new PlatformerGame({ gameOptions: { seed } });
    return game;
  },
  inputSchema: {
    actions: ["moveLeft", "moveRight", "jump", "dash"]
  },
  assets: {
    sprites: [],
    sounds: []
  }
};
