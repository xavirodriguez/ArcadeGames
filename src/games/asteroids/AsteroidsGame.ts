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
  TTLSystem,
  InvulnerabilitySystem,
  CollisionSystem2D,
  CCDSystem,
  FeedbackSystem,
  TrailSystem,
  ParticleSystem,
  AnimationSystem,
  InputFrame,
  Renderer,
  RendererUtils,
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
  HierarchySystem,
  VelocityComponent,
  RenderComponent,
  HealthComponent,
  ColliderComponent,
  CollisionEventsComponent,
  TTLComponent,
  BoundaryComponent,
  WebAudioPlayer,
  WebAssetProvider,
  NullBaseGame,
  RenderContext,
  Mutator,
  CompactInputFrame,
  preloadSharedAudioManifest
} from "@tiny-aster/core";

import { ComboSystem } from "@tiny-aster/core";
import { LootSystem, PowerUpSystem, DifficultyDirectorSystem, AchievementSystem, PowerUpRegistry } from "@tiny-aster/gameplay-kit";
import { MissionSystem } from "../shared/missions/MissionSystem";
import { ASTEROIDS_MINI_MISSIONS, ASTEROIDS_MISSIONS } from "./AsteroidsMissions";
import { applyMissionReward } from "../shared/missions/MissionHelpers";
import { StoryDirectorSystem } from "../shared/story/StoryDirectorSystem";
import { DialogueSystem } from "../shared/story/DialogueSystem";
import { StoryRuntime } from "@tiny-aster/core";
import type { StoryGraph } from "@tiny-aster/core";
import type { AsteroidsGameOptions } from "./types/AsteroidsGameOptions";
import * as SharedVFX from "../shared/rendering/SharedVFX";
import { registerSumiEBackground, registerSumiEVFX } from "../shared/rendering/sumi-e";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry, AsteroidsBlueprintMap } from "./types/AsteroidRegistry";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { CombatSystem } from "@tiny-aster/gameplay-kit";
import { INITIAL_GAME_STATE } from "./types/AsteroidTypes";
import { createShip, createPowerUp, spawnAsteroidWave, registerAsteroidsBlueprints } from "./EntityFactory";
import type { IAsteroidsGame } from "./types/GameInterfaces";
import { BulletPool, ParticlePool, AsteroidPool } from "./EntityPool";
import { initializeAsteroidsRenderer } from "./rendering/AsteroidsRendererManager";
import { applyVisualMod } from "./mods/applyVisualMod";
import type { AsteroidsVisualMod } from "./mods/types";
import { classicMod } from "./mods/classic/ClassicMod";
import { AsteroidConfigSchema, AsteroidConfig } from "./types/AsteroidConfigSchema";
import { GameStateComponent, InputState } from "./types/AsteroidTypes";
import { getStoryBeatForLevel } from "./story/StoryBeats";
import { registerMutatorHook } from "../../utils/MutatorRegistry";
import { loadAndMutateConfig, runWithUnlockedRandomAndMutators } from "../shared/configHelper";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import asteroidsConfigRaw from "./config/asteroids.json";

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
  private missionSystem!: MissionSystem;
  private assetLoader!: AssetLoader;
  private bulletPool!: BulletPool;
  private particlePool!: ParticlePool;
  private asteroidPool!: AsteroidPool;
  private network!: NetworkController<AsteroidsComponentRegistry>;
  public readonly gameId = "asteroids";
  private baseConfig: AsteroidConfig;
  private config: AsteroidConfig;
  public mode: "deathmatch" | "story" = "deathmatch";
  /** Active visual presentation mod (classic | iceberg). */
  private visualMod: AsteroidsVisualMod = classicMod;

  public get networkManager(): NetworkManager<AsteroidsComponentRegistry> | undefined { return this.network.networkManager; }
  public set networkManager(val: NetworkManager<AsteroidsComponentRegistry> | undefined) { this.network.networkManager = val; }
  public get lastProcessedFullStateVersion(): number { return this.network.lastProcessedFullStateVersion; }
  public set lastProcessedFullStateVersion(val: number) { this.network.lastProcessedFullStateVersion = val; }
  public get isMultiplayer(): boolean { return this.network.isMultiplayer; }
  public set isMultiplayer(val: boolean) { this.network.isMultiplayer = val; }

  constructor(config: BaseGameConfig<AsteroidsComponentRegistry, AsteroidsEventRegistry, InputState> = {}) {
    if (!config.audio) {
      config.audio = new WebAudioPlayer();
    }
    if (!config.theme) {
      config.theme = createThemeFromGameAccents("asteroids");
    }
    super(config);
    this.mode = (config.gameOptions as AsteroidsGameOptions)?.mode || "deathmatch";
    this.network = new NetworkController<AsteroidsComponentRegistry>(this.world);
    this.isMultiplayer = config.isMultiplayer || false;
    this.baseConfig = ConfigService.load<AsteroidConfig>(this.gameId, AsteroidConfigSchema, asteroidsConfigRaw);
    this.config = this.baseConfig;
    this.assetLoader = new AssetLoader(config.assetProvider);
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = loadAndMutateConfig(this.gameId, AsteroidConfigSchema, asteroidsConfigRaw, this._config.gameOptions);

    this.visualMod = applyVisualMod(
      this.world,
      this.config,
      this._config.gameOptions as { mod?: string } | undefined,
      this._config.theme
    );

    this.world.setResource("GameConfig", this.config);
    this.world.setResource("PowerUpEffects", new PowerUpRegistry());

    this.eventBus.on("loot:spawn", (event) => {
      createPowerUp({
        world: this.world,
        x: event.x,
        y: event.y,
        lootType: event.lootType || "shield"
      });
    });

    this.setupCommonArcadeResources();

    if (!this.bulletPool) this.bulletPool = new BulletPool();
    if (!this.particlePool) this.particlePool = new ParticlePool();
    if (!this.asteroidPool) this.asteroidPool = new AsteroidPool();
    if (!this.assetLoader) {
      const provider = this._config.assetProvider || (typeof window !== "undefined" ? new WebAssetProvider() : undefined);
      this.assetLoader = new AssetLoader(provider);
    } else if (!this.assetLoader.hasProvider()) {
      const provider = this._config.assetProvider || (typeof window !== "undefined" ? new WebAssetProvider() : undefined);
      if (provider) {
        this.assetLoader.setProvider(provider);
      }
    }

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
    this.world.setResource("AsteroidPool", this.asteroidPool);
    this.world.setResource("AssetLoader", this.assetLoader);

    this.gameStateSystem = new AsteroidGameStateSystem(this);

    this.world.setResource("SpatialCullingEnabled", true);

    this.world.addSystem(new SpatialCullingSystem({ margin: 100 }), { phase: SystemPhase.Simulation, priority: 100 });
    this.world.addSystem(new AsteroidInputSystem(this.config), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new FrictionSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new CCDSystem(), { phase: SystemPhase.Simulation, priority: -10 });
    this.world.addSystem(new HierarchySystem(), { phase: SystemPhase.Transform });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CombatSystem(), { phase: SystemPhase.Collision });
    this.world.setResource("HasCombatSystem", true);
    this.world.addSystem(new AsteroidCollisionSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new InvulnerabilitySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(this.gameStateSystem, { phase: SystemPhase.GameRules });

    this.world.addSystem(new SpatialPartitioningSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new LootSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new PowerUpSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ComboSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new DifficultyDirectorSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new AchievementSystem(), { phase: SystemPhase.Simulation });

    this.missionSystem = new MissionSystem();
    this.world.addSystem(this.missionSystem, { phase: SystemPhase.GameRules });

    this.eventBus.on("mission:completed", (event) => {
      if (this.world.isReSimulating) return;
      const payload = event as { reward?: { scoreBonus?: number; mutatorId?: string } };
      applyMissionReward(this.world, payload?.reward, "GameState");
    });

    if (this.mode === "story") {
      const options = this._config.gameOptions as AsteroidsGameOptions | undefined;
      const graph = options?.storyGraph ?? options?.graphOverride;
      if (!graph) {
        throw new Error("AsteroidsGame requires gameOptions.storyGraph when mode is 'story'.");
      }
      const storyRuntime = new StoryRuntime(graph);
      this.world.setResource("StoryRuntime", storyRuntime);
      this.world.addSystem(new StoryDirectorSystem(storyRuntime), { phase: SystemPhase.GameRules });
      this.world.addSystem(new DialogueSystem(), { phase: SystemPhase.Simulation });
    }

    const activeMutators = (this._config.gameOptions?.mutators as Mutator<AsteroidsComponentRegistry>[]) || [];
    this.world.addSystem(new MutatorSystem(activeMutators), { phase: SystemPhase.Simulation });

    if (!this.isHeadless) {
      this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new FeedbackSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new TrailSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new ParticleSystem(this.particlePool), { phase: SystemPhase.Presentation });
      this.world.addSystem(new AnimationSystem(), { phase: SystemPhase.Presentation });
    }

    if (this.networkManager) {
      this.world.addSystem(new LocalPredictionSystem(this.networkManager, {
        simulateFn: (world, input, dt) => {
          const localQuery = world.query("Transform", "LocalPlayer", "Velocity");
          for (const entity of localQuery) {
              const velocity  = world.getComponent(entity, "Velocity");
              const transform = world.getComponent(entity, "Transform");
              if (!velocity || !transform) continue;

              const tPlane = { rotation: transform.rotation };
              const vPlane = { vx: velocity.vx, vy: velocity.vy };

              const phys = computeShipPhysics(tPlane, vPlane, input as unknown as Parameters<typeof computeShipPhysics>[2], this.config, dt);

              world.mutateComponent(entity, "Velocity", (v) => {
                  v.vx = phys.vx;
                  v.vy = phys.vy;
              });
              world.mutateComponent(entity, "Transform", (t) => {
                  t.rotation = phys.rotation;
              });
          }
        }
      }), { phase: SystemPhase.Input });
      this.world.addSystem(new RemoteInterpolationSystem(this.networkManager), { phase: SystemPhase.Presentation });
    }
  }

  protected override async onInitializeEntities(): Promise<void> {
    if (this.isMultiplayer) return;

    runWithUnlockedRandomAndMutators(this.world, this._config.gameOptions, () => {
      const gameStateEntity = this.world.createEntity();
      const beat = this.mode === "story" ? getStoryBeatForLevel(1) : null;
      this.world.addComponent(gameStateEntity, {
        type: "GameState",
        score: 0,
        level: 1,
        lives: 3,
        isGameOver: false,
        mode: this.mode,
        readyRemaining: this.mode === "story" ? 3.0 : 0,
        intermissionRemaining: 0,
        storyBeatText: beat ? beat.readyText : undefined
      } as GameStateComponent);

      const screen = this.world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
      const ship = createShip({
        world: this.world,
        x: screen.width / 2,
        y: screen.height / 2
      });

      this.world.addComponent(ship, { type: "LocalPlayer" });
      this.world.addComponent(ship, {
        type: "Input",
        actions: {},
        axes: {}
      });

      spawnAsteroidWave(this.world, 1);

      if (this.missionSystem) {
        const selectedMission = ASTEROIDS_MINI_MISSIONS[0];
        this.missionSystem.setActiveMission(this.world, selectedMission);
      }
    });
  }

  public update(dt: number): void {
      this.world.update(dt);
  }

  protected override async onPreloadAssets(): Promise<void> {
    const loader = this.assetLoader;
    try {
      if (loader) {
        await loader.load([
          { id: "ship_sprite", type: "image", path: require("../../../assets/ship.png") }
        ]);
      }
      if (this.audio) {
        await preloadSharedAudioManifest(this.audio);
      }
    } catch (e) {
      console.error("[Asset] Failed to load asset ship_sprite:", e);
    }
  }

  public setMultiplayerMode(active: boolean) {
    this.network.setMultiplayerMode(active);
  }

  public applyInputToEntity(entityId: number, input: InputFrame) {
    this.network.applyInputToEntity(entityId, input);
  }

  public predictLocalPlayer(input: InputFrame, deltaTime: number) {
    this.network.predictLocalPlayer(input, deltaTime);
  }

  public runSimulationStep(deltaTime: number, isResimulating: boolean) {
    this.network.runSimulationStep(deltaTime, isResimulating);
  }

  public updateFromServer(payload: ServerUpdatePayload, localSessionId?: string) {
    this.network.updateFromServer(payload, localSessionId);
  }

  public initializeRenderer(renderer: Renderer<AsteroidsComponentRegistry, RenderContext>): void {
    if (this.isHeadless) return;
    initializeAsteroidsRenderer(renderer, this.visualMod);
    SharedVFX.registerSharedVFX(renderer);

    // Phase 1+2: sumi-e / shan-shui background + ink juice drawers (mountain landscape)
    registerSumiEBackground(renderer as any, { aesthetic: "sumi-e", landscape: "mountain", force: true });
    registerSumiEVFX(renderer as any);

    if (renderer.type === "canvas") {
      renderer.registerBackgroundEffect("diffuse_milky_way", SharedVFX.DiffuseMilkyWayBackgroundEffect);
      renderer.registerBackgroundEffect("drifting_nebula", SharedVFX.DriftingNebulaBackgroundEffect);
      renderer.registerBackgroundEffect("starfield", SharedVFX.ScrollingStarfieldEffect);
      renderer.registerBackgroundEffect("distant_space_station", SharedVFX.DistantSpaceStationBackgroundEffect);
      renderer.registerBackgroundEffect("distant_asteroid_belt", SharedVFX.DistantAsteroidBeltBackgroundEffect);
      renderer.registerBackgroundEffect("ringing_planet", SharedVFX.RingingPlanetBackgroundEffect);
    } else if (renderer.type === "skia") {
      RendererUtils.registerAssets(renderer, {
        skia: (r) => {
          r.registerBackgroundEffect("diffuse_milky_way", SharedVFX.SkiaDiffuseMilkyWayBackgroundEffect);
          r.registerBackgroundEffect("drifting_nebula", SharedVFX.SkiaDriftingNebulaBackgroundEffect);
          r.registerBackgroundEffect("starfield", SharedVFX.SkiaScrollingStarfieldEffect);
          r.registerBackgroundEffect("distant_space_station", SharedVFX.SkiaDistantSpaceStationBackgroundEffect);
          r.registerBackgroundEffect("distant_asteroid_belt", SharedVFX.SkiaDistantAsteroidBeltBackgroundEffect);
          r.registerBackgroundEffect("ringing_planet", SharedVFX.SkiaRingingPlanetBackgroundEffect);
        }
      });
    }
  }

  public getMissionSystem(): MissionSystem {
    return this.missionSystem;
  }

  private cachedComboEntityId: number | undefined;
  private cachedDialogueBoxEntityId: number | undefined;

  public getGameState(): GameStateComponent {
    const state = this.world.getSingleton("GameState");
    if (!state) return INITIAL_GAME_STATE;

    let combo = 0;
    let multiplier = 1;
    let comboTimerRemaining = 0;

    if (this.cachedComboEntityId === undefined || !this.world.hasComponent(this.cachedComboEntityId, "Combo")) {
      const comboEntities = this.world.query("Combo");
      this.cachedComboEntityId = comboEntities[0];
    }

    if (this.cachedComboEntityId !== undefined) {
      const comboComp = this.world.getComponent(this.cachedComboEntityId, "Combo");
      if (comboComp) {
        combo = comboComp.combo;
        multiplier = comboComp.multiplier;
        comboTimerRemaining = Math.max(0, comboComp.timerRemaining);
      } else {
        this.cachedComboEntityId = undefined;
      }
    }

    let isDialogueActive = false;
    let dialogueText = "";

    if (this.cachedDialogueBoxEntityId === undefined || !this.world.hasComponent(this.cachedDialogueBoxEntityId, "DialogueBox")) {
      const dialogueBoxEntities = this.world.query("DialogueBox");
      this.cachedDialogueBoxEntityId = dialogueBoxEntities[0];
    }

    if (this.cachedDialogueBoxEntityId !== undefined) {
      const dialogueBox = this.world.getComponent(this.cachedDialogueBoxEntityId, "DialogueBox");
      if (dialogueBox) {
        isDialogueActive = true;
        const currentLineKey = dialogueBox.lines[dialogueBox.currentLineIndex];
        dialogueText = currentLineKey || "";
      } else {
        this.cachedDialogueBoxEntityId = undefined;
      }
    }

    return {
      ...state,
      combo,
      multiplier,
      comboTimerRemaining,
      isDialogueActive,
      dialogueText
    };
  }

  public isGameOver(): boolean {
    const state = this.world.getSingleton("GameState");
    return !!(state && state.isGameOver);
  }

  public setInputState(input: Record<string, unknown> | object): void {
    const localPlayer = this.world.query("LocalPlayer")[0];
    if (localPlayer !== undefined) {
      this.world.mutateComponent(localPlayer, "Input", (inputComp) => {
        const inputObj = input as Record<string, unknown>;
        if (inputObj) {
          if (typeof inputObj.rotateLeft === "boolean") {
            inputComp.actions["rotateLeft"] = inputObj.rotateLeft;
          }
          if (typeof inputObj.rotateRight === "boolean") {
            inputComp.actions["rotateRight"] = inputObj.rotateRight;
          }
          if (typeof inputObj.thrust === "boolean") {
            inputComp.actions["thrust"] = inputObj.thrust;
          }
          if (typeof inputObj.shoot === "boolean") {
            inputComp.actions["shoot"] = inputObj.shoot;
          }
          if (typeof inputObj.hyperspace === "boolean") {
            inputComp.actions["hyperspace"] = inputObj.hyperspace;
          }
          if (typeof inputObj.rotationAmount === "number") {
            inputComp.axes["rotate_x"] = inputObj.rotationAmount;
            inputComp.axes["horizontal"] = inputObj.rotationAmount;
          }
        }
      });
    }
  }

  public override destroy(): void {
    super.destroy();
    this.bulletPool?.clear();
    this.particlePool?.clear();
    this.asteroidPool?.clear();
  }
}
