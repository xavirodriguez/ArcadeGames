import {
  BaseGame,
  ConfigService,
  SystemPhase,
  WebAudioPlayer,
  System,
  BlueprintDefinition,
  Theme,
  Renderer,
  RenderContext,
  RendererUtils,
  preloadSharedAudioManifest,
  SHARED_AUDIO_MANIFEST,
  IAssetProvider,
  IAudioPlayer
} from "@tiny-aster/core";
import { ParticleSystem } from "@tiny-aster/core";
import { SharedParticlePool } from "@tiny-aster/gameplay-kit";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import { runWithUnlockedRandomAndMutators, loadAndMutateConfig } from "../shared/configHelper";

import { CentipedeInputSystem } from "./systems/CentipedeInputSystem";
import { ShooterMovementSystem } from "./systems/ShooterMovementSystem";
import { ShootingSystem } from "./systems/ShootingSystem";
import { SegmentMovementSystem } from "./systems/SegmentMovementSystem";
import { SpiderSystem } from "./systems/SpiderSystem";
import { FleaSystem } from "./systems/FleaSystem";
import { ScorpionSystem } from "./systems/ScorpionSystem";
import { CentipedeCollisionSystem } from "./systems/CentipedeCollisionSystem";
import { WaveSystem } from "./systems/WaveSystem";

import { SegmentChainVisualSystem } from "./systems/SegmentChainVisualSystem";
import { SegmentDeathFxSystem } from "./systems/SegmentDeathFxSystem";
import { MushroomVisualSystem } from "./systems/MushroomVisualSystem";
import { AmbientFxSystem } from "./systems/AmbientFxSystem";

import { CentipedeEntityFactory } from "./EntityFactory";
import {
  CentipedeComponentRegistry,
  CentipedeEventRegistry,
  CentipedeInput,
  CentipedeStateComponent
} from "./types/CentipedeTypes";
import {
  CentipedeConfigSchema,
  CentipedeConfig,
  DEFAULT_CENTIPEDE_CONFIG
} from "./types/CentipedeConfigSchema";

import centipedeConfigRaw from "./config/centipede.json";

export interface CentipedeBlueprintMap extends Record<string, BlueprintDefinition<CentipedeComponentRegistry, CentipedeEventRegistry, Record<string, unknown>>> {
  shooter: BlueprintDefinition<CentipedeComponentRegistry, CentipedeEventRegistry, Record<string, never>>;
  state: BlueprintDefinition<CentipedeComponentRegistry, CentipedeEventRegistry, Record<string, never>>;
}

export class CentipedeGame extends BaseGame<
  CentipedeStateComponent,
  CentipedeInput,
  CentipedeComponentRegistry,
  CentipedeEventRegistry,
  CentipedeBlueprintMap
> {
  public readonly gameId = "centipede";
  private baseConfig: CentipedeConfig;
  private config!: CentipedeConfig;
  private particlePool: SharedParticlePool;

  constructor(options: { seed?: number; headless?: boolean; gameOptions?: Record<string, unknown>; assetProvider?: IAssetProvider; audio?: IAudioPlayer; theme?: Theme } = {}) {
    const seed = options.seed ?? (options.gameOptions?.seed as number | undefined);
    const theme = options.theme ?? createThemeFromGameAccents("centipede");

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

    this.baseConfig = ConfigService.load<CentipedeConfig>(this.gameId, CentipedeConfigSchema, centipedeConfigRaw);
    this.config = this.baseConfig;
    this.particlePool = new SharedParticlePool();
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = this.setupArcadeGameConfig(this.baseConfig, (_cfg, options) =>
      loadAndMutateConfig(this.gameId, CentipedeConfigSchema, centipedeConfigRaw, options)
    );

    this.world.setResource("ParticlePool", this.particlePool);

    this.unifiedInput.bind("p1Left", ["ArrowLeft", "KeyA"]);
    this.unifiedInput.bind("p1Right", ["ArrowRight", "KeyD"]);
    this.unifiedInput.bind("p1Up", ["ArrowUp", "KeyW"]);
    this.unifiedInput.bind("p1Down", ["ArrowDown", "KeyS"]);
    this.unifiedInput.bind("p1Fire", ["Space", "KeyF"]);

    if (this.unifiedInput instanceof System) {
      this.world.addSystem(this.unifiedInput as System<CentipedeComponentRegistry, CentipedeEventRegistry>, { phase: SystemPhase.Input });
    }

    this.world.addSystem(new CentipedeInputSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new ShooterMovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new SegmentMovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new SpiderSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new FleaSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ScorpionSystem(), { phase: SystemPhase.Simulation });

    this.world.addSystem(new ShootingSystem(), { phase: SystemPhase.Collision });
    this.world.addSystem(new CentipedeCollisionSystem(), { phase: SystemPhase.Collision });

    this.world.addSystem(new WaveSystem(), { phase: SystemPhase.GameRules });

    // Decoupled presentation systems
    this.world.addSystem(new SegmentChainVisualSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new SegmentDeathFxSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new MushroomVisualSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new AmbientFxSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new ParticleSystem(this.particlePool) as System<CentipedeComponentRegistry, CentipedeEventRegistry>, { phase: SystemPhase.GameRules });
  }

  protected override async onInitializeEntities(): Promise<void> {
    runWithUnlockedRandomAndMutators(this.world, this._config.gameOptions, () => {
      CentipedeEntityFactory.createGameState(this.world);
      CentipedeEntityFactory.createPlayer(this.world);

      // Spawn initial mushrooms
      const mushroomCount = this.config.INITIAL_MUSHROOM_COUNT;
      const maxRows = this.config.GRID_ROWS - this.config.PLAYER_ZONE_ROWS - 2;

      for (let i = 0; i < mushroomCount; i++) {
        const row = Math.floor(Math.random() * maxRows) + 1;
        const col = Math.floor(Math.random() * this.config.GRID_COLS);
        CentipedeEntityFactory.createMushroom(this.world, row, col);
      }

      // Spawn initial centipede chain
      CentipedeEntityFactory.createCentipedeChain(
        this.world,
        "chain_start",
        this.config.CENTIPEDE_INITIAL_LENGTH,
        0,
        Math.floor(this.config.GRID_COLS / 2),
        1
      );
    });
  }

  public override update(dt: number): void {
    this.world.update(dt);
  }

  public initializeRenderer(renderer: Renderer<CentipedeComponentRegistry, RenderContext>): void {
    RendererUtils.registerAssets(renderer, {
      canvas: (r) => {
        /* eslint-disable @typescript-eslint/no-require-imports */
        const {
          drawCentipedeBackground,
          drawCentipedeHead,
          drawCentipedeBody,
          drawMushroom,
          drawSpider,
          drawFlea,
          drawScorpion,
          drawShooter,
          drawDart
        } = require("./rendering/CentipedeCanvasVisuals");

        r.registerBackgroundEffect("centipede_bg", drawCentipedeBackground);
        r.registerShape("centipede_head", drawCentipedeHead);
        r.registerShape("centipede_body", drawCentipedeBody);
        r.registerShape("mushroom", drawMushroom);
        r.registerShape("spider", drawSpider);
        r.registerShape("flea", drawFlea);
        r.registerShape("scorpion", drawScorpion);
        r.registerShape("shooter", drawShooter);
        r.registerShape("dart", drawDart);
      },
      skia: (r) => {
        /* eslint-disable @typescript-eslint/no-require-imports */
        const {
          drawSkiaCentipedeBackground,
          drawSkiaCentipedeHead,
          drawSkiaCentipedeBody,
          drawSkiaMushroom,
          drawSkiaSpider,
          drawSkiaFlea,
          drawSkiaScorpion,
          drawSkiaShooter,
          drawSkiaDart
        } = require("./rendering/CentipedeSkiaVisuals");

        r.registerBackgroundEffect("centipede_bg", drawSkiaCentipedeBackground);
        r.registerShape("centipede_head", drawSkiaCentipedeHead);
        r.registerShape("centipede_body", drawSkiaCentipedeBody);
        r.registerShape("mushroom", drawSkiaMushroom);
        r.registerShape("spider", drawSkiaSpider);
        r.registerShape("flea", drawSkiaFlea);
        r.registerShape("scorpion", drawSkiaScorpion);
        r.registerShape("shooter", drawSkiaShooter);
        r.registerShape("dart", drawSkiaDart);
      }
    });
  }

  public getGameState(): CentipedeStateComponent {
    const state = this.world.getSingleton("CentipedeState");
    return state ? { ...state } : {
      type: "CentipedeState",
      score: 0,
      lives: DEFAULT_CENTIPEDE_CONFIG.PLAYER_INITIAL_LIVES,
      level: 1,
      status: "playing",
      mushroomsRemaining: 0,
      respawnTimerMs: 0
    };
  }

  public override isGameOver(): boolean {
    const state = this.world.getSingleton("CentipedeState");
    return state ? state.status === "game_over" : false;
  }

  protected override async onPreloadAssets(): Promise<void> {
    if (this.isHeadless) return;
    if (this.audio) {
      await preloadSharedAudioManifest(this.audio);
    }
  }
}

export const CentipedeDefinition = {
  name: "centipede",
  createSimulation: (seed: number) => {
    return new CentipedeGame({ seed, headless: true });
  },
  inputSchema: {
    actions: ["left", "right", "up", "down", "fire"]
  },
  assets: {
    sprites: [],
    sounds: SHARED_AUDIO_MANIFEST
  }
};
