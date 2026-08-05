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
  ServerUpdatePayload,
  HierarchySystem
} from "@tiny-aster/core";
import { PongCollisionSystem } from "./systems/PongCollisionSystem";
import { PongGameStateSystem } from "./systems/PongGameStateSystem";
import { ComboSystem } from "../shared/arcade";
import { BENEFICIAL_MUTATORS, registerMutatorHook } from "../../utils/MutatorRegistry";
import { PongVelocityGuardrailSystem } from "./systems/PongVelocityGuardrailSystem";
import { PongInputSystem } from "./systems/PongInputSystem";
import { PongSpinSystem } from "./systems/PongSpinSystem";
import { PongEntityFactory } from "./EntityFactory";
import { NetworkController } from "./input/NetworkController";
import { type PongState, type PongInput, type PongComponentRegistry } from "./types";
import { PongConfigSchema, PongConfig, DEFAULT_PONG_CONFIG } from "./types/PongConfigSchema";
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

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown>, mode?: PongMode, assetProvider?: any } | PongMode = "local") {
    const isConfig = typeof config === "object" && config !== null;
    const mode = isConfig
      ? (config.gameOptions?.mode as PongMode || config.mode || "local")
      : config;
    const isMultiplayer = isConfig ? config.isMultiplayer : false;
    const seed = isConfig ? (config.gameOptions?.seed as number || config.seed) : undefined;
    const assetProvider = isConfig ? (config as any).assetProvider : undefined;

    super({
      pauseKey: "Escape",
      isMultiplayer,
      assetProvider,
      gameOptions: { mode, seed, ...((isConfig && config.gameOptions) || {}) }
    });
    this.assetLoader = new AssetLoader(assetProvider);
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
          shape: "paddle",
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
        const hasShieldPulse = world.getResource("HasShieldPulse") === true;
        const initialScoreP1 = world.getResource("ExtraLifeScoreP1") === 1 ? 1 : 0;

        world.addComponent(entity, {
          type: "PongState",
          scoreP1: initialScoreP1,
          scoreP2: 0,
          isGameOver: false,
          comboMultiplier: 1,
          gameOverLogged: false,
          shieldPulseRemaining: hasShieldPulse ? 5.0 : 0.0,
          scoreFreezeRemaining: 0,
          lastScorer: null
        } as any);
        world.addComponent(entity, {
          type: "Combo",
          combo: 0,
          multiplier: 1,
          timerRemaining: 0,
          timerDuration: 2.0
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
    this.world.addSystem(new HierarchySystem(), { phase: SystemPhase.Transform });
    this.world.addSystem(new PongVelocityGuardrailSystem(), { phase: SystemPhase.Simulation });

    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });

    this.world.addSystem(new PongCollisionSystem(this.config), { phase: SystemPhase.GameRules });
    this.world.addSystem(this.stateSystem, { phase: SystemPhase.GameRules });
    this.world.addSystem(new ComboSystem() as any, { phase: SystemPhase.GameRules });

    this.world.addSystem(new MutatorSystem(mutators as any), { phase: SystemPhase.Simulation });

    // Visual / Presentation
    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
  }

  protected override async onInitializeEntities(): Promise<void> {
    // Temporarily unlock gameplayRandom for spawning initialization
    this.world.gameplayRandom.unlock();
    try {
      PongEntityFactory.createBall(this.world);
      PongEntityFactory.createPaddle(this.world, "left");
      PongEntityFactory.createPaddle(this.world, "right");
      PongEntityFactory.createGameState(this.world);


      // Apply active beneficial mutators
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

  public initializeRenderer(renderer: Renderer<PongComponentRegistry, any>): void {
    if (renderer.type === "canvas") {
      const { drawPongBall, drawPongPaddle, drawPongBackground } = require("./rendering/PongCanvasVisuals");
      renderer.registerShape("circle", drawPongBall); // Override default circle with spinning ball
      renderer.registerShape("paddle", drawPongPaddle); // Glowing neon paddles
      renderer.registerBackgroundEffect("pong_bg", drawPongBackground); // Custom grid grid background

      // Register standard fallback VFX too
      renderer.registerBackgroundEffect("crt_scanlines", SharedVFX.RetroCRTScanlinesEffect);
      renderer.registerBackgroundEffect("border_glow", SharedVFX.ScreenBorderGlowEffect);
      renderer.registerBackgroundEffect("crt_glitch", SharedVFX.CRTGlitchShudderEffect);
    } else if (renderer.type === "skia") {
      const { drawSkiaPongBall, drawSkiaPongPaddle, drawSkiaPongBackground } = require("./rendering/PongSkiaVisuals");
      renderer.registerShape("circle", drawSkiaPongBall);
      renderer.registerShape("paddle", drawSkiaPongPaddle);
      renderer.registerBackgroundEffect("pong_bg", drawSkiaPongBackground);

      // Register custom new VFX - Overlay CRT grid, screen glow, and glitching on the Pong board!
      renderer.registerBackgroundEffect("crt_scanlines", SharedVFX.SkiaRetroCRTScanlinesEffect);
      renderer.registerBackgroundEffect("border_glow", SharedVFX.SkiaScreenBorderGlowEffect);
      renderer.registerBackgroundEffect("crt_glitch", SharedVFX.SkiaCRTGlitchShudderEffect);
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

// ==========================================================================
// GAME-SPECIFIC MUTATOR HOOKS (DECOUPLED FROM CORE REGISTRY)
// ==========================================================================

registerMutatorHook("faster_bullets", (world) => {
  const config = world.getResource<any>("GameConfig");
  if (config && typeof config.PADDLE_SPEED === "number") {
    const newConfig = { ...config };
    newConfig.PADDLE_SPEED = Math.round(newConfig.PADDLE_SPEED * 1.15);
    world.setResource("GameConfig", newConfig);
  }
});

registerMutatorHook("extra_life", (world) => {
  world.setResource("ExtraLifeScoreP1", 1);
  const pongState = world.getSingleton("PongState" as any);
  if (pongState) {
    world.mutateSingleton("PongState" as any, (gs: any) => {
      if (typeof gs.scoreP1 === "number" && gs.scoreP1 === 0) {
        gs.scoreP1 = 1;
      }
    });
  }
});
