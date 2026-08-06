/* eslint-disable @typescript-eslint/no-require-imports */
import {
  BaseGame,
  Renderer,
  SceneManager,
  World
} from "@tiny-aster/core";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry } from "./types/GeometryWarsRegistry";
import { GeometryWarsConfig, DEFAULT_CONFIG } from "./config/GeometryWarsConfig";
import { GeometryWarsGameScene } from "./scenes/GeometryWarsGameScene";

/**
 * Main game class for Geometry Wars.
 * @public
 */
export class GeometryWarsGame extends BaseGame<
  any, // GameState description returned to HUD
  any, // Input frame type mapping
  GeometryWarsComponentRegistry,
  GeometryWarsEventRegistry,
  any
> {
  public readonly gameId = "geometrywars";
  private config: GeometryWarsConfig;
  private currentScene!: GeometryWarsGameScene;

  constructor(options: { seed?: number; gameOptions?: Record<string, unknown>; assetProvider?: any } = {}) {
    super({
      pauseKey: "Escape",
      isMultiplayer: false,
      assetProvider: options.assetProvider,
      gameOptions: options.gameOptions
    });

    this.config = {
      ...DEFAULT_CONFIG,
      ...((options.gameOptions as any) || {})
    };
  }

  protected override async onRegisterSystems(): Promise<void> {
    // 1. Set resources on the world
    this.world.setResource("GameConfig", this.config);
    this.world.setResource("ScreenConfig", { width: this.config.WIDTH, height: this.config.HEIGHT });
    this.world.setResource("BlueprintRegistry", this.blueprints);

    // 2. Initialize and transition to main gameplay scene
    this.currentScene = new GeometryWarsGameScene(this.config);
    const sceneManager = this.world.getResource<SceneManager>("SceneManager") || new SceneManager(this.world);
    sceneManager.transitionTo(this.currentScene);
  }

  protected override async onInitializeEntities(): Promise<void> {
    // Standard initialization is handled via scene transition and onEnter hooks
  }

  public override update(dt: number): void {
    if (this.currentScene) {
      this.currentScene.getWorld().update(dt);
    } else {
      this.world.update(dt);
    }
  }

  /**
   * Twin-stick Input Bridge.
   * Maps input onto Player and Aim components in the ECS world.
   */
  public override setInputState(input: Partial<{
    moveX: number;
    moveY: number;
    aimX: number;
    aimY: number;
    fire: boolean;
  }>): void {
    const sceneWorld = this.currentScene ? this.currentScene.getWorld() : this.world;
    const players = sceneWorld.query("Player");
    if (players.length > 0) {
      const player = players[0];

      if (sceneWorld.hasComponent(player, "Player")) {
        sceneWorld.mutateComponent(player, "Player", (p: any) => {
          if (input.moveX !== undefined) p.moveX = input.moveX;
          if (input.moveY !== undefined) p.moveY = input.moveY;
        });
      }

      if (sceneWorld.hasComponent(player, "Aim")) {
        sceneWorld.mutateComponent(player, "Aim", (aim: any) => {
          if (input.aimX !== undefined) aim.aimX = input.aimX;
          if (input.aimY !== undefined) aim.aimY = input.aimY;
          if (input.fire !== undefined) aim.isFiring = input.fire;
        });
      }
    }
  }

  public initializeRenderer(renderer: Renderer<GeometryWarsComponentRegistry, any>): void {
    if (renderer.type === "canvas") {
      const { drawPlayerShip, drawBullet, drawEnemySeeker, drawEnemyEvader, drawEnemyFastSeeker, drawGeometryWarsBackground } = require("./rendering/GeometryWarsCanvasVisuals");
      renderer.registerShape("gw_player", drawPlayerShip);
      renderer.registerShape("gw_bullet", drawBullet);
      renderer.registerShape("gw_seeker", drawEnemySeeker);
      renderer.registerShape("gw_evader", drawEnemyEvader);
      renderer.registerShape("gw_fast_seeker", drawEnemyFastSeeker);
      renderer.registerBackgroundEffect("gw_background", drawGeometryWarsBackground);

      // Register standard, high-fidelity shared visual filters from SharedVFX
      const SharedVFX = require("../shared/rendering/SharedVFX");
      renderer.registerBackgroundEffect("crt_scanlines", SharedVFX.RetroCRTScanlinesEffect);
      renderer.registerBackgroundEffect("crt_glitch", SharedVFX.CRTGlitchShudderEffect);
      renderer.registerBackgroundEffect("border_glow", SharedVFX.ScreenBorderGlowEffect);
    } else if (renderer.type === "skia") {
      const { drawSkiaPlayerShip, drawSkiaBullet, drawSkiaEnemySeeker, drawSkiaEnemyEvader, drawSkiaEnemyFastSeeker, drawSkiaGeometryWarsBackground } = require("./rendering/GeometryWarsSkiaVisuals");
      renderer.registerShape("gw_player", drawSkiaPlayerShip);
      renderer.registerShape("gw_bullet", drawSkiaBullet);
      renderer.registerShape("gw_seeker", drawSkiaEnemySeeker);
      renderer.registerShape("gw_evader", drawSkiaEnemyEvader);
      renderer.registerShape("gw_fast_seeker", drawSkiaEnemyFastSeeker);
      renderer.registerBackgroundEffect("gw_background", drawSkiaGeometryWarsBackground);

      // Register standard, high-fidelity shared Skia visual filters from SharedVFX
      const SharedVFX = require("../shared/rendering/SharedVFX");
      renderer.registerBackgroundEffect("crt_scanlines", SharedVFX.SkiaRetroCRTScanlinesEffect);
      renderer.registerBackgroundEffect("crt_glitch", SharedVFX.SkiaCRTGlitchShudderEffect);
      renderer.registerBackgroundEffect("border_glow", SharedVFX.SkiaScreenBorderGlowEffect);
    }
  }

  public getGameState(): any {
    const sceneWorld = this.currentScene ? this.currentScene.getWorld() : this.world;
    const state = sceneWorld.getSingleton("GeometryWarsState");
    if (state) {
      return { ...state };
    }
    return {
      type: "GeometryWarsState",
      score: 0,
      lives: this.config.INITIAL_LIVES,
      bombs: this.config.INITIAL_BOMBS,
      wave: 1,
      isGameOver: false,
      gameTime: 0
    };
  }

  public isGameOver(): boolean {
    const state = this.getGameState();
    return state?.isGameOver ?? false;
  }
}
