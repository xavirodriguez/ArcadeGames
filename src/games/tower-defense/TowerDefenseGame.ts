import {
  World,
  BaseGame,
  SystemPhase,
  ConfigService,
  Renderer,
  RendererUtils,
  NetworkController,
  WebAudioPlayer,
  preloadSharedAudioManifest,
  SHARED_AUDIO_MANIFEST,
  BaseGameConfig,
  CanonicalInputState,
  BlueprintDefinition,
  NullBaseGame,
  MovementSystem,
  TTLSystem,
  BoundarySystem,
  CollisionSystem2D,
  JuiceSystem,
  RenderUpdateSystem,
} from "@tiny-aster/core";
import { CombatSystem } from "@tiny-aster/gameplay-kit";
import {
  GameStateComponent,
  InputState,
  INITIAL_GAME_STATE,
  TowerDefenseComponentRegistry,
  TowerDefenseEventRegistry,
  TileGrid,
  WaypointList,
  TowerCatalog,
  CreepCatalog,
  WaveDefinitions,
} from "./types/TowerDefenseTypes";
import { TowerDefenseConfigSchema, TowerDefenseConfig } from "./types/TowerDefenseConfigSchema";
import { createInputComponent, createPlayerComponent } from "./EntityFactory";
import { TowerProjectilePool } from "./EntityPool";
import {
  parseLevelLayout,
  createGridLayout,
  extractWaypoints,
} from "./MapUtils";
import type { GridLayout } from "../shared/grid/GridTypes";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import * as SharedVFX from "../shared/rendering/SharedVFX";
import towerDefenseConfigRaw from "./config/tower-defense.json";

import { CreepMovementSystem } from "./systems/CreepMovementSystem";
import { TowerTargetingSystem } from "./systems/TowerTargetingSystem";
import { TowerFiringSystem } from "./systems/TowerFiringSystem";
import { ProjectileHomingSystem } from "./systems/ProjectileHomingSystem";
import { BuildSystem } from "./systems/BuildSystem";
import { WaveSpawnSystem } from "./systems/WaveSpawnSystem";
import { GameStateSystem } from "./systems/GameStateSystem";
import { CreepDeathSystem } from "./systems/CreepDeathSystem";
import { SlowOnHitSystem } from "./systems/SlowOnHitSystem";
import { TowerDefenseAudioSystem } from "./systems/TowerDefenseAudioSystem";
import { ThreatHudSystem } from "./systems/ThreatHudSystem";

interface TowerDefenseBlueprintMap {
  creep: BlueprintDefinition<TowerDefenseComponentRegistry, TowerDefenseEventRegistry, { type: string; x: number; y: number }>;
  tower: BlueprintDefinition<TowerDefenseComponentRegistry, TowerDefenseEventRegistry, { type: string; col: number; row: number }>;
  tower_projectile: BlueprintDefinition<TowerDefenseComponentRegistry, TowerDefenseEventRegistry, { x: number; y: number; damage: number; speed: number; target?: number }>;
}

export class TowerDefenseGame
  extends BaseGame<
    GameStateComponent,
    InputState,
    TowerDefenseComponentRegistry,
    TowerDefenseEventRegistry,
    TowerDefenseBlueprintMap
  >
{
  public isMultiplayer = false;
  public readonly gameId = "tower-defense";
  private projectilePool!: TowerProjectilePool;
  private baseConfig: TowerDefenseConfig;
  private config!: TowerDefenseConfig;
  private network: NetworkController<TowerDefenseComponentRegistry>;

  constructor(
    config: BaseGameConfig<
      TowerDefenseComponentRegistry,
      TowerDefenseEventRegistry,
      InputState,
      TowerDefenseBlueprintMap
    > = {}
  ) {
    const seed = (config.gameOptions?.seed as number) || config.seed;
    const loadedBaseConfig = ConfigService.load<TowerDefenseConfig>(
      "tower-defense",
      TowerDefenseConfigSchema,
      config.gameOptions?.rawConfig ?? towerDefenseConfigRaw
    );
    super({
      pauseKey: loadedBaseConfig.KEYS.PAUSE,
      restartKey: loadedBaseConfig.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      headless: config.headless,
      schedule: config.schedule,
      theme: config.theme ?? createThemeFromGameAccents("tower-defense"),
      gameOptions: { ...config.gameOptions, seed },
      audio: config.audio || new WebAudioPlayer(),
    });
    this.baseConfig = loadedBaseConfig;
    this.config = this.baseConfig;
    this.isMultiplayer = !!config.isMultiplayer;
    this.network = new NetworkController<TowerDefenseComponentRegistry>(this.world);
  }

  protected override onWorldCreated(world: World<TowerDefenseComponentRegistry>): void {
    world.setResource("GameConfig", this.config);

    const gridLayout = createGridLayout(this.config);
    world.setResource<GridLayout>("GridLayout", gridLayout);

    const tileGrid = parseLevelLayout(
      this.config.LEVEL_LAYOUT,
      this.config.GRID_COLS,
      this.config.GRID_ROWS
    );
    world.setResource<TileGrid>("TileGrid", tileGrid);

    const waypoints = extractWaypoints(tileGrid, gridLayout);
    world.setResource<WaypointList>("WaypointList", waypoints);

    const towerCatalog: TowerCatalog = {};
    for (const t of this.config.TOWERS) towerCatalog[t.id] = t;
    world.setResource<TowerCatalog>("TowerCatalog", towerCatalog);

    const creepCatalog: CreepCatalog = {};
    for (const c of this.config.CREEPS) creepCatalog[c.id] = c;
    world.setResource<CreepCatalog>("CreepCatalog", creepCatalog);

    world.setResource<WaveDefinitions>("WaveDefinitions", this.config.WAVES);

    world.addSingleton({
      ...INITIAL_GAME_STATE,
      gold: this.config.STARTING_GOLD,
      lives: this.config.STARTING_LIVES,
      selectedTowerType: this.config.TOWERS[0]?.id ?? "basic",
    } as GameStateComponent);

    const player = world.createEntity();
    world.addComponent(player, createPlayerComponent(this.config.TOWERS[0]?.id ?? "basic"));
    world.addComponent(player, createInputComponent());
    world.addComponent(player, { type: "LocalPlayer" });

    const director = world.createEntity();
    world.addComponent(director, {
      type: "SpawnDirector",
      waveIndex: 0,
      cooldownRemaining: 0,
      pendingSpawns: [],
      waveElapsedTime: 0,
      enemiesRemaining: 0,
      status: "idle",
    });

    this.projectilePool = new TowerProjectilePool();

    world.addSystem(new BuildSystem(), { phase: SystemPhase.Input });

    world.addSystem(new CreepMovementSystem(), { phase: SystemPhase.Simulation });
    world.addSystem(new TowerTargetingSystem(), { phase: SystemPhase.Simulation });
    world.addSystem(new TowerFiringSystem(this.projectilePool), { phase: SystemPhase.Simulation });
    world.addSystem(new ProjectileHomingSystem(), { phase: SystemPhase.Simulation });
    world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    world.addSystem(new WaveSpawnSystem(), { phase: SystemPhase.Simulation });

    world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    world.addSystem(new CombatSystem(), { phase: SystemPhase.Collision });

    world.addSystem(new CreepDeathSystem(), { phase: SystemPhase.GameRules });
    world.addSystem(new SlowOnHitSystem(), { phase: SystemPhase.GameRules });
    world.addSystem(new GameStateSystem(), { phase: SystemPhase.GameRules });

    world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
    world.addSystem(new TowerDefenseAudioSystem(), { phase: SystemPhase.Presentation });
    world.addSystem(new ThreatHudSystem(), { phase: SystemPhase.Presentation });
  }

  protected override async onPreloadAssets(): Promise<void> {
    if (this.audio) {
      await preloadSharedAudioManifest(this.audio);
    }
  }

  public initializeRenderer(renderer: Renderer<TowerDefenseComponentRegistry>): void {
    RendererUtils.registerAssets(renderer, {
      canvas: (r) => {
        const {
          drawTowerBasic,
          drawTowerSniper,
          drawTowerRapid,
          drawTowerFrost,
          drawCreepGrunt,
          drawCreepFast,
          drawCreepTank,
          drawCreepBoss,
          drawTowerProjectile,
          drawTdMapBackground,
        } = require("./rendering/TowerDefenseCanvasVisuals");
        r.registerShape("tower_basic", drawTowerBasic);
        r.registerShape("tower_sniper", drawTowerSniper);
        r.registerShape("tower_rapid", drawTowerRapid);
        r.registerShape("tower_frost", drawTowerFrost);
        r.registerShape("creep_grunt", drawCreepGrunt);
        r.registerShape("creep_fast", drawCreepFast);
        r.registerShape("creep_tank", drawCreepTank);
        r.registerShape("creep_boss", drawCreepBoss);
        r.registerShape("tower_projectile", drawTowerProjectile);
        r.registerBackgroundEffect("td_map", drawTdMapBackground);
      },
      skia: (r) => {
        const {
          drawSkiaTowerBasic,
          drawSkiaTowerSniper,
          drawSkiaTowerRapid,
          drawSkiaTowerFrost,
          drawSkiaCreepGrunt,
          drawSkiaCreepFast,
          drawSkiaCreepTank,
          drawSkiaCreepBoss,
          drawSkiaTowerProjectile,
          drawSkiaTdMapBackground,
        } = require("./rendering/TowerDefenseSkiaVisuals");
        r.registerShape("tower_basic", drawSkiaTowerBasic);
        r.registerShape("tower_sniper", drawSkiaTowerSniper);
        r.registerShape("tower_rapid", drawSkiaTowerRapid);
        r.registerShape("tower_frost", drawSkiaTowerFrost);
        r.registerShape("creep_grunt", drawSkiaCreepGrunt);
        r.registerShape("creep_fast", drawSkiaCreepFast);
        r.registerShape("creep_tank", drawSkiaCreepTank);
        r.registerShape("creep_boss", drawSkiaCreepBoss);
        r.registerShape("tower_projectile", drawSkiaTowerProjectile);
        r.registerBackgroundEffect("td_map", drawSkiaTdMapBackground);
      },
    });
    SharedVFX.registerSharedVFX(renderer);
  }

  public override setInputState(
    input: Partial<InputState> | CanonicalInputState | Record<string, unknown>
  ): void {
    const world = this.getWorld();
    const playerEntity = world.query("Player")[0];
    if (playerEntity === undefined) return;

    if (!world.hasComponent(playerEntity, "Input")) {
      world.addComponent(playerEntity, createInputComponent());
    }

    world.mutateComponent(playerEntity, "Input", (inputComp) => {
      const inp = input as Record<string, unknown>;
      if (inp && typeof inp === "object" && inp.axes && typeof inp.axes === "object") {
        const axes = inp.axes as Record<string, number>;
        inputComp.cursorX = axes.cursorX ?? axes.moveX ?? inputComp.cursorX;
        inputComp.cursorY = axes.cursorY ?? axes.moveY ?? inputComp.cursorY;
        const actions = inp.actions;
        const has = (a: string) =>
          actions instanceof Set
            ? actions.has(a)
            : Array.isArray(actions)
              ? actions.includes(a)
              : false;
        inputComp.build = has("build");
        inputComp.sell = has("sell");
        inputComp.upgrade = has("upgrade");
        inputComp.startWave = has("startWave");
      } else if (inp) {
        if (typeof inp.cursorX === "number") inputComp.cursorX = inp.cursorX;
        if (typeof inp.cursorY === "number") inputComp.cursorY = inp.cursorY;
        if (typeof inp.build === "boolean") inputComp.build = inp.build;
        if (typeof inp.sell === "boolean") inputComp.sell = inp.sell;
        if (typeof inp.upgrade === "boolean") inputComp.upgrade = inp.upgrade;
        if (typeof inp.startWave === "boolean") inputComp.startWave = inp.startWave;
        if (typeof inp.selectedTowerType === "string") {
          const player = world.getComponent(playerEntity, "Player");
          if (player) {
            world.mutateComponent(playerEntity, "Player", (p) => {
              p.selectedTowerType = inp.selectedTowerType as string;
            });
          }
        }
      }
    });
  }

  public runSimulationStep(deltaTime: number, _isResimulating: boolean): void {
    this.runDeterministicStep(deltaTime, this.getWorld());
  }
}

export const TowerDefenseDefinition = {
  name: "tower-defense",
  createSimulation: (seed: number) => {
    const game = new TowerDefenseGame({ gameOptions: { seed } });
    return game;
  },
  inputSchema: {
    actions: ["build", "sell", "upgrade", "startWave"],
    axes: ["cursorX", "cursorY"],
  },
  assets: {
    sprites: [],
    sounds: SHARED_AUDIO_MANIFEST,
  },
};

export class NullTowerDefenseGame extends NullBaseGame {
  public readonly gameId = "tower-defense";
}
