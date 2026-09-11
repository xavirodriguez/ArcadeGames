import {
  BaseGame,
  MovementSystem,
  BoundarySystem,
  JuiceSystem,
  ScreenShakeSystem,
  RenderUpdateSystem,
  AssetLoader,
  CollisionSystem2D,
  ConfigService,
  SystemPhase,
  HierarchySystem,
  TTLSystem,
  World,
  WebAudioPlayer,
  System,
  ShapeType,
  CircleShape,
  BoxShape,
  BlueprintDefinition,
  Theme,
  resolveThemeColor,
  EntityBuilder,
  ParticleSystem,
  Renderer,
  RendererUtils
} from "@tiny-aster/core";
import * as SharedVFX from "../shared/rendering/SharedVFX";
import { CombatSystem, CollisionLayers, AchievementSystem, PowerUpSystem, SharedParticlePool } from "@tiny-aster/gameplay-kit";
import { ComboSystem } from "@tiny-aster/core";
import { BENEFICIAL_MUTATORS } from "../../utils/MutatorRegistry";
import { loadAndMutateConfig } from "../shared/configHelper";
import { createThemeFromGameAccents } from "../../theme/gameAccents";

import { ArkanoidInputSystem } from "./systems/ArkanoidInputSystem";
import { ArkanoidSpinSystem } from "./systems/ArkanoidSpinSystem";
import { BrickRulesSystem } from "./systems/BrickRulesSystem";
import { ArkanoidCollisionSystem } from "./systems/ArkanoidCollisionSystem";
import { ArkanoidGameStateSystem } from "./systems/ArkanoidGameStateSystem";
import { ArkanoidEntityFactory } from "./EntityFactory";

import {
  ArkanoidComponentRegistry,
  ArkanoidEventRegistry,
  ArkanoidInput,
  ArkanoidStateComponent,
  BrickKind
} from "./types/ArkanoidTypes";
import {
  ArkanoidConfigSchema,
  ArkanoidConfig,
  DEFAULT_ARKANOID_CONFIG
} from "./types/ArkanoidConfigSchema";

import arkanoidConfigRaw from "./config/arkanoid.json";

export interface ArkanoidBlueprintMap extends Record<string, BlueprintDefinition<ArkanoidComponentRegistry, any, any>> {
  ball: BlueprintDefinition<ArkanoidComponentRegistry, any, {}>;
  paddle: BlueprintDefinition<ArkanoidComponentRegistry, any, {}>;
  brick: BlueprintDefinition<ArkanoidComponentRegistry, any, { x: number; y: number; kind: BrickKind }>;
  state: BlueprintDefinition<ArkanoidComponentRegistry, any, {}>;
}

export class ArkanoidGame extends BaseGame<ArkanoidStateComponent, ArkanoidInput, ArkanoidComponentRegistry, ArkanoidEventRegistry, ArkanoidBlueprintMap> {
  private stateSystem!: ArkanoidGameStateSystem;
  private assetLoader: AssetLoader;
  private particlePool: SharedParticlePool;
  public readonly gameId = "arkanoid";
  private baseConfig: ArkanoidConfig;
  private config!: ArkanoidConfig;

  constructor(options: { seed?: number; headless?: boolean; gameOptions?: Record<string, unknown>; assetProvider?: any; audio?: any; theme?: Theme } = {}) {
    const seed = options.seed ?? (options.gameOptions?.seed as number | undefined);
    const theme = options.theme ?? createThemeFromGameAccents("arkanoid");

    const isHeadless = options.headless ?? (typeof window === "undefined");
    super({
      pauseKey: "Escape",
      isMultiplayer: false,
      headless: isHeadless,
      manualLoop: isHeadless,
      assetProvider: options.assetProvider,
      theme,
      gameOptions: { seed, ...(options.gameOptions || {}) },
      audio: options.audio || new WebAudioPlayer()
    });

    this.baseConfig = ConfigService.load<ArkanoidConfig>(this.gameId, ArkanoidConfigSchema, arkanoidConfigRaw);
    this.config = this.baseConfig;
    this.particlePool = new SharedParticlePool();
    this.assetLoader = new AssetLoader(options.assetProvider);
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = loadAndMutateConfig(this.gameId, ArkanoidConfigSchema, arkanoidConfigRaw, this._config.gameOptions);

    this.world.setResource("GameConfig", this.config);
    this.world.setResource("ParticlePool", this.particlePool);
    if (arkanoidConfigRaw.grid) {
      this.world.setResource("LevelGrid", arkanoidConfigRaw.grid);
    }
    this.setupCommonArcadeResources();
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    this.blueprints.register("ball", {
      spawn: (world, entity, _args: {}) => {
        const config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;
        const tint = resolveThemeColor(world, "ball", "primary");

        EntityBuilder.fromEntity(world, entity)
          .withTransform({
            x: config.SCREEN_CENTER_X,
            y: config.PADDLE_Y - config.PADDLE_HEIGHT / 2 - config.BALL_SIZE,
            dirty: true
          })
          .withVelocity({ vx: 0, vy: 0 })
          .withRender({
            shape: "circle",
            size: config.BALL_SIZE,
            color: tint,
            order: 2
          })
          .withCollider({
            shape: { type: ShapeType.Circle, radius: config.BALL_SIZE } as CircleShape,
            layer: CollisionLayers.PROJECTILE,
            mask: CollisionLayers.PLAYER | CollisionLayers.ENEMY | CollisionLayers.BOUNDARY
          })
          .withCollisionEvents();

        world.addComponent(entity, {
          type: "Ball",
          isAttached: true,
          speed: config.BALL_SPEED_START,
          spinFactor: 0
        });
        world.addComponent(entity, { type: "Tag", tags: ["Ball"] });
      }
    });

    this.blueprints.register("paddle", {
      spawn: (world, entity, _args: {}) => {
        const config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;
        const tint = resolveThemeColor(world, "paddle", "primary");

        EntityBuilder.fromEntity(world, entity)
          .withTransform({
            x: config.SCREEN_CENTER_X,
            y: config.PADDLE_Y,
            dirty: true
          })
          .withVelocity({ vx: 0, vy: 0 })
          .withRender({
            shape: "box",
            size: config.PADDLE_WIDTH,
            color: tint,
            order: 1
          })
          .withCollider({
            shape: { type: ShapeType.Box, width: config.PADDLE_WIDTH, height: config.PADDLE_HEIGHT } as BoxShape,
            layer: CollisionLayers.PLAYER,
            mask: CollisionLayers.PROJECTILE
          });

        world.addComponent(entity, {
          type: "Paddle",
          speed: config.PLAYER_SPEED,
          previousX: config.SCREEN_CENTER_X,
          lastVelocityX: 0
        });
        world.addComponent(entity, { type: "Tag", tags: ["Paddle"] });
      }
    });

    this.blueprints.register("brick", {
      spawn: (world, entity, args: { x: number; y: number; kind: BrickKind }) => {
        const config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;
        const tint = resolveThemeColor(world, "brick", "accent");

        const hp = args.kind === "regenerable" ? 2 : 1;

        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y, dirty: true })
          .withRender({
            shape: "box",
            size: config.BRICK_WIDTH,
            color: tint,
            order: 1
          })
          .withCollider({
            shape: { type: ShapeType.Box, width: config.BRICK_WIDTH, height: config.BRICK_HEIGHT } as BoxShape,
            layer: CollisionLayers.ENEMY,
            mask: CollisionLayers.PROJECTILE
          })
          .withCollisionEvents();

        world.addComponent(entity, {
          type: "Health",
          current: hp,
          max: hp,
          invulnerableRemaining: 0
        });

        world.addComponent(entity, {
          type: "Brick",
          kind: args.kind,
          points: 100,
          hp,
          maxHp: hp,
          regenTimer: 0,
          regenDuration: 5.0
        });
        world.addComponent(entity, { type: "Tag", tags: ["Brick", args.kind] });
      }
    });

    this.blueprints.register("state", {
      spawn: (world, entity, _args: {}) => {
        const config = world.getResource<ArkanoidConfig>("GameConfig") || DEFAULT_ARKANOID_CONFIG;

        world.addComponent(entity, {
          type: "ArkanoidState",
          score: 0,
          lives: config.PLAYER_INITIAL_LIVES,
          level: 1,
          isGameOver: false,
          isVictory: false,
          bricksRemaining: 0
        });

        world.addComponent(entity, {
          type: "Combo",
          combo: 0,
          multiplier: 1,
          timerRemaining: 0,
          timerDuration: 2.0
        });
      }
    });

    this.unifiedInput.bind("p1Left", ["ArrowLeft", "KeyA"]);
    this.unifiedInput.bind("p1Right", ["ArrowRight", "KeyD"]);
    this.unifiedInput.bind("p1Launch", ["Space", "KeyW", "ArrowUp"]);

    if (this.unifiedInput instanceof System) {
      this.world.addSystem(this.unifiedInput as System<ArkanoidComponentRegistry, ArkanoidEventRegistry>, { phase: SystemPhase.Input });
    }

    this.world.addSystem(new ArkanoidInputSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ArkanoidSpinSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ParticleSystem(this.particlePool) as System<ArkanoidComponentRegistry, ArkanoidEventRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(new AchievementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PowerUpSystem(), { phase: SystemPhase.Simulation });

    this.world.addSystem(new HierarchySystem(), { phase: SystemPhase.Transform });

    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CombatSystem(), { phase: SystemPhase.Collision });

    this.stateSystem = new ArkanoidGameStateSystem();
    this.world.addSystem(new ArkanoidCollisionSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(this.stateSystem, { phase: SystemPhase.GameRules });
    this.world.addSystem(new BrickRulesSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new ComboSystem(), { phase: SystemPhase.GameRules });

    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
  }

  protected override async onInitializeEntities(): Promise<void> {
    this.world.gameplayRandom.unlock();
    try {
      ArkanoidEntityFactory.createPaddle(this.world);
      ArkanoidEntityFactory.createBall(this.world);
      ArkanoidEntityFactory.createGameState(this.world);

      this.stateSystem.spawnLevelBricks(this.world, 1);

      const activeBeneficials = (this._config.gameOptions?.activeBeneficialMutators as string[]) || [];
      for (const mutatorId of activeBeneficials) {
        const mutator = BENEFICIAL_MUTATORS[mutatorId];
        if (mutator) {
          mutator.apply(this.world);
        }
      }
    } finally {
      this.world.gameplayRandom.lock();
    }
  }

  protected override async onBeforeRestart(): Promise<void> {
    this.stateSystem?.resetGameOverState(this.world);
  }

  public override update(dt: number): void {
    this.world.update(dt);
  }

  public initializeRenderer(renderer: Renderer<ArkanoidComponentRegistry, any>): void {
    RendererUtils.registerAssets(renderer, {
      canvas: (r) => {
        /* eslint-disable @typescript-eslint/no-require-imports */
        const { drawArkanoidBall, drawArkanoidPaddle, drawArkanoidBrick, drawArkanoidBackground } = require("./rendering/ArkanoidCanvasVisuals");
        r.registerShape("ball", drawArkanoidBall);
        r.registerShape("circle", drawArkanoidBall);
        r.registerShape("paddle", drawArkanoidPaddle);
        r.registerShape("box", drawArkanoidPaddle);
        r.registerShape("brick", drawArkanoidBrick);
        r.registerBackgroundEffect("arkanoid_bg", drawArkanoidBackground);

        r.registerBackgroundEffect("crt_scanlines", SharedVFX.RetroCRTScanlinesEffect);
        r.registerBackgroundEffect("border_glow", SharedVFX.ScreenBorderGlowEffect);
      },
      skia: (r) => {
        /* eslint-disable @typescript-eslint/no-require-imports */
        const { drawSkiaArkanoidBall, drawSkiaArkanoidPaddle, drawSkiaArkanoidBrick, drawSkiaArkanoidBackground } = require("./rendering/ArkanoidSkiaVisuals");
        r.registerShape("ball", drawSkiaArkanoidBall);
        r.registerShape("circle", drawSkiaArkanoidBall);
        r.registerShape("paddle", drawSkiaArkanoidPaddle);
        r.registerShape("box", drawSkiaArkanoidPaddle);
        r.registerShape("brick", drawSkiaArkanoidBrick);
        r.registerBackgroundEffect("arkanoid_bg", drawSkiaArkanoidBackground);

        r.registerBackgroundEffect("crt_scanlines", SharedVFX.SkiaRetroCRTScanlinesEffect);
        r.registerBackgroundEffect("border_glow", SharedVFX.SkiaScreenBorderGlowEffect);
      }
    });
  }

  public getGameState(): ArkanoidStateComponent {
    const state = this.world.getSingleton("ArkanoidState");
    return state ? { ...state } : {
      type: "ArkanoidState",
      score: 0,
      lives: 3,
      level: 1,
      isGameOver: false,
      isVictory: false,
      bricksRemaining: 0
    };
  }

  public override isGameOver(): boolean {
    const state = this.world.getSingleton("ArkanoidState");
    return state ? state.isGameOver : false;
  }

  protected override async onPreloadAssets(): Promise<void> {
    if (this.isHeadless) return;
    const audio = this.audio;
    const assets = [
      { id: "hit", path: "/audio/hit.mp3" },
      { id: "explosion", path: "/audio/explosion.mp3" },
      { id: "launch", path: "/audio/launch.mp3" },
      { id: "level_up", path: "/audio/level_up.mp3" },
      { id: "game_over", path: "/audio/game_over.mp3" },
    ];
    for (const asset of assets) {
      try {
        await audio.loadSFX(asset.id, asset.path);
      } catch (e) {
        console.warn(`[Audio] Failed to load asset "${asset.id}" from "${asset.path}":`, e);
      }
    }
  }
}

export const ArkanoidDefinition = {
  name: "arkanoid",
  createSimulation: (seed: number) => {
    return new ArkanoidGame({ seed, headless: true });
  },
  inputSchema: {
    actions: ["left", "right", "launch"]
  },
  assets: {
    sprites: [],
    sounds: []
  }
};
