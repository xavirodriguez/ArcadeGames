/* eslint-disable @typescript-eslint/no-require-imports */
import {
  World,
  GameLoop,
  BaseGame,
  BaseGameConfig,
  AssetLoader,
  JuiceSystem,
  MutatorSystem,
  SpatialPartitioningSystem,
  SpatialCullingSystem,
  RenderUpdateSystem,
  MovementSystem,
  BoundarySystem,
  FrictionSystem,
  ScreenShakeSystem,
  JoystickSystem,
  TTLSystem,
  InvulnerabilitySystem,
  CollisionSystem2D,
  CCDSystem,
  FeedbackSystem,
  InputFrame,
  Renderer,
  NetworkManager,
  NullTransport,
  LocalPredictionSystem,
  RemoteInterpolationSystem,
  NetworkController,
  computeShipPhysics,
  INetworkGame,
  ConfigService,
  SystemPhase,
  ServerUpdatePayload,
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  HealthComponent,
  ColliderComponent,
  CollisionEventsComponent,
  TTLComponent,
  BoundaryComponent,
  ShapeType,
  CircleShape
} from "@tiny-aster/core";

import { LootSystem, PowerUpSystem } from "../shared/arcade";
import { CollisionLayers } from "../shared/types/CollisionLayers";
import * as SharedVFX from "../shared/rendering/SharedVFX";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry, AsteroidsBlueprintMap } from "./types/AsteroidRegistry";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { INITIAL_GAME_STATE } from "./types/AsteroidTypes";
import { createShip, spawnAsteroidWave, registerAsteroidsBlueprints } from "./EntityFactory";
import type { IAsteroidsGame } from "./types/GameInterfaces";
import { BulletPool, ParticlePool } from "./EntityPool";
import { initializeAsteroidsRenderer } from "./rendering/AsteroidsRendererManager";
import { AsteroidConfigSchema, AsteroidConfig } from "./types/AsteroidConfigSchema";
import { GameStateComponent, InputState } from "./types/AsteroidTypes";

const __DEV__ = process.env.NODE_ENV !== "production";

/**
 * Main game controller for Asteroids.
 * Manages the ECS world, systems, and lifecycle.
 * @public
 */
export class AsteroidsGame
  extends BaseGame<GameStateComponent, InputState, AsteroidsComponentRegistry, AsteroidsEventRegistry, AsteroidsBlueprintMap>
  implements IAsteroidsGame, INetworkGame {

  private gameStateSystem!: AsteroidGameStateSystem;
  private assetLoader!: AssetLoader;
  private bulletPool!: BulletPool;
  private particlePool!: ParticlePool;
  private network!: NetworkController<AsteroidsComponentRegistry>;
  public readonly gameId = "asteroids";
  private config: AsteroidConfig;
  private resizeListener?: () => void;
  private isHeadless: boolean;

  public get networkManager(): NetworkManager | undefined { return this.network.networkManager; }
  public set networkManager(val: NetworkManager | undefined) { this.network.networkManager = val; }
  public get lastProcessedFullStateVersion(): number { return this.network.lastProcessedFullStateVersion; }
  public set lastProcessedFullStateVersion(val: number) { this.network.lastProcessedFullStateVersion = val; }
  public get isMultiplayer(): boolean { return this.network.isMultiplayer; }
  public set isMultiplayer(val: boolean) { this.network.isMultiplayer = val; }

  constructor(config: BaseGameConfig = {}) {
    super(config);
    this.isHeadless = config.headless || false;
    this.network = new NetworkController<AsteroidsComponentRegistry>(this.world);
    this.isMultiplayer = config.isMultiplayer || false;
    const rawConfig = require("./config/asteroids.json");
    this.config = ConfigService.load<AsteroidConfig>(this.gameId, AsteroidConfigSchema, rawConfig);
  }

  protected override async onRegisterSystems(): Promise<void> {
    const rawConfig = require("./config/asteroids.json");
    const baseConfig = ConfigService.load<AsteroidConfig>(this.gameId, AsteroidConfigSchema, rawConfig);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mutators = (this._config.gameOptions?.mutators as any[]) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.config = mutators.reduce((cfg, m) => m.apply(cfg), { ...baseConfig } as any);

    this.world.setResource("GameConfig", this.config);
    this.updateScreenConfig();

    if (typeof window !== "undefined") {
        this.resizeListener = () => this.updateScreenConfig();
        window.addEventListener("resize", this.resizeListener);
    }

    if (!this.isHeadless) {
        await this.onPreloadAssets();
    }

    if (!this.bulletPool) this.bulletPool = new BulletPool();
    if (!this.particlePool) this.particlePool = new ParticlePool();
    if (!this.assetLoader) this.assetLoader = new AssetLoader();

    // Register blueprints using centralized helper
    registerAsteroidsBlueprints(this.world, this.blueprints);

    if (!this.networkManager) {
      this.networkManager = NetworkManager.registerGame(this.gameId, this, {
        strategy: 'full',
        interpolationDelay: 100,
        transport: this.isMultiplayer ? undefined : new NullTransport()
      });
    } else if (!this.isMultiplayer) {
      this.networkManager.setTransport(new NullTransport());
    }

    this.world.setResource("BulletPool", this.bulletPool);
    this.world.setResource("ParticlePool", this.particlePool);
    this.world.setResource("AssetLoader", this.assetLoader);

    this.gameStateSystem = new AsteroidGameStateSystem(this);

    this.world.setResource("SpatialCullingEnabled", true);

    this.world.addSystem(new JoystickSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new SpatialCullingSystem({ margin: 100 }), { phase: SystemPhase.Simulation, priority: 100 });
    this.world.addSystem(new AsteroidInputSystem(this.config), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new FrictionSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new CCDSystem(), { phase: SystemPhase.Simulation, priority: -10 });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new AsteroidCollisionSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new InvulnerabilitySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(this.gameStateSystem, { phase: SystemPhase.GameRules });

    this.world.addSystem(new SpatialPartitioningSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new LootSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new PowerUpSystem(), { phase: SystemPhase.Simulation });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeMutators = (this._config.gameOptions?.mutators as any[]) || [];
    this.world.addSystem(new MutatorSystem(activeMutators), { phase: SystemPhase.Simulation });

    if (!this.isHeadless) {
      this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new FeedbackSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
    }

    if (this.networkManager) {
      this.world.addSystem(new LocalPredictionSystem(this.networkManager, (world, input, dt) => {
        const localQuery = world.query("Transform" as any, "LocalPlayer" as any, "Velocity" as any);
        for (const entity of localQuery) {
            const velocity  = world.getComponent(entity, "Velocity" as any) as any;
            const transform = world.getComponent(entity, "Transform" as any) as any;
            if (!velocity || !transform) continue;

            const tPlane = { rotation: transform.rotation };
            const vPlane = { vx: velocity.vx, vy: velocity.vy };

            const phys = computeShipPhysics(tPlane, vPlane, input as any, this.config, dt);

            world.mutateComponent(entity, "Velocity" as any, (v: any) => {
                v.vx = phys.vx;
                v.vy = phys.vy;
            });
            world.mutateComponent(entity, "Transform" as any, (t: any) => {
                t.rotation = phys.rotation;
            });
        }
      }), { phase: SystemPhase.Input });
      this.world.addSystem(new RemoteInterpolationSystem(this.networkManager), { phase: SystemPhase.Presentation });
    }
  }

  protected override async onInitializeEntities(): Promise<void> {
    if (this.isMultiplayer) return;

    // Temporarily unlock gameplayRandom for spawning initialization
    this.world.gameplayRandom.unlock();

    try {
        // Create GameState entity
        const gameStateEntity = this.world.createEntity();
        this.world.addComponent(gameStateEntity, {
            type: "GameState",
            score: 0,
            level: 1,
            lives: 3,
            isGameOver: false
        } as GameStateComponent);

        // Create Player Ship
        const screen = this.world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
        const ship = createShip({
            world: this.world,
            x: screen.width / 2,
            y: screen.height / 2
        });

        // Add LocalPlayer and Input components to the ship
        this.world.addComponent(ship, { type: "LocalPlayer" });
        this.world.addComponent(ship, {
            type: "Input",
            actions: {},
            axes: {}
        });

        // Spawn first wave
        spawnAsteroidWave(this.world, 1);
    } finally {
        this.world.gameplayRandom.lock();
    }
  }

  public update(dt: number): void {
      this.world.update(dt);
  }

  private updateScreenConfig(): void {
    let width = this.config?.SCREEN_WIDTH ?? 800;
    let height = this.config?.SCREEN_HEIGHT ?? 600;

    if (typeof window !== "undefined") {
        width = window.innerWidth;
        height = window.innerHeight;
    }

    const screenConfig = { width, height };
    this.world.setResource("ScreenConfig", screenConfig);

    if (__DEV__) {
        console.log(`[AsteroidsGame] ScreenConfig updated: ${width}x${height}`);
    }
  }

  /**
   * Preloads game assets (SFX and Textures) to prevent cold-start latency.
   *
   * @warning
   * Asset loading may fail due to network or filesystem issues. Failure to
   * preload assets may result in visual or audio artifacts during gameplay.
   */
  private async onPreloadAssets(): Promise<void> {
    const loader = this.assetLoader;
    try {
      if (loader) {
        await loader.load([
          { id: "ship_sprite", type: "image", path: "../../../assets/ship.png" }
        ]);
      }
    } catch (e) {
      console.warn("[Asteroids] Asset preloading failed. Visuals or Audio may lag.", e);
    }
  }

  public setMultiplayerMode(active: boolean) {
    this.network.setMultiplayerMode(active);
  }

  /**
   * Applies an input frame to a specific player ship entity.
   */
  public applyInputToEntity(entityId: number, input: InputFrame) {
    this.network.applyInputToEntity(entityId, input);
  }


  /**
   * Performs local player movement prediction using the shared simulation.
   */
  public predictLocalPlayer(input: InputFrame, deltaTime: number) {
    this.network.predictLocalPlayer(input, deltaTime);
  }

  /**
   * Runs a single simulation step.
   */
  public runSimulationStep(deltaTime: number, isResimulating: boolean) {
    this.network.runSimulationStep(deltaTime, isResimulating);
  }

  public updateFromServer(payload: ServerUpdatePayload, localSessionId?: string) {
    this.network.updateFromServer(payload, localSessionId);
  }

  /**
   * Registers game-specific rendering logic to the provided renderer.
   */
  public initializeRenderer(renderer: Renderer<AsteroidsComponentRegistry>): void {
    if (this.isHeadless) return;
    initializeAsteroidsRenderer(renderer);

    if ((renderer as any).type === "canvas") {
      (renderer as any).registerBackgroundEffect("starfield", SharedVFX.ScrollingStarfieldEffect);
      (renderer as any).registerBackgroundEffect("crt_scanlines", SharedVFX.RetroCRTScanlinesEffect);
      (renderer as any).registerBackgroundEffect("warp_speed", SharedVFX.HyperdriveWarpSpeedLinesEffect);
      (renderer as any).registerBackgroundEffect("nebula", SharedVFX.DriftingNebulaBackgroundEffect);
      (renderer as any).registerBackgroundEffect("matrix_rain", SharedVFX.MatrixDigitalRainEffect);
      (renderer as any).registerBackgroundEffect("crt_glitch", SharedVFX.CRTGlitchShudderEffect);
      (renderer as any).registerBackgroundEffect("border_glow", SharedVFX.ScreenBorderGlowEffect);
      (renderer as any).registerShape("shield_bubble", SharedVFX.EnergyShieldBubbleEffect);
      (renderer as any).registerShape("shockwave", SharedVFX.DebrisShockwaveEffect);
      (renderer as any).registerShape("thruster_flame", SharedVFX.ThrusterPlumeFlameEffect);
      (renderer as any).registerShape("laser_beam", SharedVFX.LaserRailBeamEffect);
      (renderer as any).registerShape("singularity", SharedVFX.SingularityVortexEffect);
      (renderer as any).registerShape("comet_trail", SharedVFX.CometMotionTrailEffect);
      (renderer as any).registerShape("hologram_glitch", SharedVFX.RGBHologramGlitchEffect);
      (renderer as any).registerShape("floating_text", SharedVFX.FloatingTextScoreEffect);
    } else if ((renderer as any).type === "skia") {
      (renderer as any).registerBackgroundEffect("starfield", SharedVFX.SkiaScrollingStarfieldEffect);
      (renderer as any).registerBackgroundEffect("crt_scanlines", SharedVFX.SkiaRetroCRTScanlinesEffect);
      (renderer as any).registerBackgroundEffect("warp_speed", SharedVFX.SkiaHyperdriveWarpSpeedLinesEffect);
      (renderer as any).registerBackgroundEffect("nebula", SharedVFX.SkiaDriftingNebulaBackgroundEffect);
      (renderer as any).registerBackgroundEffect("matrix_rain", SharedVFX.SkiaMatrixDigitalRainEffect);
      (renderer as any).registerBackgroundEffect("crt_glitch", SharedVFX.SkiaCRTGlitchShudderEffect);
      (renderer as any).registerBackgroundEffect("border_glow", SharedVFX.SkiaScreenBorderGlowEffect);
      (renderer as any).registerShape("shield_bubble", SharedVFX.SkiaEnergyShieldBubbleEffect);
      (renderer as any).registerShape("shockwave", SharedVFX.SkiaDebrisShockwaveEffect);
      (renderer as any).registerShape("thruster_flame", SharedVFX.SkiaThrusterPlumeFlameEffect);
      (renderer as any).registerShape("laser_beam", SharedVFX.SkiaLaserRailBeamEffect);
      (renderer as any).registerShape("singularity", SharedVFX.SkiaSingularityVortexEffect);
      (renderer as any).registerShape("comet_trail", SharedVFX.SkiaCometMotionTrailEffect);
      (renderer as any).registerShape("hologram_glitch", SharedVFX.SkiaRGBHologramGlitchEffect);
      (renderer as any).registerShape("floating_text", SharedVFX.SkiaFloatingTextScoreEffect);
    }
  }

  public getGameState(): GameStateComponent {
    const state = this.world.getSingleton("GameState");
    return state ? { ...state } : INITIAL_GAME_STATE;
  }

  public isGameOver(): boolean {
    return this.gameStateSystem.isGameOver();
  }

  /**
   * Decoupled Input Bridge: Sets the state of the local player inputs in the ECS World.
   * Mapped fields: rotateLeft, rotateRight, thrust, shoot, hyperspace, rotationAmount.
   * Ensures that the LocalPlayer entity has the "Input" component, adding it if missing.
   */
  public setInputState(input: Partial<InputState>): void {
    // Paso 1: Unificar el puente de Inputs
    const localPlayer = this.world.query("LocalPlayer")[0];
    if (localPlayer !== undefined) {
      if (!this.world.hasComponent(localPlayer, "Input")) {
        // Verify that the LocalPlayer entity has the "Input" component, adding it if missing with all flags false and rotationAmount 0.
        this.world.addComponent(localPlayer, {
          type: "Input",
          actions: {},
          axes: {}
        });
      }
      this.world.mutateComponent(localPlayer, "Input", (inputComp: any) => {
        if (!inputComp.actions || typeof inputComp.actions !== "object" || inputComp.actions instanceof Set) {
          inputComp.actions = {};
        }
        if (!inputComp.axes) inputComp.axes = {};

        // Only write fields that are defined in the payload (!== undefined)
        if (input.rotateLeft !== undefined) {
          inputComp.actions["rotateLeft"] = input.rotateLeft;
        }
        if (input.rotateRight !== undefined) {
          inputComp.actions["rotateRight"] = input.rotateRight;
        }
        if (input.thrust !== undefined) {
          inputComp.actions["thrust"] = input.thrust;
        }
        if (input.shoot !== undefined) {
          inputComp.actions["shoot"] = input.shoot;
        }
        if (input.hyperspace !== undefined) {
          inputComp.actions["hyperspace"] = input.hyperspace;
        }
        if (input.rotationAmount !== undefined) {
          inputComp.axes["rotate_x"] = input.rotationAmount;
          inputComp.axes["horizontal"] = input.rotationAmount;
        }
      });
    }
  }

  public override start(): void {
    super.start();
    if (__DEV__) console.log("[AsteroidsGame] Simulation started");
  }

  public override destroy(): void {
    super.destroy();
    // Limpiar el listener de resize registrado en window para evitar fugas de memoria
    if (this.resizeListener && typeof window !== "undefined") {
      window.removeEventListener("resize", this.resizeListener);
      this.resizeListener = undefined;
    }
    this.bulletPool?.clear();
    this.particlePool?.clear();
  }

  public override pause(): void {
    super.pause();
    this.world.setResource("IsPaused", true);
    if (__DEV__) console.log("[AsteroidsGame] Simulation paused");
  }

  public override resume(): void {
    super.resume();
    this.world.setResource("IsPaused", false);
    if (__DEV__) console.log("[AsteroidsGame] Simulation resumed");
  }

}

/** @public */
export class NullAsteroidsGame implements IAsteroidsGame {
  private _world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
  private _loop = new GameLoop();
  public getWorld() { return this._world; }
  public getGameLoop() { return this._loop; }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_GAME_STATE; }
  public getSeed() { return 0; }
  public subscribe(_listener: unknown) { return () => {}; }
  public initializeRenderer() {}
  public setInputState(_input: Partial<InputState>) {}
}
