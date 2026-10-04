import {
  BaseGame,
  ConfigService,
  GameDefinition,
  NullBaseGame,
  Renderer,
  RenderContext,
  SystemPhase,
  MovementSystem,
  CollisionSystem2D,
  SpatialPartitioningSystem,
  RenderUpdateSystem,
  ScreenShakeSystem,
  FeedbackSystem,
  JuiceSystem,
  TrailSystem,
  Camera2DSystem,
  RemoteInterpolationSystem,
  LocalPredictionSystem,
  NetworkManager,
  NetworkController,
  NullTransport,
  INetworkGame,
  preloadSharedAudioManifest,
  SHARED_AUDIO_MANIFEST,
  WebAudioPlayer
} from "@tiny-aster/core";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import { loadAndMutateConfig } from "../shared/configHelper";
import { RacingConfigSchema, RacingConfig } from "./types/RacingConfigSchema";
import { RacingComponentRegistry, RacingEventRegistry, RacingBlueprintMap } from "./types/RacingRegistry";
import { RacingGameState, RacingInputState } from "./types/RacingTypes";
import { registerRacingBlueprints, spawnBlueprint } from "./EntityFactory";
import { RacingInputSystem } from "./systems/RacingInputSystem";
import { RacingSurfaceSystem } from "./systems/RacingSurfaceSystem";
import { RacingWallSystem } from "./systems/RacingWallSystem";
import { LapSystem } from "./systems/LapSystem";
import { RaceStateSystem } from "./systems/RaceStateSystem";
import { RacingEventsSystem } from "./systems/RacingEventsSystem";
import { HeadToHeadStateSystem } from "./systems/HeadToHeadStateSystem";
import { VehicleAISystem } from "./systems/VehicleAISystem";
import { computeCarPhysics } from "./physics/CarPhysics";
import { initializeRacingRenderer } from "./rendering/RacingRenderer";
import { createMainCamera2D } from "../shared/componentBuilders";
import racingConfigRaw from "./config/racing.json";

export class RacingGame extends BaseGame<
  RacingGameState,
  RacingInputState,
  RacingComponentRegistry,
  RacingEventRegistry,
  RacingBlueprintMap
> implements INetworkGame {
  public readonly gameId = "racing";
  private config: RacingConfig;
  private baseConfig: RacingConfig;
  private network?: NetworkController<RacingComponentRegistry>;

  constructor(config: {
    isMultiplayer?: boolean;
    seed?: number;
    gameOptions?: Record<string, unknown>;
    audio?: import("@tiny-aster/core").IAudioPlayer;
  } = {}) {
    super({
      pauseKey: "Escape",
      isMultiplayer: config.isMultiplayer,
      theme: createThemeFromGameAccents("racing"),
      gameOptions: { ...config.gameOptions, seed: config.gameOptions?.seed ?? config.seed },
      audio: config.audio ?? new WebAudioPlayer()
    });
    this.baseConfig = ConfigService.load<RacingConfig>(this.gameId, RacingConfigSchema, racingConfigRaw);
    this.config = this.baseConfig;
  }

  public get networkManager(): NetworkManager<RacingComponentRegistry> | undefined {
    return this.network?.networkManager;
  }

  public set networkManager(value: NetworkManager<RacingComponentRegistry> | undefined) {
    if (!this.network) this.network = new NetworkController<RacingComponentRegistry>(this.world);
    this.network.networkManager = value;
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = loadAndMutateConfig(this.gameId, RacingConfigSchema, racingConfigRaw, this._config.gameOptions);
    this.world.setResource("GameConfig", this.config);

    registerRacingBlueprints(this.world, this.blueprints as never);

    this.network ??= new NetworkController<RacingComponentRegistry>(this.world);
    this.networkManager ??= NetworkManager.registerGame(this.gameId, this, {
      strategy: "full",
      interpolationDelay: 100,
      transport: this._config.isMultiplayer ? undefined : new NullTransport()
    });

    this.world.addSystem(new RacingInputSystem(this.config), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new RacingSurfaceSystem(this.config), { phase: SystemPhase.Simulation });
    this.world.addSystem(new RacingWallSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new SpatialPartitioningSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new VehicleAISystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new LapSystem(this.config), { phase: SystemPhase.GameRules });
    this.world.addSystem(new HeadToHeadStateSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new RaceStateSystem(this.config), { phase: SystemPhase.GameRules });
    this.world.addSystem(new RacingEventsSystem(), { phase: SystemPhase.GameRules });

    if (!this.isHeadless) {
      this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new FeedbackSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new TrailSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new Camera2DSystem(), { phase: SystemPhase.Presentation });
    }

    if (this.networkManager) {
      this.world.addSystem(new LocalPredictionSystem(this.networkManager as never, {
        simulateFn: (world, input, dt) => {
          const cars = world.query("LocalPlayer" as never, "Transform" as never, "Velocity" as never);
          for (let i = 0; i < cars.length; i += 1) {
            const entity = cars[i];
            const transform = world.getComponent(entity, "Transform" as never);
            const velocity = world.getComponent(entity, "Velocity" as never);
            if (!transform || !velocity) continue;
            const result = computeCarPhysics(
              transform as unknown as { rotation: number },
              velocity as unknown as { vx: number; vy: number },
              input as RacingInputState,
              this.config,
              dt
            );
            const nextVelocity = world.getMutableComponent(entity, "Velocity" as never) as { vx: number; vy: number } | undefined;
            const nextTransform = world.getMutableComponent(entity, "Transform" as never) as { rotation: number; dirty: boolean } | undefined;
            if (nextVelocity) {
              nextVelocity.vx = result.vx;
              nextVelocity.vy = result.vy;
            }
            if (nextTransform) {
              nextTransform.rotation = result.rotation;
              nextTransform.dirty = true;
            }
          }
        }
      }) as never, { phase: SystemPhase.Input });
      this.world.addSystem(new RemoteInterpolationSystem(this.networkManager as never) as never, { phase: SystemPhase.Presentation });
    }
  }

  protected override async onInitializeEntities(): Promise<void> {
    const config = this.config;
    const state = spawnBlueprint(this.world, "state", {});

    const cx = config.WORLD_WIDTH / 2;
    const cy = config.WORLD_HEIGHT / 2;

    // Compact closed oval track: checkpoint 0 is the finish line and the
    // remaining gates force traversal around the circuit.
    const checkpoints = [
      { x: cx, y: cy - 300, rotation: 0, isFinish: true },
      { x: cx + 420, y: cy - 120, rotation: Math.PI / 2 },
      { x: cx + 420, y: cy + 180, rotation: Math.PI / 2 },
      { x: cx, y: cy + 300, rotation: 0 },
      { x: cx - 420, y: cy + 180, rotation: Math.PI / 2 },
      { x: cx - 420, y: cy - 120, rotation: Math.PI / 2 }
    ];

    for (let i = 0; i < checkpoints.length; i += 1) {
      const point = checkpoints[i];
      spawnBlueprint(this.world, "checkpoint", {
        index: i,
        x: point.x,
        y: point.y,
        width: config.CHECKPOINT_WIDTH,
        height: config.CHECKPOINT_HEIGHT,
        isFinish: point.isFinish
      });
    }

    const wall = config.WALL_THICKNESS;
    const walls = [
      { x: cx, y: cy - 470, width: 980, height: wall },
      { x: cx, y: cy + 470, width: 980, height: wall },
      { x: cx - 470, y: cy, width: wall, height: 700 },
      { x: cx + 470, y: cy, width: wall, height: 700 },
      { x: cx, y: cy - 90, width: 430, height: wall },
      { x: cx, y: cy + 90, width: 430, height: wall }
    ];

    for (let i = 0; i < walls.length; i += 1) {
      spawnBlueprint(this.world, "wall", walls[i]);
    }

    const car = spawnBlueprint(this.world, "car", {
      x: cx,
      y: cy - 380,
      rotation: Math.PI / 2
    });

    const lap = this.world.getMutableComponent(car, "Lap");
    if (lap) lap.lapStartedAt = 0;
    createMainCamera2D(this.world, car, {
      smoothingX: 6,
      smoothingY: 6,
      zoom: 1
    });
    void state;
  }

  public override update(dt: number): void {
    this.world.update(dt);
  }

  public setInputState(input: Partial<RacingInputState>): void {
    const car = this.world.query("LocalPlayer", "Input")[0];
    if (car === undefined) return;
    const component = this.world.getMutableComponent(car, "Input");
    if (!component) return;

    if (input.moveX !== undefined) component.axes.moveX = input.moveX;
    if (input.moveY !== undefined) component.axes.moveY = input.moveY;
    if (input.boost !== undefined) component.actions.boost = input.boost;
    if (input.brake !== undefined) component.actions.brake = input.brake;
  }

  public initializeRenderer(renderer: Renderer<RacingComponentRegistry, RenderContext>): void {
    initializeRacingRenderer(renderer);
  }

  public getGameState(): RacingGameState {
    const state = this.world.getSingleton("RacingState");
    return state
      ? { ...state }
      : {
          type: "RacingState",
          phase: "countdown",
          countdownRemaining: this.config.COUNTDOWN_SECONDS,
          currentLap: 1,
          totalLaps: this.config.TOTAL_LAPS,
          lastLapTime: 0,
          bestLapTime: null,
          raceTime: 0,
          isGameOver: false,
          position: 1
        };
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  protected override async onPreloadAssets(): Promise<void> {
    if (this.audio) await preloadSharedAudioManifest(this.audio);
  }
}

export class NullRacingGame extends NullBaseGame<RacingGameState, RacingInputState, RacingComponentRegistry> {
  public readonly gameId = "racing";

  public getGameState(): RacingGameState {
    return {
      type: "RacingState",
      phase: "finished",
      countdownRemaining: 0,
      currentLap: 1,
      totalLaps: 3,
      lastLapTime: 0,
      bestLapTime: null,
      raceTime: 0,
      isGameOver: false,
      position: 1
    };
  }

  public setInput(input: Partial<RacingInputState>): void {
    this.setInputState(input);
  }
}

export const RacingDefinition: GameDefinition = {
  name: "racing",
  createSimulation: (seed: number) => new RacingGame({ gameOptions: { seed } }),
  inputSchema: {
    actions: ["boost", "brake", "pause"],
    axes: ["moveX", "moveY"]
  },
  assets: {
    sprites: [],
    sounds: SHARED_AUDIO_MANIFEST
  }
};
