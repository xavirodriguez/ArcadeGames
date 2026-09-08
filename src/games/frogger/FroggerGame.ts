import {
  BaseGame,
  SystemPhase,
  System,
  MovementSystem,
  CollisionSystem2D,
  JuiceSystem,
  Renderer,
  WebAudioPlayer,
  ConfigService,
  NullBaseGame,
  loadAudioAssets,
  BoundarySystem,
  ComboSystem,
  MutatorSystem,
  ScreenShakeSystem,
  GameDefinition
} from "@tiny-aster/core";
import { AchievementSystem, PowerUpSystem, LootSystem } from "@tiny-aster/gameplay-kit";
import {
  FroggerState,
  FroggerInput,
  FroggerComponentRegistry,
} from "./types/FroggerTypes";
import {
  FroggerConfigSchema,
  FroggerConfig as FroggerConfigType,
  DEFAULT_FROGGER_CONFIG
} from "./types/FroggerConfigSchema";
import { FroggerInputSystem } from "./systems/FroggerInputSystem";
import { FroggerLogCarrySystem } from "./systems/FroggerLogCarrySystem";
import { FroggerGameStateSystem } from "./systems/FroggerGameStateSystem";
import { FroggerBlueprintMap, registerFroggerBlueprints } from "./EntityFactory";
import { applyMutators } from "../shared/configHelper";
import { registerMutatorHook } from "../../utils/MutatorRegistry";
import { createThemeFromGameAccents } from "../../theme/gameAccents";

export class FroggerGame extends BaseGame<
  FroggerState,
  FroggerInput,
  FroggerComponentRegistry,
  any,
  FroggerBlueprintMap
> {
  private gameStateSystem!: FroggerGameStateSystem;
  public readonly gameId = "frogger";
  private baseConfig: FroggerConfigType;
  private config: FroggerConfigType;

  constructor(config: { isMultiplayer?: boolean; seed?: number; gameOptions?: Record<string, unknown>; audio?: any } = {}) {
    const seed = (config.gameOptions?.seed as number) || config.seed;
    super({
      pauseKey: DEFAULT_FROGGER_CONFIG.KEYS.PAUSE,
      restartKey: DEFAULT_FROGGER_CONFIG.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      theme: createThemeFromGameAccents("asteroids"),
      gameOptions: { ...config.gameOptions, seed },
      audio: config.audio || new WebAudioPlayer()
    });

    this.baseConfig = ConfigService.load<FroggerConfigType>(
      this.gameId,
      FroggerConfigSchema,
      config.gameOptions?.rawConfig ?? {}
    );
    this.config = this.baseConfig;
  }

  private spawnBlueprint<K extends keyof FroggerBlueprintMap>(
    name: K,
    args: Parameters<FroggerBlueprintMap[K]["spawn"]>[2]
  ): number {
    const entity = this.world.createEntity();
    this.blueprints.get(name as string)?.spawn(this.world, entity, args as any);
    return entity;
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = applyMutators(this.baseConfig, this._config.gameOptions);
    this.world.setResource("GameConfig", this.config);
    this.setupCommonArcadeResources();
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    registerFroggerBlueprints(this.world, this.blueprints);

    // Bind inputs
    this.unifiedInput.bind("moveUp", [this.config.KEYS.MOVE_UP, "KeyW"]);
    this.unifiedInput.bind("moveDown", [this.config.KEYS.MOVE_DOWN, "KeyS"]);
    this.unifiedInput.bind("moveLeft", [this.config.KEYS.MOVE_LEFT, "KeyA"]);
    this.unifiedInput.bind("moveRight", [this.config.KEYS.MOVE_RIGHT, "KeyD"]);

    if (this.unifiedInput instanceof System) {
      this.world.addSystem(this.unifiedInput as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Input });
    }

    this.gameStateSystem = new FroggerGameStateSystem(this);

    this.world.addSystem(new FroggerInputSystem() as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem() as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem() as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(new CollisionSystem2D() as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Collision });
    this.world.addSystem(new FroggerLogCarrySystem() as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(this.gameStateSystem as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.GameRules });

    // Transversal gameplay systems
    this.world.addSystem(new ComboSystem() as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(new PowerUpSystem() as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(new LootSystem() as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(new AchievementSystem() as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Simulation });

    const activeMutators = (this._config.gameOptions?.mutators || this._config.gameOptions?.activeMutators || []) as any[];
    this.world.addSystem(new MutatorSystem(activeMutators) as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Simulation });

    // Presentation systems
    this.world.addSystem(new JuiceSystem() as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Presentation });
    this.world.addSystem(new ScreenShakeSystem() as unknown as System<FroggerComponentRegistry>, { phase: SystemPhase.Presentation });
  }

  protected override async onInitializeEntities(): Promise<void> {
    const config = this.config;

    // Create State singleton
    this.spawnBlueprint("state", {});

    // Create Goal Lily Pads (5 pads across row 0)
    const padSpacing = config.SCREEN_WIDTH / (config.TOTAL_LILY_PADS + 1);
    for (let i = 0; i < config.TOTAL_LILY_PADS; i++) {
      const x = padSpacing * (i + 1);
      this.spawnBlueprint("lily_pad", { padIndex: i, x });
    }

    // Spawn River Logs & Turtles (rows 1..5)
    // Row 1: Fast Turtles (left)
    this.spawnRowEntities("log", 1, config, [
      { x: 100, speed: 120, dir: -1, length: 2, type: "turtle" },
      { x: 350, speed: 120, dir: -1, length: 2, type: "turtle" },
      { x: 600, speed: 120, dir: -1, length: 2, type: "turtle" },
    ]);

    // Row 2: Medium Logs (right)
    this.spawnRowEntities("log", 2, config, [
      { x: 150, speed: 90, dir: 1, length: 3, type: "log" },
      { x: 500, speed: 90, dir: 1, length: 3, type: "log" },
    ]);

    // Row 3: Long Logs (right, fast)
    this.spawnRowEntities("log", 3, config, [
      { x: 200, speed: 150, dir: 1, length: 4, type: "log" },
      { x: 650, speed: 150, dir: 1, length: 4, type: "log" },
    ]);

    // Row 4: Turtles (left)
    this.spawnRowEntities("log", 4, config, [
      { x: 120, speed: 80, dir: -1, length: 3, type: "turtle" },
      { x: 420, speed: 80, dir: -1, length: 3, type: "turtle" },
      { x: 700, speed: 80, dir: -1, length: 3, type: "turtle" },
    ]);

    // Row 5: Medium Logs (right)
    this.spawnRowEntities("log", 5, config, [
      { x: 100, speed: 110, dir: 1, length: 3, type: "log" },
      { x: 450, speed: 110, dir: 1, length: 3, type: "log" },
    ]);

    // Spawn Road Vehicles (rows 7..11)
    const trafficMult = config.TRAFFIC_SPEED_MULTIPLIER || 1.0;

    // Row 7: Cars (left)
    this.spawnRowEntities("vehicle", 7, config, [
      { x: 150, speed: 100 * trafficMult, dir: -1, vType: "car" },
      { x: 450, speed: 100 * trafficMult, dir: -1, vType: "car" },
      { x: 700, speed: 100 * trafficMult, dir: -1, vType: "car" },
    ]);

    // Row 8: Trucks (right)
    this.spawnRowEntities("vehicle", 8, config, [
      { x: 200, speed: 80 * trafficMult, dir: 1, vType: "truck" },
      { x: 600, speed: 80 * trafficMult, dir: 1, vType: "truck" },
    ]);

    // Row 9: Fast Cars (left)
    this.spawnRowEntities("vehicle", 9, config, [
      { x: 100, speed: 160 * trafficMult, dir: -1, vType: "car" },
      { x: 500, speed: 160 * trafficMult, dir: -1, vType: "car" },
    ]);

    // Row 10: Race Cars (right)
    this.spawnRowEntities("vehicle", 10, config, [
      { x: 250, speed: 180 * trafficMult, dir: 1, vType: "car" },
      { x: 650, speed: 180 * trafficMult, dir: 1, vType: "car" },
    ]);

    // Row 11: Trucks (left)
    this.spawnRowEntities("vehicle", 11, config, [
      { x: 180, speed: 90 * trafficMult, dir: -1, vType: "truck" },
      { x: 550, speed: 90 * trafficMult, dir: -1, vType: "truck" },
    ]);

    // Spawn Frogger Player
    this.spawnBlueprint("frogger", {
      gridX: Math.floor(config.TOTAL_COLS / 2),
      gridY: 13,
    });
  }

  private spawnRowEntities(
    kind: "log" | "vehicle",
    row: number,
    _config: FroggerConfigType,
    items: Array<any>
  ): void {
    for (const item of items) {
      if (kind === "log") {
        this.spawnBlueprint("log", {
          row,
          x: item.x,
          speed: item.speed,
          direction: item.dir,
          length: item.length,
          logType: item.type,
        });
      } else {
        this.spawnBlueprint("vehicle", {
          row,
          x: item.x,
          speed: item.speed,
          direction: item.dir,
          vehicleType: item.vType,
        });
      }
    }
  }

  protected override async onBeforeRestart(): Promise<void> {
    this.gameStateSystem?.resetGameOverState(this.world);
  }

  public override update(dt: number): void {
    this.world.update(dt);
  }

  public override setInputState(input: Partial<FroggerInput>): void {
    const froggerEntity = this.world.query("Frogger")[0];
    if (froggerEntity !== undefined) {
      if (!this.world.hasComponent(froggerEntity, "FroggerInput")) {
        this.world.addComponent(froggerEntity, {
          type: "FroggerInput",
          moveUp: false,
          moveDown: false,
          moveLeft: false,
          moveRight: false,
        });
      }

      this.world.mutateComponent(froggerEntity, "FroggerInput", (inp) => {
        if (input.moveUp !== undefined) inp.moveUp = input.moveUp;
        if (input.moveDown !== undefined) inp.moveDown = input.moveDown;
        if (input.moveLeft !== undefined) inp.moveLeft = input.moveLeft;
        if (input.moveRight !== undefined) inp.moveRight = input.moveRight;
      });
    }
  }

  public setInput(input: Partial<FroggerInput>): void {
    this.setInputState(input);
  }

  public initializeRenderer(renderer: Renderer<any, any>): void {
    if (renderer.type === "canvas") {
      const {
        drawFroggerCanvas,
        drawCarCanvas,
        drawTruckCanvas,
        drawLogCanvas,
        drawTurtleCanvas,
        drawLilyPadCanvas,
        froggerBackgroundCanvasEffect,
      } = require("./rendering/FroggerCanvasVisuals");

      renderer.registerShape("frogger", drawFroggerCanvas);
      renderer.registerShape("car", drawCarCanvas);
      renderer.registerShape("truck", drawTruckCanvas);
      renderer.registerShape("log", drawLogCanvas);
      renderer.registerShape("turtle", drawTurtleCanvas);
      renderer.registerShape("lily_pad", drawLilyPadCanvas);
      renderer.registerBackgroundEffect("froggerBackground", froggerBackgroundCanvasEffect);
    } else if (renderer.type === "skia") {
      const {
        drawFroggerSkia,
        drawCarSkia,
        drawTruckSkia,
        drawLogSkia,
        drawTurtleSkia,
        drawLilyPadSkia,
        froggerBackgroundSkiaEffect,
      } = require("./rendering/FroggerSkiaVisuals");

      renderer.registerShape("frogger", drawFroggerSkia);
      renderer.registerShape("car", drawCarSkia);
      renderer.registerShape("truck", drawTruckSkia);
      renderer.registerShape("log", drawLogSkia);
      renderer.registerShape("turtle", drawTurtleSkia);
      renderer.registerShape("lily_pad", drawLilyPadSkia);
      renderer.registerBackgroundEffect("froggerBackground", froggerBackgroundSkiaEffect);
    }
  }

  public getGameState(): FroggerState {
    const stateEntity = this.world.query("FroggerState")[0];
    if (stateEntity !== undefined) {
      const state = this.world.getComponent(stateEntity, "FroggerState");
      if (state) {
        return {
          score: state.score,
          lives: state.lives,
          level: state.level,
          isGameOver: state.isGameOver,
          isWin: state.isWin,
          occupiedLilyPads: state.occupiedLilyPads,
          totalLilyPads: state.totalLilyPads,
        };
      }
    }
    return {
      score: 0,
      lives: this.config.INITIAL_LIVES,
      level: 1,
      isGameOver: false,
      isWin: false,
      occupiedLilyPads: 0,
      totalLilyPads: this.config.TOTAL_LILY_PADS,
    };
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  protected override async onPreloadAssets(): Promise<void> {
    const assets = [
      { id: "jump", path: "/audio/jump.mp3" },
      { id: "drown", path: "/audio/drown.mp3" },
      { id: "hit", path: "/audio/hit.mp3" },
      { id: "goal", path: "/audio/goal.mp3" },
      { id: "game_over", path: "/audio/game_over.mp3" },
    ];
    await loadAudioAssets(this.audio, assets);
  }
}

export class NullFroggerGame extends NullBaseGame<FroggerState, FroggerInput, FroggerComponentRegistry> {
  public gameId = "frogger";

  public override getGameState(): FroggerState {
    return {
      score: 0,
      lives: 3,
      level: 1,
      isGameOver: false,
      isWin: false,
      occupiedLilyPads: 0,
      totalLilyPads: 5,
    };
  }

  public setInput(input: Partial<FroggerInput>): void {
    this.setInputState(input);
  }
}

// Mutator hooks
registerMutatorHook("fast_traffic", (world) => {
  const vehicles = world.query("Vehicle", "Velocity");
  for (let i = 0; i < vehicles.length; i++) {
    world.mutateComponent(vehicles[i], "Velocity", (v) => {
      v.vx *= 1.5;
    });
  }
});

export const FroggerDefinition: GameDefinition = {
  name: "frogger",
  createSimulation: (seed: number) => {
    const game = new FroggerGame({ gameOptions: { seed } });
    return game;
  },
  inputSchema: {
    actions: ["moveUp", "moveDown", "moveLeft", "moveRight", "pause"],
  },
  assets: {
    sprites: [],
    sounds: [
      { id: "jump", path: "/audio/jump.mp3" },
      { id: "drown", path: "/audio/drown.mp3" },
      { id: "hit", path: "/audio/hit.mp3" },
      { id: "goal", path: "/audio/goal.mp3" },
      { id: "game_over", path: "/audio/game_over.mp3" },
    ],
  },
};
