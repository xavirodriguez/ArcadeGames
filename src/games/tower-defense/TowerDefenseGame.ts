import {
  World,
  BaseGame,
  SystemPhase,
  ConfigService,
  spawnBlueprintEntity,
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
  HierarchySystem,
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
import {
  createInputComponent,
  createPlayerComponent,
  populateTower,
  populateCreep,
  populateTowerProjectile,
} from "./EntityFactory";
import { TowerProjectilePool } from "./EntityPool";
import {
  parseLevelLayout,
  createGridLayout,
  extractWaypoints,
} from "./MapUtils";
import type { GridLayout } from "../shared/grid/GridTypes";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import { runWithUnlockedRandomAndMutators } from "../shared/configHelper";
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

export interface TowerDefenseBlueprintMap
  extends Record<
    string,
    BlueprintDefinition<
      TowerDefenseComponentRegistry,
      TowerDefenseEventRegistry,
      any
    >
  > {
  creep: BlueprintDefinition<
    TowerDefenseComponentRegistry,
    TowerDefenseEventRegistry,
    { type: string; x: number; y: number }
  >;
  tower: BlueprintDefinition<
    TowerDefenseComponentRegistry,
    TowerDefenseEventRegistry,
    { type: string; col: number; row: number }
  >;
  tower_projectile: BlueprintDefinition<
    TowerDefenseComponentRegistry,
    TowerDefenseEventRegistry,
    {
      x: number;
      y: number;
      damage: number;
      speed: number;
      targetEntity?: number | null;
      slowFactor?: number;
      slowDurationMs?: number;
    }
  >;
  gameState: BlueprintDefinition<
    TowerDefenseComponentRegistry,
    TowerDefenseEventRegistry,
    Record<string, unknown>
  >;
  player: BlueprintDefinition<
    TowerDefenseComponentRegistry,
    TowerDefenseEventRegistry,
    Record<string, unknown>
  >;
}

export class TowerDefenseGame extends BaseGame<
  GameStateComponent,
  InputState,
  TowerDefenseComponentRegistry,
  TowerDefenseEventRegistry,
  TowerDefenseBlueprintMap
> {
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

  protected override async onRegisterSystems(): Promise<void> {
    this.config = this.setupArcadeGameConfig(
      this.baseConfig,
      (_cfg, options) =>
        ConfigService.load<TowerDefenseConfig>(
          this.gameId,
          TowerDefenseConfigSchema,
          options?.rawConfig ?? towerDefenseConfigRaw
        )
    );

    this.world.setResource("GameConfig", this.config);
    this.world.setResource("BackgroundEffect", "td_map");

    const gridLayout = createGridLayout(this.config);
    this.world.setResource<GridLayout>("GridLayout", gridLayout);

    const tileGrid = parseLevelLayout(
      this.config.LEVEL_LAYOUT,
      this.config.GRID_COLS,
      this.config.GRID_ROWS
    );
    this.world.setResource<TileGrid>("TileGrid", tileGrid);

    const waypoints = extractWaypoints(tileGrid, gridLayout);
    this.world.setResource<WaypointList>("WaypointList", waypoints);

    const towerCatalog: TowerCatalog = {};
    for (const t of this.config.TOWERS) towerCatalog[t.id] = t;
    this.world.setResource<TowerCatalog>("TowerCatalog", towerCatalog);

    const creepCatalog: CreepCatalog = {};
    for (const c of this.config.CREEPS) creepCatalog[c.id] = c;
    this.world.setResource<CreepCatalog>("CreepCatalog", creepCatalog);

    this.world.setResource<WaveDefinitions>("WaveDefinitions", this.config.WAVES);

    this.blueprints.register("gameState", {
      spawn: (world) => {
        const entity = world.createEntity();
        world.addComponent(entity, {
          ...INITIAL_GAME_STATE,
          gold: this.config.STARTING_GOLD,
          lives: this.config.STARTING_LIVES,
          selectedTowerType: this.config.TOWERS[0]?.id ?? "basic",
        } as GameStateComponent);
        return entity;
      },
    });

    this.blueprints.register("player", {
      spawn: (world) => {
        const entity = world.createEntity();
        world.addComponent(
          entity,
          createPlayerComponent(this.config.TOWERS[0]?.id ?? "basic")
        );
        world.addComponent(entity, createInputComponent());
        world.addComponent(entity, { type: "LocalPlayer" });
        return entity;
      },
    });

    this.blueprints.register("creep", {
      spawn: (world, entity, args: { type: string; x: number; y: number }) => {
        const catalog = world.getResource<CreepCatalog>("CreepCatalog");
        const def = catalog?.[args.type];
        if (def) {
          populateCreep(world, entity, def, args.x, args.y);
        }
        return entity;
      },
    });

    this.blueprints.register("tower", {
      spawn: (world, entity, args: { type: string; col: number; row: number }) => {
        const catalog = world.getResource<TowerCatalog>("TowerCatalog");
        const layout = world.getResource<GridLayout>("GridLayout");
        const def = catalog?.[args.type];
        if (def && layout) {
          populateTower(world, entity, def, args.col, args.row, layout);
        }
        return entity;
      },
    });

    this.blueprints.register("tower_projectile", {
      spawn: (world, entity, args) => {
        const config = world.getResource<TowerDefenseConfig>("GameConfig");
        if (config) {
          populateTowerProjectile(
            world,
            entity,
            config,
            args.x,
            args.y,
            args.targetEntity ?? null,
            args.damage,
            args.speed,
            args.slowFactor && args.slowDurationMs
              ? { factor: args.slowFactor, durationMs: args.slowDurationMs }
              : undefined
          );
        }
        return entity;
      },
    });

    this.projectilePool = new TowerProjectilePool();

    this.world.addSystem(new BuildSystem(), { phase: SystemPhase.Input });

    this.world.addSystem(new CreepMovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new TowerTargetingSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new TowerFiringSystem(this.projectilePool), {
      phase: SystemPhase.Simulation,
    });
    this.world.addSystem(new ProjectileHomingSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new HierarchySystem(), { phase: SystemPhase.Transform });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
        // TODO(refactor): código duplicado detectado (bloque) con vertical-shmup/scenes/ShmupGameScene.ts:51-54. Considerar extraer a función compartida. Ref: 87a4f2aa
this.world.addSystem(new WaveSpawnSystem(), { phase: SystemPhase.Simulation });

    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CombatSystem(), { phase: SystemPhase.Collision });

    this.world.addSystem(new CreepDeathSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new SlowOnHitSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new GameStateSystem(), { phase: SystemPhase.GameRules });

    this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new TowerDefenseAudioSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new ThreatHudSystem(), { phase: SystemPhase.Presentation });
  }

  protected override async onInitializeEntities(): Promise<void> {
    runWithUnlockedRandomAndMutators(this.world, this._config.gameOptions, () => {
      spawnBlueprintEntity(this.world, "gameState", {});
      spawnBlueprintEntity(this.world, "player", {});

      const director = this.world.createEntity();
      this.world.addComponent(director, {
        type: "SpawnDirector",
        waveIndex: 0,
        cooldownRemaining: 0,
        pendingSpawns: [],
        waveElapsedTime: 0,
        enemiesRemaining: 0,
        status: "idle",
      });
    });
  }

  protected override async onBeforeRestart(): Promise<void> {
    const gameStateSystem = this.world.schedule
      .getSystems()
      .find((s) => s instanceof GameStateSystem) as GameStateSystem | undefined;
    gameStateSystem?.reset();

    const creepDeathSystem = this.world.schedule
      .getSystems()
      .find((s) => s instanceof CreepDeathSystem) as CreepDeathSystem | undefined;
    creepDeathSystem?.reset();
  }

  public override update(dt: number): void {
    this.world.update(dt);
  }

  public getGameState(): GameStateComponent {
    const gs = this.world.getSingleton("GameState");
    return gs ? { ...gs } : { ...INITIAL_GAME_STATE };
  }

  public isGameOver(): boolean {
    const gs = this.world.getSingleton("GameState");
    return gs?.phase === "game_over" || gs?.phase === "victory";
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
        // TODO(refactor): código duplicado detectado (bloque) con space-invaders/SpaceInvadersGame.ts:700-706. Considerar extraer a función compartida. Ref: d4e2faf8
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

  public override getGameState(): GameStateComponent {
    return { ...INITIAL_GAME_STATE };
  }
}
