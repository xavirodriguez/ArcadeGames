import {
  BaseGame,
  BaseGameConfig,
  ConfigService,
  Renderer,
  RendererUtils,
  SystemPhase,
  CanonicalInputState,
  CanonicalActionName,
  hasInputAction,
} from "@tiny-aster/core";
import { GalaxianConfigSchema, GalaxianConfig } from "./types/GalaxianConfigSchema";
import {
  GalaxianComponentRegistry,
  GalaxianEventRegistry,
  GalaxianBlueprintMap,
  GalaxianStateComponent,
  GalaxianInputState,
  GalaxianInputComponent,
} from "./types/GalaxianTypes";
import { GalaxianGameScene } from "./scenes/GalaxianGameScene";
import { BulletPool } from "./EntityPool";
import { GalaxianInputSystem } from "./systems/GalaxianInputSystem";
import { PlayerMovementSystem } from "./systems/PlayerMovementSystem";
import { FormationSystem } from "./systems/FormationSystem";
import { DiveSystem } from "./systems/DiveSystem";
import { ShootingSystem } from "./systems/ShootingSystem";
import { EnemyShootingSystem } from "./systems/EnemyShootingSystem";
import { GalaxianCollisionSystem } from "./systems/GalaxianCollisionSystem";
import { WaveSystem } from "./systems/WaveSystem";
import { EnemyPoseVisualSystem } from "./systems/EnemyPoseVisualSystem";
import { DiveTrailVisualSystem } from "./systems/DiveTrailVisualSystem";
import { UnfoldFxSystem } from "./systems/UnfoldFxSystem";
import { ScorePopupSystem } from "./systems/ScorePopupSystem";
import galaxianConfigRaw from "./config/galaxian.json";
import { createThemeFromGameAccents } from "../../theme/gameAccents";

export class GalaxianGame extends BaseGame<
  GalaxianStateComponent,
  GalaxianInputState,
  GalaxianComponentRegistry,
  GalaxianEventRegistry,
  GalaxianBlueprintMap
> {
  public readonly gameId = "galaxian";
  private baseConfig: GalaxianConfig;
  private config!: GalaxianConfig;
  private bulletPool!: BulletPool;
  private pendingInput: Partial<GalaxianInputState> = {};

  constructor(config: BaseGameConfig<GalaxianComponentRegistry, GalaxianEventRegistry, GalaxianInputState, GalaxianBlueprintMap> = {}) {
    const configuredSeed = config.gameOptions?.seed;
    const seed = typeof configuredSeed === "number" ? configuredSeed : (config.seed ?? 12345);
    const loadedBaseConfig = ConfigService.load<GalaxianConfig>(
      "galaxian",
      GalaxianConfigSchema,
      config.gameOptions?.rawConfig ?? galaxianConfigRaw
    );
    super({
      gameId: config.gameId ?? "galaxian",
      errorReporter: config.errorReporter,
      gitCommit: config.gitCommit,
      deploymentId: config.deploymentId,
      environment: config.environment,
      pauseKey: loadedBaseConfig.KEYS.PAUSE,
      restartKey: loadedBaseConfig.KEYS.RESTART,
      isMultiplayer: false,
      headless: config.headless,
      schedule: config.schedule,
      theme: config.theme ?? createThemeFromGameAccents("galaxian"),
      gameOptions: { ...config.gameOptions, seed },
    });
    this.baseConfig = loadedBaseConfig;
    this.config = this.baseConfig;
  }

  public getBulletPool(): BulletPool {
    return this.bulletPool;
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  public update(dt: number): void {
    this.world.update(dt);
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = ConfigService.load<GalaxianConfig>(
      "galaxian",
      GalaxianConfigSchema,
      this._config.gameOptions?.rawConfig ?? galaxianConfigRaw
    );

    this.world.setResource("GameConfig", this.config);
    this.world.setResource("ScreenConfig", { width: this.config.worldWidth, height: this.config.worldHeight });
    this.setupCommonArcadeResources();
    this.world.setResource("IsHeadless", this.isHeadless);

    this.bulletPool = new BulletPool();

    // Register gameplay systems across system phases
    this.world.addSystem(new GalaxianInputSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new PlayerMovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new FormationSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new DiveSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ShootingSystem(this.bulletPool), { phase: SystemPhase.Simulation });
    this.world.addSystem(new EnemyShootingSystem(this.bulletPool), { phase: SystemPhase.Simulation });
    this.world.addSystem(new GalaxianCollisionSystem(this.bulletPool), { phase: SystemPhase.Collision });
    this.world.addSystem(new WaveSystem(), { phase: SystemPhase.GameRules });

    // Register visual presentation systems (write strictly to *Visual components)
    this.world.addSystem(new EnemyPoseVisualSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new DiveTrailVisualSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new UnfoldFxSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new ScorePopupSystem(), { phase: SystemPhase.Presentation });

  }

  protected override async onInitializeEntities(): Promise<void> {
    const gameScene = new GalaxianGameScene(this.config, this.world);
    gameScene.onEnter();

    const pendingInput = this.pendingInput;
    this.pendingInput = {};
    this.applyInputToPlayer(pendingInput);
  }

  public getGameState(): GalaxianStateComponent {
    const stateEntities = this.world.query("GameState");
    if (stateEntities.length > 0) {
      const state = this.world.getComponent(stateEntities[0], "GameState");
      if (state) return state;
    }
    return {
      type: "GameState",
      lives: 3,
      score: 0,
      level: 1,
      enemiesRemaining: 0,
      isGameOver: false,
      highScore: 0,
      screenShake: null,
      diveTimer: 2.2,
      activeDivesCount: 0,
      waveTransitionRemaining: 0,
    };
  }

  public override setInputState(input: Partial<GalaxianInputState> | CanonicalInputState | Record<string, unknown>): void {
    if (typeof input !== "object" || input === null) return;

    const normalizedInput = input as Partial<GalaxianInputState>;
    const playerEntities = this.world.query("Player", "Input");
    if (playerEntities.length === 0) {
      this.mergePendingInput(normalizedInput);
      return;
    }

    this.applyInputToPlayer(normalizedInput);
  }

  private mergePendingInput(input: Partial<GalaxianInputState>): void {
    const pendingInput: Partial<GalaxianInputState> = { ...this.pendingInput };

    if (input.moveLeft !== undefined) pendingInput.moveLeft = input.moveLeft;
    if (input.moveRight !== undefined) pendingInput.moveRight = input.moveRight;
    if (input.shoot !== undefined) pendingInput.shoot = input.shoot;
    if (input.actions !== undefined) pendingInput.actions = [...input.actions];
    if (input.axes !== undefined) {
      pendingInput.axes = { ...pendingInput.axes, ...input.axes };
    }

    this.pendingInput = pendingInput;
  }

  private applyInputToPlayer(input: Partial<GalaxianInputState>): void {
    const playerEntity = this.world.query("Player", "Input")[0];
    if (playerEntity === undefined) {
      this.mergePendingInput(input);
      return;
    }

    const inputComp = this.world.getMutableComponent(playerEntity, "Input") as GalaxianInputComponent | undefined;
    if (!inputComp) {
      this.mergePendingInput(input);
      return;
    }

    const moveX = input.axes?.moveX;
    const hasMoveAxis = typeof moveX === "number" && Number.isFinite(moveX);

    if (input.axes !== undefined) {
      inputComp.axes = { ...inputComp.axes, ...input.axes };
    }

    if (input.actions !== undefined) {
      inputComp.actions = [...input.actions];
      inputComp.shoot = hasInputAction(input.actions, "fire") || hasInputAction(input.actions, "shoot");

      if (!hasMoveAxis) {
        inputComp.moveLeft =
          hasInputAction(input.actions, "moveLeft") || hasInputAction(input.actions, "left");
        inputComp.moveRight =
          hasInputAction(input.actions, "moveRight") || hasInputAction(input.actions, "right");
      }
    }

    if (hasMoveAxis) {
      inputComp.moveLeft = moveX < -0.1;
      inputComp.moveRight = moveX > 0.1;
    }

    if (input.moveLeft !== undefined) inputComp.moveLeft = input.moveLeft;
    if (input.moveRight !== undefined) inputComp.moveRight = input.moveRight;
    if (input.shoot !== undefined) inputComp.shoot = input.shoot;
  }

  public setInput(input: Partial<GalaxianInputState>): void {
    this.setInputState(input);
  }

  public initializeRenderer(renderer: Renderer<GalaxianComponentRegistry>): void {
    RendererUtils.registerAssets(renderer, {
      canvas: (r) => {
        const {
          drawGalaxianPlayerCanvas,
          drawGalaxianEnemyCanvas,
          drawGalaxianPlayerBulletCanvas,
          drawGalaxianEnemyBulletCanvas,
          drawUnfoldShardCanvas,
          drawScorePopupCanvas,
          drawPaperSkyEffect,
        } = require("./rendering/GalaxianCanvasVisuals");
        r.registerShape("player_ship", drawGalaxianPlayerCanvas);
        r.registerShape("enemy_flagship", drawGalaxianEnemyCanvas);
        r.registerShape("enemy_escort", drawGalaxianEnemyCanvas);
        r.registerShape("enemy_emissary", drawGalaxianEnemyCanvas);
        r.registerShape("enemy_drone", drawGalaxianEnemyCanvas);
        r.registerShape("player_bullet", drawGalaxianPlayerBulletCanvas);
        r.registerShape("enemy_bullet", drawGalaxianEnemyBulletCanvas);
        r.registerShape("unfold_shard", drawUnfoldShardCanvas);
        r.registerShape("score_popup", drawScorePopupCanvas);
        r.registerBackgroundEffect("paper_sky", drawPaperSkyEffect);
      },
      skia: (r) => {
        const {
          drawSkiaGalaxianPlayer,
          drawSkiaGalaxianEnemy,
          drawSkiaGalaxianPlayerBullet,
          drawSkiaGalaxianEnemyBullet,
          drawSkiaUnfoldShard,
          drawSkiaScorePopup,
          drawSkiaPaperSkyEffect,
        } = require("./rendering/GalaxianSkiaVisuals");
        r.registerShape("player_ship", drawSkiaGalaxianPlayer);
        r.registerShape("enemy_flagship", drawSkiaGalaxianEnemy);
        r.registerShape("enemy_escort", drawSkiaGalaxianEnemy);
        r.registerShape("enemy_emissary", drawSkiaGalaxianEnemy);
        r.registerShape("enemy_drone", drawSkiaGalaxianEnemy);
        r.registerShape("player_bullet", drawSkiaGalaxianPlayerBullet);
        r.registerShape("enemy_bullet", drawSkiaGalaxianEnemyBullet);
        r.registerShape("unfold_shard", drawSkiaUnfoldShard);
        r.registerShape("score_popup", drawSkiaScorePopup);
        r.registerBackgroundEffect("paper_sky", drawSkiaPaperSkyEffect);
      },
    });
  }
}
