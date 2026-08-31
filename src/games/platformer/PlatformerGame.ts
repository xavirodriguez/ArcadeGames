import {
  BaseGame,
  GameDefinition,
  World,
  SystemPhase,
  BlueprintDefinition,
  Component,
  CoreComponentRegistry,
  WebAudioPlayer,
  GameLoop,
  EventBus,
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
  RunState,
  SegmentTemplate,
  SegmentGenerator,
  LevelPlan,
  TransformComponent,
  VelocityComponent,
  Collider2DComponent,
  TagComponent,
  HealthComponent
} from "@tiny-aster/core";
import { PlatformerInputSystem } from "./systems/PlatformerInputSystem";
import { PlatformerGoalSystem } from "./systems/PlatformerGoalSystem";
import { drawPlatformerPlayer, drawPlatformerGoal } from "./rendering/PlatformerCanvasVisuals";
import { drawMemoryFragment, drawCheckpointNode, drawSentinel } from "../echorunner/rendering/EchoRunnerCanvasVisuals";

export interface PlatformerInput {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
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

    // Register level completed event listener
    const eventBus = this.getEventBus();
    if (eventBus) {
      eventBus.on("level:completed", () => {
        this.gameOver = true;
      });
    }

    // Register state machines
    registerEnemyStateMachines(this.world);

    // Blueprints
    this.blueprints.register("collectible_fragment", {
      spawn: (world, entity, args: { x: number; y: number; id: string }) => {
        world.addComponent(entity, {
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
        } as TransformComponent);

        world.addComponent(entity, {
          type: "Collectible",
          kind: "fragment",
          value: 10,
          persistent: false,
          collectOnce: false,
          id: args.id
        } as any);

        world.addComponent(entity, {
          type: "Render",
          shape: "fragment",
          size: 16,
          visible: true,
          opacity: 1,
          order: 1,
          rotation: 0,
          angularVelocity: 0,
          hitFlashFrames: 0
        } as any);
      }
    });

    this.blueprints.register("checkpoint_node", {
      spawn: (world, entity, args: { x: number; y: number; id: string }) => {
        world.addComponent(entity, {
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
        } as TransformComponent);

        world.addComponent(entity, {
          type: "RespawnPoint",
          x: args.x,
          y: args.y - 10,
          checkpointId: args.id
        } as any);

        world.addComponent(entity, {
          type: "Render",
          shape: "node",
          size: 32,
          visible: true,
          opacity: 1,
          order: 1,
          rotation: 0,
          angularVelocity: 0,
          hitFlashFrames: 0
        } as any);
      }
    });

    this.blueprints.register("enemy_sentinel", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        world.addComponent(entity, {
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
        } as TransformComponent);

        world.addComponent(entity, {
          type: "Velocity",
          vx: 0,
          vy: 0,
          angularVelocity: 0
        } as VelocityComponent);

        world.addComponent(entity, {
          type: "Enemy",
          kind: "patrol"
        } as any);

        world.addComponent(entity, {
          type: "Patrol",
          startX: args.x - 80,
          endX: args.x + 80,
          direction: 1,
          patrolSpeed: 70
        } as any);

        world.addComponent(entity, {
          type: "GroundDetector",
          hasGroundAhead: true,
          hasWallAhead: false,
          sensorOffsetX: 15,
          sensorOffsetY: 20
        } as any);

        world.addComponent(entity, {
          type: "PlayerSensor",
          visionRange: 130,
          detectedPlayerEntity: undefined
        } as any);

        world.addComponent(entity, {
          type: "StateMachine",
          currentState: "Patrol",
          elapsedInState: 0,
          data: {
            patrolSpeed: 70,
            alertDuration: 0.3,
            windupDuration: 0.3,
            attackDuration: 0.4,
            recoveryDuration: 0.5
          },
          machineId: "patrol",
          elapsedMs: 0
        } as any);

        world.addComponent(entity, {
          type: "Health",
          current: 1,
          max: 1
        } as HealthComponent);

        world.addComponent(entity, {
          type: "Hurtbox"
        } as any);

        world.addComponent(entity, {
          type: "Render",
          shape: "sentinel",
          size: 22,
          visible: true,
          opacity: 1,
          order: 2,
          rotation: 0,
          angularVelocity: 0,
          hitFlashFrames: 0
        } as any);
      }
    });

    this.blueprints.register("goal", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        world.addComponent(entity, {
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
        } as TransformComponent);

        world.addComponent(entity, {
          type: "LevelGoal",
          reached: false
        } as any);

        world.addComponent(entity, {
          type: "Render",
          shape: "goal",
          size: 32,
          visible: true,
          opacity: 1,
          order: 1,
          rotation: 0,
          angularVelocity: 0,
          hitFlashFrames: 0
        } as any);
      }
    });

    this.blueprints.register("player", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        world.addComponent(entity, {
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
        } as TransformComponent);

        world.addComponent(entity, {
          type: "Velocity",
          vx: 0,
          vy: 0,
          angularVelocity: 0
        } as VelocityComponent);

        world.addComponent(entity, {
          type: "Collider2D",
          shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
          layer: 1,
          mask: 0xFFFF,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as Collider2DComponent);

        world.addComponent(entity, {
          type: "Tag",
          tags: ["TileCollider"]
        } as TagComponent);

        world.addComponent(entity, {
          type: "PlatformerMovementConfig",
          acceleration: PLATFORMER_CONFIG.PLAYER_ACCEL,
          maxSpeed: PLATFORMER_CONFIG.PLAYER_SPEED,
          deceleration: PLATFORMER_CONFIG.PLAYER_DECEL,
          airAcceleration: PLATFORMER_CONFIG.PLAYER_AIR_ACCEL,
          airDeceleration: PLATFORMER_CONFIG.PLAYER_AIR_DECEL
        } as any);

        world.addComponent(entity, {
          type: "PlatformerInput",
          moveDir: 0,
          jumpPressed: false,
          jumpHeld: false,
          jumpReleased: false
        } as any);

        world.addComponent(entity, {
          type: "PlatformerGravityConfig",
          riseGravity: PLATFORMER_CONFIG.RISE_GRAVITY,
          fallGravity: PLATFORMER_CONFIG.FALL_GRAVITY,
          jumpVelocity: PLATFORMER_CONFIG.PLAYER_JUMP_VEL,
          minJumpVelocity: PLATFORMER_CONFIG.PLAYER_MIN_JUMP_VEL
        } as any);

        world.addComponent(entity, {
          type: "PlatformerJumper",
          coyoteTimer: 0,
          jumpBufferTimer: 0,
          coyoteTimeMax: 0.15,
          jumpBufferMax: 0.1,
          maxJumps: 2,
          jumpsRemaining: 2
        } as any);

        world.addComponent(entity, {
          type: "PlatformerGroundState",
          isGrounded: false,
          iceMultiplier: 1.0
        } as any);

        world.addComponent(entity, {
          type: "Health",
          current: 3,
          max: 3
        } as HealthComponent);
      }
    });

    this.blueprints.register("tilemap", {
      spawn: (world, entity, args: { data: number[][]; tileDefinitions: any }) => {
        world.addComponent(entity, {
          type: "Tilemap",
          data: args.data,
          tileSize: PLATFORMER_CONFIG.TILE_SIZE,
          tileDefinitions: args.tileDefinitions
        } as any);

        world.addComponent(entity, {
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
        } as any);
      }
    });

    // Add Systems
    this.world.addSystem(new PlatformerInputSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new PlatformerMovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerGravitySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerCoyoteSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new EnemySensorSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new StateMachineSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new CheckpointSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new DeathSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new RespawnSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PhysicsIntegrateSystem(), { phase: SystemPhase.Simulation, priority: -10 });
    this.world.addSystem(new TileCollisionSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CollectibleSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new HitDetectionSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new PlatformerGoalSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new Camera2DSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new TilemapRenderSystem(), { phase: SystemPhase.Presentation });
  }

  public initializeRenderer(renderer: Renderer<any, any>): void {
    renderer.registerShape("player", drawPlatformerPlayer);
    renderer.registerShape("goal", drawPlatformerGoal);
    renderer.registerShape("fragment", drawMemoryFragment);
    renderer.registerShape("node", drawCheckpointNode);
    renderer.registerShape("sentinel", drawSentinel);
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
        spawnPoints: []
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
          { x: 10, y: 8, type: "collectible_fragment", args: { id: "frag_1" } },
          { x: 18, y: 10, type: "goal" }
        ]
      }
    ];

    const grammar = ["intro", "movement"];
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
    this.world.update(dt);
  }

  public override setInputState(input: Partial<PlatformerInput>): void {
    const world = this.getWorld();
    const playerEntity = world.query("PlatformerInput" as any)[0];
    if (playerEntity !== undefined) {
      world.mutateComponent(playerEntity, "PlatformerInput" as any, (inputComp: any) => {
        if (input.moveLeft !== undefined || input.rotateLeft !== undefined) {
          const moveLeft = !!(input.moveLeft || input.rotateLeft);
          const moveRight = !!(input.moveRight || input.rotateRight);
          inputComp.moveDir = moveLeft ? -1 : (moveRight ? 1 : 0);
        }
        if (input.jump !== undefined || input.shoot !== undefined || input.flap !== undefined) {
          const jumpPressed = !!(input.jump || input.shoot || input.flap);
          inputComp.jumpHeld = jumpPressed;
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
    actions: ["moveLeft", "moveRight", "jump"]
  },
  assets: {
    sprites: [],
    sounds: []
  }
};
