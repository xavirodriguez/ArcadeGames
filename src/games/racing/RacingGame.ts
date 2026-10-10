import {
  BaseGame,
  ConfigService,
  GameDefinition,
  NullBaseGame,
  Renderer,
  RenderContext,
  SystemPhase,
  MovementSystem,
  HierarchySystem,
  VehicleSteeringSystem,
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
import { TrackSpecSchema, TrackSpec } from "./types/TrackSpecSchema";
import { registerRacingBlueprints, spawnBlueprint } from "./EntityFactory";
import breakfastTrackRaw from "./config/tracks/breakfast_table.json";
import { RacingInputSystem } from "./systems/RacingInputSystem";
import { RacingSurfaceSystem } from "./systems/RacingSurfaceSystem";
import { RacingParticleSystem } from "./systems/RacingParticleSystem";
import { RacingWallSystem } from "./systems/RacingWallSystem";
import { LapSystem } from "./systems/LapSystem";
import { RaceStateSystem } from "./systems/RaceStateSystem";
import { RacingEventsSystem } from "./systems/RacingEventsSystem";
import { HeadToHeadStateSystem } from "./systems/HeadToHeadStateSystem";
import { VehicleAISystem } from "./systems/VehicleAISystem";
import { VehicleCollisionSystem } from "./systems/VehicleCollisionSystem";
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
    this.world.addSystem(new HierarchySystem(), { phase: SystemPhase.Transform });
    this.world.addSystem(new RacingSurfaceSystem(this.config), { phase: SystemPhase.Simulation });
    this.world.addSystem(new RacingWallSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new VehicleCollisionSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new SpatialPartitioningSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new VehicleAISystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new VehicleSteeringSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new LapSystem(this.config), { phase: SystemPhase.GameRules });
    this.world.addSystem(new HeadToHeadStateSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new RaceStateSystem(this.config), { phase: SystemPhase.GameRules });
    this.world.addSystem(new RacingEventsSystem(), { phase: SystemPhase.GameRules });

    if (!this.isHeadless) {
      this.world.addSystem(new RacingParticleSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new FeedbackSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new TrailSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new Camera2DSystem(), { phase: SystemPhase.Presentation });
    }

    if (this._config.isMultiplayer && this.networkManager) {
      this.world.addSystem(new LocalPredictionSystem(this.networkManager as never, {
        simulateFn: (world, input, dt) => {
          const state = world.getSingleton("RacingState") as RacingGameState | undefined;
          if (!state || state.phase !== "racing") return;

          const cars = world.query("LocalPlayer" as never, "Transform" as never, "Velocity" as never);
          for (let i = 0; i < cars.length; i += 1) {
            const entity = cars[i];
            const transform = world.getComponent(entity, "Transform" as never);
            const velocity = world.getComponent(entity, "Velocity" as never);
            const inputComp = world.getComponent(entity, "Input" as never) as { axes?: { moveX?: number; moveY?: number }; actions?: { boost?: boolean; brake?: boolean } } | undefined;
            if (!transform || !velocity) continue;
            const result = computeCarPhysics(
              transform as unknown as { rotation: number },
              velocity as unknown as { vx: number; vy: number },
              {
                moveX: inputComp?.axes?.moveX ?? 0,
                moveY: inputComp?.axes?.moveY ?? 0,
                boost: inputComp?.actions?.boost === true,
                brake: inputComp?.actions?.brake === true
              },
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
    const trackSpec: TrackSpec = TrackSpecSchema.parse(breakfastTrackRaw);
    this.world.setResource("ActiveTrackSpec", trackSpec);

    const state = spawnBlueprint(this.world, "state", {});

    const h2hEntity = this.world.createEntity();
    this.world.addComponent(h2hEntity, {
      type: "HeadToHeadState",
      leaderEntity: null,
      scores: { player_1: 0, player_2: 0 },
      targetScore: 4,
      phase: "countdown",
      roundCountdown: config.COUNTDOWN_SECONDS,
      winner: null
    });

    // Spawn surface, ribbon, skid marks, and smoke
    spawnBlueprint(this.world, "track_surface", { width: trackSpec.width, height: trackSpec.height });
    spawnBlueprint(this.world, "track_ribbon", {});
    spawnBlueprint(this.world, "skid_marks", {});
    spawnBlueprint(this.world, "smoke", {});

    // Spawn checkpoints from track spec waypoints
    for (let i = 0; i < trackSpec.waypoints.length; i += 1) {
      const point = trackSpec.waypoints[i];
      spawnBlueprint(this.world, "checkpoint", {
        index: i,
        x: point.x,
        y: point.y,
        width: point.radius * 2,
        height: point.radius * 2,
        isFinish: i === 0
      });
    }

    // Spawn track walls
    for (let i = 0; i < trackSpec.walls.length; i += 1) {
      spawnBlueprint(this.world, "wall", trackSpec.walls[i]);
    }

    // Spawn track zones
    for (let i = 0; i < trackSpec.zones.length; i += 1) {
      const zone = trackSpec.zones[i];
      spawnBlueprint(this.world, "track_zone", {
        id: zone.id,
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        surface: zone.surface
      });
    }

    // Spawn track obstacles
    for (let i = 0; i < trackSpec.obstacles.length; i += 1) {
      const obs = trackSpec.obstacles[i];
      spawnBlueprint(this.world, "track_obstacle", {
        id: obs.id,
        x: obs.x,
        y: obs.y,
        radius: obs.radius,
        kind: obs.kind
      });
    }

    const spawnPt1 = trackSpec.spawnPoints[0] ?? { x: 800, y: 200, rotation: 0 };
    const car1 = spawnBlueprint(this.world, "car", {
      x: spawnPt1.x,
      y: spawnPt1.y,
      rotation: spawnPt1.rotation
    });

    const lap = this.world.getMutableComponent(car1, "Lap");
    if (lap) lap.lapStartedAt = 0;

    const spawnPt2 = trackSpec.spawnPoints[1] ?? { x: 800, y: 240, rotation: 0 };
    const car2 = spawnBlueprint(this.world, "car", {
      x: spawnPt2.x,
      y: spawnPt2.y,
      rotation: spawnPt2.rotation,
      isAI: true
    });

    createMainCamera2D(this.world, car1, {
      smoothingX: 6,
      smoothingY: 6,
      zoom: 1
    });

    const cam = this.world.query("Camera2D")[0];
    if (cam !== undefined) {
      this.world.mutateComponent(cam, "Camera2D", (m) => {
        m.followEntities = [car1, car2];
        const initialX = (spawnPt1.x + spawnPt2.x) / 2;
        const initialY = (spawnPt1.y + spawnPt2.y) / 2;
        m.x = initialX - 400;
        m.y = initialY - 300;
        m.targetX = m.x;
        m.targetY = m.y;
      });
    }

    void state;
  }

  public override update(dt: number): void {
    this.world.update(dt);
  }

  public setInputState(input: Record<string, unknown> | Partial<RacingInputState>): void {
    const car = this.world.query("LocalPlayer", "Input")[0];
    if (car === undefined) return;
    const component = this.world.getMutableComponent(car, "Input");
    if (!component) return;

    const inp = input as Record<string, unknown>;

    let moveX = component.axes.moveX ?? 0;
    if (typeof inp.moveX === "number") {
      moveX = inp.moveX;
    } else if (
      inp.rotateLeft !== undefined ||
      inp.rotateRight !== undefined ||
      inp.moveLeft !== undefined ||
      inp.moveRight !== undefined ||
      inp.p1Left !== undefined ||
      inp.p1Right !== undefined
    ) {
      const left = inp.rotateLeft === true || inp.moveLeft === true || inp.p1Left === true;
      const right = inp.rotateRight === true || inp.moveRight === true || inp.p1Right === true;
      moveX = (right ? 1 : 0) - (left ? 1 : 0);
    }

    let moveY = component.axes.moveY ?? 0;
    if (typeof inp.moveY === "number") {
      moveY = inp.moveY;
    } else if (
      inp.thrust !== undefined ||
      inp.moveUp !== undefined ||
      inp.moveDown !== undefined ||
      inp.p1Up !== undefined ||
      inp.p1Down !== undefined ||
      inp.p1Launch !== undefined ||
      inp.brake !== undefined
    ) {
      const up = inp.thrust === true || inp.moveUp === true || inp.p1Up === true || inp.p1Launch === true;
      const down = inp.moveDown === true || inp.p1Down === true || inp.brake === true;
      moveY = up ? -1 : (down ? 1 : 0);
    }

    component.axes.moveX = moveX;
    component.axes.moveY = moveY;

    if (typeof inp.boost === "boolean") component.actions.boost = inp.boost;
    if (typeof inp.brake === "boolean") component.actions.brake = inp.brake;
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
        // TODO(refactor): código duplicado detectado (bloque) con hitandrun/HitAndRunGame.ts:146-157. Considerar extraer a función compartida. Ref: b5a7504a
return this.getGameState().isGameOver;
  }

  protected override async onPreloadAssets(): Promise<void> {
    if (this.audio) {
      try {
        await Promise.race([
          preloadSharedAudioManifest(this.audio),
          new Promise((resolve) => setTimeout(resolve, 2000))
        ]);
      } catch (e) {
        console.warn("[RacingGame] Audio preloading failed or timed out:", e);
      }
    }
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
