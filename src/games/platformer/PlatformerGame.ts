import {
  BaseGame,
  GameDefinition,
  World,
  SystemPhase,
  System,
  BlueprintDefinition,
  Component,
  CoreComponentRegistry,
  EventRegistry,
  ConfigService,
  WebAudioPlayer,
  TTLSystem,
  JuiceSystem,
  ScreenShakeSystem,
  Renderer,
  RenderContext,
  registerEnemyStateMachines,
  AnimationSystem,
  RunState,
  SegmentTemplate,
  SegmentGenerator,
  LevelPlan,
  BoxShape,
  ShapeType,
  HealthComponent,
  Theme,
  resolveThemeColor,
  EntityBuilder,
  preloadSharedAudioManifest,
  SHARED_AUDIO_MANIFEST
} from "@tiny-aster/core";
import { setupPlatformerMovementComponents, registerPlatformerTilemapBlueprint, createMainCamera2D, syncLevelWorldDimensions } from "../shared/componentBuilders";
import { PlatformerInputSystem } from "./systems/PlatformerInputSystem";
import { resolveAndApplyMutators } from "../../config/MutatorConfig";
import { PlatformerGoalSystem, LevelGoalComponent } from "./systems/PlatformerGoalSystem";
import { PlatformerDamageSystem } from "./systems/PlatformerDamageSystem";
import { PlatformerDashSystem } from "./systems/PlatformerDashSystem";
import { PlatformerWallJumpSystem } from "./systems/PlatformerWallJumpSystem";
import { PowerUpSystem, PowerUpRegistry, ArcadeEntityBuilder, registerPlatformerEnemyBlueprints, registerPlatformerEnvironmentBlueprints, mutatePlatformerInputState, registerCommonPlatformerSystems } from "@tiny-aster/gameplay-kit";
import { drawPlatformerPlayer, drawPlatformerGoal, drawPlatformerTilemap } from "./rendering/PlatformerCanvasVisuals";
import { drawMemoryFragment, drawCheckpointNode, drawSentinel, drawHopper, drawCharger } from "../echorunner/rendering/EchoRunnerCanvasVisuals";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import defaultLevelData from "./levels/level-01.json";
import { PlatformerConfigSchema, PlatformerConfig as PlatformerConfigType, DEFAULT_PLATFORMER_CONFIG } from "./types/PlatformerConfigSchema";
import { PlatformerArcadeGame } from "../shared/PlatformerArcadeGame";

export interface PlatformerConfig {
  seed?: number;
  gameOptions?: Record<string, unknown>;
  theme?: Theme;
  levelData?: { templates: SegmentTemplate[]; grammar: string[] };
}

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

export interface PlatformerBlueprintMap extends Record<string, BlueprintDefinition<CoreComponentRegistry, EventRegistry, unknown>> {
  player: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { x: number; y: number }>;
  tilemap: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { data: number[][]; tileDefinitions: Record<number, unknown> }>;
}

export const PLATFORMER_CONFIG = DEFAULT_PLATFORMER_CONFIG;

export class PlatformerGame extends PlatformerArcadeGame<PlatformerGameState, PlatformerInput, CoreComponentRegistry, EventRegistry, PlatformerBlueprintMap> {
  public readonly gameId = "platformer";
  private gameOver = false;
  private levelPlan!: LevelPlan;
  private customLevelData?: { templates: SegmentTemplate[]; grammar: string[] };
  private baseConfig: PlatformerConfigType;
  private config: PlatformerConfigType;

  constructor(config: PlatformerConfig = {}) {
    super({
      pauseKey: "KeyP",
      restartKey: "KeyR",
      gameOptions: config.gameOptions,
      seed: config.seed,
      theme: config.theme ?? createThemeFromGameAccents("platformer"),
      audio: new WebAudioPlayer()
    });
    this.baseConfig = ConfigService.load<PlatformerConfigType>(
      this.gameId,
      PlatformerConfigSchema,
      config.gameOptions?.rawConfig ?? {}
    );
    this.config = this.baseConfig;
    this.customLevelData = config.levelData ?? (config.gameOptions?.levelData as { templates: SegmentTemplate[]; grammar: string[] } | undefined);
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = resolveAndApplyMutators(this.baseConfig, this._config.gameOptions);

    this.world.setResource("GameConfig", this.config);
    await super.onRegisterSystems();

    // Register PowerUp effects
    const powerUpRegistry = new PowerUpRegistry({
      double_jump: {
        apply(world: World<CoreComponentRegistry>, player: number) {
          if (world.hasComponent(player, "PlatformerJumper")) {
            world.mutateComponent(player, "PlatformerJumper", (j: unknown) => {
              const jumper = j as { maxJumps: number; jumpsRemaining: number };
              jumper.maxJumps = 2;
              jumper.jumpsRemaining = 2;
            });
          }
        }
      },
      dash_unlock: {
        apply(world: World<CoreComponentRegistry>, player: number) {
          world.commands.addComponent(player, {
            type: "DashUnlocked",
            unlocked: true,
            dashSpeed: 500,
            cooldown: 0,
            cooldownMax: 0.8,
            dashTimeRemaining: 0
          } as unknown as Component);
        }
      },
      wall_jump_unlock: {
        apply(world: World<CoreComponentRegistry>, player: number) {
          world.commands.addComponent(player, {
            type: "WallJumpUnlocked",
            unlocked: true
          } as unknown as Component);
        }
      }
    });
    this.world.setResource("PowerUpEffects", powerUpRegistry);

    // Event bus listeners
    const eventBus = this.getEventBus();
    if (eventBus) {
      eventBus.on("level:completed", () => {
        this.gameOver = true;
      });
      eventBus.on("PlaySFX", (event: unknown) => {
        const sfx = event as { name?: string } | undefined;
        if (sfx && sfx.name) {
          this.audio.playSFX(sfx.name);
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
    const registerCollectibleBlueprint = (
      id: string,
      kind: string,
      value: number,
      size = 16
    ) => {
      this.blueprints.register(id, {
        spawn: (world, entity, args: { x: number; y: number; id: string }) => {
          ArcadeEntityBuilder.fromEntity(world, entity)
            .withTransform({ x: args.x, y: args.y })
            .withCollider2D({
              shape: { type: "aabb", halfWidth: 10, halfHeight: 10 },
              isTrigger: true
            })
            .withCollisionEvents()
            .withRender({
              shape: "fragment",
              size,
              order: 1
            });

          world.addComponent(entity, {
            type: "Collectible",
            kind,
            value,
            persistent: false,
            collectOnce: false,
            id: args.id
          } as { type: string; [key: string]: unknown });
        }
      });
    };

    registerCollectibleBlueprint("collectible_fragment", "fragment", 10);
    registerCollectibleBlueprint("collectible_coin", "coin", 20);

    registerPlatformerEnvironmentBlueprints(this.blueprints);
    registerPlatformerEnemyBlueprints(this.blueprints);

    const registerPowerUpBlueprint = (
      id: string,
      powerUpKind: string
    ) => {
      this.blueprints.register(id, {
        spawn: (world, entity, args: { x: number; y: number }) => {
          ArcadeEntityBuilder.fromEntity(world, entity)
            .withTransform({ x: args.x, y: args.y })
            .withCollider2D({
              shape: { type: "aabb", halfWidth: 12, halfHeight: 12 },
              isTrigger: true
            })
            .withCollisionEvents()
            .withPowerUp(powerUpKind)
            .withRender({
              shape: "fragment",
              size: 18,
              order: 1
            });
        }
      });
    };

    registerPowerUpBlueprint("powerup_double_jump", "double_jump");
    registerPowerUpBlueprint("powerup_dash", "dash_unlock");

    this.blueprints.register("goal", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        ArcadeEntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 16, halfHeight: 24 },
            isTrigger: true
          })
          .withCollisionEvents()
          .withRender({ shape: "goal", size: 32, order: 1 });

        world.addComponent(entity, { type: "LevelGoal", reached: false } as LevelGoalComponent);
      }
    });

    this.blueprints.register("player", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        const theme = world.getResource<Theme>("Theme");
        const assetKey = theme?.spriteMap["player"] ?? "player_sprite";
        const tint = resolveThemeColor(world, "player");

        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withCollider({ shape: { type: ShapeType.Box, width: 20, height: 30 } as BoxShape })
          .withRender({ shape: "player", size: 24, color: tint, order: 2 });

        world.addComponent(entity, { type: "Health", current: 3, max: 3 } as HealthComponent);
        world.addComponent(entity, { type: "Tag", tags: ["TileCollider", "Player"] });
        world.addComponent(entity, { type: "Sprite", assetKey, anchor: { x: 0.5, y: 0.5 } });
        const config = world.getResource<PlatformerConfigType>("GameConfig") || DEFAULT_PLATFORMER_CONFIG;

        setupPlatformerMovementComponents(world, entity, config);
        world.addComponent(entity, {
          type: "PlatformerInput",
          moveDir: 0,
          jumpPressed: false,
          jumpHeld: false,
          jumpReleased: false,
          dash: false
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
          type: "DashUnlocked",
          unlocked: true,
          dashSpeed: 500,
          cooldown: 0,
          cooldownMax: 0.8,
          dashTimeRemaining: 0
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, { type: "WallJumpUnlocked", unlocked: true } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
          type: "PlatformerJumper",
          coyoteTimer: 0,
          jumpBufferTimer: 0,
          coyoteTimeMax: 0.15,
          jumpBufferMax: 0.1,
          maxJumps: 2,
          jumpsRemaining: 2
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
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
        } as { type: string; [key: string]: unknown });
      }
    });

    registerPlatformerTilemapBlueprint(this.blueprints, DEFAULT_PLATFORMER_CONFIG);

    // Add Input Systems
    this.world.addSystem(new PlatformerInputSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new PlatformerDashSystem(), { phase: SystemPhase.Input });

    // Register common platformer systems
    registerCommonPlatformerSystems(this.world);

    // Game-specific simulation systems
    this.world.addSystem(new PlatformerWallJumpSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerDamageSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PlatformerGoalSystem(), { phase: SystemPhase.Simulation });

    // Game-specific collision systems
    this.world.addSystem(new PowerUpSystem() as unknown as System<CoreComponentRegistry>, { phase: SystemPhase.Collision });

    // Game-specific presentation systems
    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new AnimationSystem(), { phase: SystemPhase.Presentation });
  }

  public initializeRenderer(renderer: Renderer<CoreComponentRegistry, RenderContext>): void {
    renderer.registerShape("tilemap", drawPlatformerTilemap);
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

    const levelData = this.customLevelData ?? defaultLevelData;
    const templates = levelData.templates as SegmentTemplate[];
    const grammar = levelData.grammar as string[];
    const levelSeed = this.getSeed() || 41873;
    this.levelPlan = SegmentGenerator.generatePlan(templates, grammar, levelSeed);

    syncLevelWorldDimensions(this.world, this.levelPlan, DEFAULT_PLATFORMER_CONFIG);

    const config = this.world.getResource<PlatformerConfigType>("GameConfig") || DEFAULT_PLATFORMER_CONFIG;
    this.world.setResource("PlayerStartPoint", { x: 100, y: 350 });
    SegmentGenerator.instantiatePlan(this.world, this.levelPlan, config.TILE_SIZE, tileDefinitions);
    this.world.flush();

    // Spawn player
    const playerEntity = this.world.createEntity();
    this.blueprints.get("player")?.spawn(this.world, playerEntity, { x: 100, y: 350 });

    // Spawn Main Follow Camera
    const camEntity = createMainCamera2D(this.world, playerEntity, {
      lookAheadX: 40,
      smoothingX: 3.5,
      smoothingY: 3.5,
      verticalDeadzone: 45
    });
    this.world.addComponent(camEntity, {
      type: "ScreenShake",
      intensity: 0,
      duration: 0,
      remaining: 0
    });

    this.world.flush();
  }

  protected override async onPreloadAssets(): Promise<void> {
    if (this.audio) {
      await preloadSharedAudioManifest(this.audio);
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
    mutatePlatformerInputState(this.getWorld(), input);
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
    sounds: SHARED_AUDIO_MANIFEST
  }
};
