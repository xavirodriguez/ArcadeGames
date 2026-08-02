/* eslint-disable @typescript-eslint/no-require-imports */
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
  Renderer,
  MutatorSystem,
  SystemPhase,
  ServerUpdatePayload
} from "@tiny-aster/core";
import { PongCollisionSystem } from "./systems/PongCollisionSystem";
import { PongGameStateSystem } from "./systems/PongGameStateSystem";
import { PongVelocityGuardrailSystem } from "./systems/PongVelocityGuardrailSystem";
import { PongInputSystem } from "./systems/PongInputSystem";
import { PongSpinSystem } from "./systems/PongSpinSystem";
import { PongEntityFactory } from "./EntityFactory";
import { NetworkController } from "./input/NetworkController";
import { type PongState, type PongInput, type PongComponentRegistry } from "./types";
import { PongConfigSchema, PongConfig, DEFAULT_PONG_CONFIG } from "./types/PongConfigSchema";
import { drawPongBall } from "./rendering/PongCanvasVisuals";
import { CollisionLayers } from "../shared/types/CollisionLayers";
import * as SharedVFX from "../shared/rendering/SharedVFX";

export type PongMode = "local" | "ai" | "online";

/**
 * Controlador principal del juego Pong.
 *
 * @remarks
 * Implementa una física de rebotes basada en el ángulo de incidencia y el movimiento
 * relativo de las paletas (spin). Gestiona modos de juego contra IA o multijugador local.
 */
import { TransformComponent, VelocityComponent, ColliderComponent, CircleShape, BoxShape, ShapeType, BlueprintDefinition } from "@tiny-aster/core";

export interface PongBlueprintMap extends Record<string, BlueprintDefinition<PongComponentRegistry, any, any>> {
  ball: BlueprintDefinition<PongComponentRegistry, any, {}>;
  paddle: BlueprintDefinition<PongComponentRegistry, any, { side: "left" | "right" }>;
  state: BlueprintDefinition<PongComponentRegistry, any, {}>;
}

export class PongGame extends BaseGame<PongState, PongInput, PongComponentRegistry, any, PongBlueprintMap> {
  private stateSystem!: PongGameStateSystem;
  private assetLoader: AssetLoader;
  private networkController?: NetworkController;
  public readonly gameId = "pong";
  private config!: PongConfig;

  private stallStartTime = 0;
  private isStalled = false;

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown>, mode?: PongMode } | PongMode = "local") {
    const isConfig = typeof config === "object" && config !== null;
    const mode = isConfig
      ? (config.gameOptions?.mode as PongMode || config.mode || "local")
      : config;
    const isMultiplayer = isConfig ? config.isMultiplayer : false;
    const seed = isConfig ? (config.gameOptions?.seed as number || config.seed) : undefined;

    super({
      pauseKey: "Escape",
      isMultiplayer,
      gameOptions: { mode, seed, ...((isConfig && config.gameOptions) || {}) }
    });
    this.assetLoader = new AssetLoader();
  }

  protected override async onRegisterSystems(): Promise<void> {
    const rawConfig = require("./config/pong.json");
    const baseConfig = ConfigService.load<PongConfig>(this.gameId, PongConfigSchema, rawConfig);

    const mutators = (this._config.gameOptions?.mutators as any[]) || (this._config.gameOptions?.activeMutators as any[]) || [];
    this.config = mutators.length > 0
      ? mutators.reduce((cfg, m) => (m as any).apply(cfg), { ...baseConfig }) as PongConfig
      : { ...baseConfig };

    this.world.setResource("GameConfig", this.config);
    this.world.setResource("ScreenConfig", { width: this.config.WIDTH, height: this.config.HEIGHT });
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    await this.onPreloadAssets();

    // Register blueprints
    this.blueprints.register("ball", {
      spawn: (world, entity, _args: {}) => {
        const config = world.getResource<PongConfig>("GameConfig") || DEFAULT_PONG_CONFIG;
        world.addComponent(entity, {
          type: "Transform",
          x: config.WIDTH / 2,
          y: config.HEIGHT / 2,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          worldX: config.WIDTH / 2,
          worldY: config.HEIGHT / 2,
          worldRotation: 0,
          worldScaleX: 1,
          worldScaleY: 1,
          dirty: true
        } as TransformComponent);
        world.addComponent(entity, {
          type: "Velocity",
          vx: config.BALL_SPEED_START,
          vy: config.BALL_SPEED_START * (world.gameplayRandom.next() > 0.5 ? 1 : -1),
          angularVelocity: 0
        } as VelocityComponent);
        world.addComponent(entity, {
          type: "Render",
          shape: "circle",
          size: config.BALL_SIZE,
          color: "white",
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 0,
          angularVelocity: 0,
          hitFlashFrames: 0
        } as any);
        world.addComponent(entity, {
          type: "Collider",
          shape: { type: ShapeType.Circle, radius: config.BALL_SIZE } as CircleShape,
          layer: CollisionLayers.PROJECTILE,
          mask: CollisionLayers.PLAYER,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as ColliderComponent);
        world.addComponent(entity, {
          type: "Boundary",
          width: config.WIDTH,
          height: config.HEIGHT,
          mode: "bounce"
        } as any);
        world.addComponent(entity, {
          type: "CollisionEvents",
          collisions: [],
          activeTriggers: [],
          triggersEntered: [],
          triggersExited: []
        } as any);
        world.addComponent(entity, { type: "Tag", tags: ["Ball"] } as any);
        world.addComponent(entity, { type: "Ball", spinFactor: 0, spinDecay: 0.02 } as any);
      }
    });

    this.blueprints.register("paddle", {
      spawn: (world, entity, args: { side: "left" | "right" }) => {
        const config = world.getResource<PongConfig>("GameConfig") || DEFAULT_PONG_CONFIG;
        const x = args.side === "left" ? 40 : config.WIDTH - 40;
        const y = config.HEIGHT / 2;
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
          dirty: true
        } as TransformComponent);
        world.addComponent(entity, {
          type: "Velocity",
          vx: 0,
          vy: 0,
          angularVelocity: 0
        } as VelocityComponent);
        world.addComponent(entity, {
          type: "Render",
          shape: "polygon",
          size: config.PADDLE_WIDTH,
          color: "white",
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 0,
          angularVelocity: 0,
          hitFlashFrames: 0,
          vertices: [
            { x: -config.PADDLE_WIDTH / 2, y: -config.PADDLE_HEIGHT / 2 },
            { x: config.PADDLE_WIDTH / 2, y: -config.PADDLE_HEIGHT / 2 },
            { x: config.PADDLE_WIDTH / 2, y: config.PADDLE_HEIGHT / 2 },
            { x: -config.PADDLE_WIDTH / 2, y: config.PADDLE_HEIGHT / 2 },
          ]
        } as any);
        world.addComponent(entity, {
          type: "Collider",
          shape: { type: ShapeType.Box, width: config.PADDLE_WIDTH, height: config.PADDLE_HEIGHT } as BoxShape,
          layer: CollisionLayers.PLAYER,
          mask: CollisionLayers.PROJECTILE,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as ColliderComponent);
        world.addComponent(entity, { type: "Tag", tags: ["Paddle", args.side] } as any);
        world.addComponent(entity, { type: "Paddle", side: args.side, previousY: y, lastVelocityY: 0 } as any);
      }
    });

    this.blueprints.register("state", {
      spawn: (world, entity, _args: {}) => {
        world.addComponent(entity, {
          type: "PongState",
          scoreP1: 0,
          scoreP2: 0,
          isGameOver: false,
          comboMultiplier: 1,
          gameOverLogged: false
        } as any);
      }
    });

    const mode = this._config.gameOptions?.mode || "local";
    const aiDifficulty = mode === "ai" ? "medium" : undefined;

    // Bind inputs for UnifiedInputSystem
    this.unifiedInput.bind("p1Up", ["KeyW"]);
    this.unifiedInput.bind("p1Down", ["KeyS"]);
    this.unifiedInput.bind("p2Up", ["ArrowUp"]);
    this.unifiedInput.bind("p2Down", ["ArrowDown"]);

    this.stateSystem = new PongGameStateSystem(this.config);
    this.world.addSystem(this.unifiedInput as any, { phase: SystemPhase.Input });

    if (mode === "online") {
      this.networkController = new NetworkController();
      this.world.addSystem(new PongInputSystem(undefined, this.networkController), { phase: SystemPhase.Simulation });
    } else {
      this.world.addSystem(new PongInputSystem(aiDifficulty as any), { phase: SystemPhase.Simulation });
    }

    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PongSpinSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new PongVelocityGuardrailSystem(), { phase: SystemPhase.Simulation });

    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });

    this.world.addSystem(new PongCollisionSystem(this.config), { phase: SystemPhase.GameRules });
    this.world.addSystem(this.stateSystem, { phase: SystemPhase.GameRules });

    this.world.addSystem(new MutatorSystem(mutators as any), { phase: SystemPhase.Simulation });

    // Visual / Presentation
    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
  }

  protected override async onInitializeEntities(): Promise<void> {
    PongEntityFactory.createBall(this.world);
    PongEntityFactory.createPaddle(this.world, "left");
    PongEntityFactory.createPaddle(this.world, "right");
    PongEntityFactory.createGameState(this.world);
  }

  protected override async onBeforeRestart(): Promise<void> {
    this.stateSystem?.resetGameOverState(this.world);
  }

  public override update(dt: number): void {
    if (this.shouldStallSimulation()) {
      if (!this.isStalled) {
        this.isStalled = true;
        this.stallStartTime = Date.now();
      } else {
        const stalledDuration = Date.now() - this.stallStartTime;
        if (stalledDuration > 3000) {
          console.warn(`[PongGame] Simulation stalled: Waiting for server inputs for ${stalledDuration}ms`);
          this.eventBus.emit("simulation:stalled" as any, { duration: stalledDuration } as any);
        }
      }
      return;
    }

    if (this.isStalled) {
      this.isStalled = false;
      this.eventBus.emit("simulation:unstalled" as any, {} as any);
    }

    this.world.update(dt);
  }

  private async onPreloadAssets(): Promise<void> {
    // Audio preloading moved to game logic or specific service if needed
  }

  public initializeRenderer(renderer: Renderer<PongComponentRegistry>): void {
    if ((renderer as any).type === "canvas") {
      (renderer as any).registerShape("circle", drawPongBall); // Override default circle with spinning ball

      // Register custom new VFX - Overlay CRT grid, screen glow, and glitching on the Pong board!
      (renderer as any).registerBackgroundEffect("crt_scanlines", SharedVFX.RetroCRTScanlinesEffect);
      (renderer as any).registerBackgroundEffect("border_glow", SharedVFX.ScreenBorderGlowEffect);
      (renderer as any).registerBackgroundEffect("crt_glitch", SharedVFX.CRTGlitchShudderEffect);
    } else if ((renderer as any).type === "skia") {
      // Register custom new VFX - Overlay CRT grid, screen glow, and glitching on the Pong board!
      (renderer as any).registerBackgroundEffect("crt_scanlines", SharedVFX.SkiaRetroCRTScanlinesEffect);
      (renderer as any).registerBackgroundEffect("border_glow", SharedVFX.SkiaScreenBorderGlowEffect);
      (renderer as any).registerBackgroundEffect("crt_glitch", SharedVFX.SkiaCRTGlitchShudderEffect);
    }
  }

  public getGameState(): PongState {
    const state = this.world.getSingleton("PongState");
    return state ? { ...state } : { type: "PongState", scoreP1: 0, scoreP2: 0, isGameOver: false, comboMultiplier: 1, gameOverLogged: false };
  }

  public isGameOver(): boolean {
    return this.stateSystem?.isGameOver() ?? false;
  }

  protected shouldStallSimulation(): boolean {
    if (this.networkController) {
      const inputSystem = (this.world as any).systems?.find((s: any) => s.system instanceof PongInputSystem)?.system as PongInputSystem;
      return !this.networkController.hasInputForTick(inputSystem?.currentTick + 1 || 0);
    }
    return false;
  }

  public updateFromServer(payload: ServerUpdatePayload) {
    if (this._config.gameOptions?.mode !== "online" || !payload) return;

    if (payload.kind === "delta") {
      const state = payload as any;
      if (this.networkController && state.input_relay) {
          this.networkController.onInputReceived({
              tick: state.tick as number,
              input: state.input as PongInput
          });
      }
    }
  }
}
