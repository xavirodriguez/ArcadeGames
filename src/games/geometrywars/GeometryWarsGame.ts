/* eslint-disable @typescript-eslint/no-require-imports */
import {
  BaseGame,
  Renderer,
  SceneManager,
  World,
  Camera2DSystem,
  TransformComponent
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

    await this.onPreloadAssets();

    // 2. Initialize and transition to main gameplay scene
    this.currentScene = new GeometryWarsGameScene(this.config);
    const sceneManager = this.world.getResource<SceneManager>("SceneManager") || new SceneManager(this.world);
    sceneManager.transitionTo(this.currentScene);
  }

  private async onPreloadAssets(): Promise<void> {
    try {
      await Promise.all([
        this.audio.loadSFX("shoot", "/audio/shoot.mp3"),
        this.audio.loadSFX("explosion", "/audio/explosion.mp3"),
        this.audio.loadSFX("explosion2", "/audio/explosion2.mp3"),
      ]);
    } catch (e) {
      console.warn("[GeometryWars] Asset preloading failed.", e);
    }
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
    mouseAbsolute?: boolean;
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
          if (input.aimX !== undefined && input.aimY !== undefined) {
            if (input.mouseAbsolute) {
              const playerTransform = sceneWorld.getComponent(player, "Transform") as TransformComponent | undefined;
              if (playerTransform) {
                const worldMouse = Camera2DSystem.screenToWorld(sceneWorld, input.aimX, input.aimY);
                aim.aimX = worldMouse.x - playerTransform.x;
                aim.aimY = worldMouse.y - playerTransform.y;
              }
            } else {
              aim.aimX = input.aimX;
              aim.aimY = input.aimY;
            }
          }
          if (input.fire !== undefined) aim.isFiring = input.fire;
        });
      }
    }
  }

  public initializeRenderer(renderer: Renderer<GeometryWarsComponentRegistry, any>): void {
    if (renderer.type === "canvas") {
      const { drawPlayerShip, drawBullet, drawChaser, drawEvader, drawGrunt, drawParticle } = require("./rendering/GeometryWarsCanvasVisuals");
      renderer.registerShape("gw_player", drawPlayerShip);
      renderer.registerShape("gw_bullet", drawBullet);
      renderer.registerShape("gw_chaser", drawChaser);
      renderer.registerShape("gw_evader", drawEvader);
      renderer.registerShape("gw_grunt", drawGrunt);
      renderer.registerShape("gw_particle", drawParticle);
    } else if (renderer.type === "skia") {
      const { drawSkiaPlayerShip, drawSkiaBullet, drawSkiaChaser, drawSkiaEvader, drawSkiaGrunt, drawSkiaParticle } = require("./rendering/GeometryWarsSkiaVisuals");
      renderer.registerShape("gw_player", drawSkiaPlayerShip);
      renderer.registerShape("gw_bullet", drawSkiaBullet);
      renderer.registerShape("gw_chaser", drawSkiaChaser);
      renderer.registerShape("gw_evader", drawSkiaEvader);
      renderer.registerShape("gw_grunt", drawSkiaGrunt);
      renderer.registerShape("gw_particle", drawSkiaParticle);
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
