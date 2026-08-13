/* eslint-disable @typescript-eslint/no-require-imports */
import {
  BaseGame,
  Renderer,
  SceneManager,
  World,
  Camera2DSystem,
  TransformComponent,
  WebAudioPlayer
} from "@tiny-aster/core";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry, GeometryWarsStateComponent, GeometryWarsInput, GeometryWarsBlueprintRegistry } from "./types/GeometryWarsRegistry";
import { GeometryWarsConfig, DEFAULT_CONFIG } from "./config/GeometryWarsConfig";
import { GeometryWarsGameScene } from "./scenes/GeometryWarsGameScene";
import { colors } from "../../theme/colors";

/**
 * Main game class for Geometry Wars.
 * @public
 */
import { NetworkManager, WorldSnapshot } from "@tiny-aster/core";

export class GeometryWarsGame extends BaseGame<
  GeometryWarsStateComponent, // GameState description returned to HUD
  GeometryWarsInput, // Input frame type mapping
  GeometryWarsComponentRegistry,
  GeometryWarsEventRegistry,
  GeometryWarsBlueprintRegistry
> {
  public readonly gameId = "geometrywars";
  private config: GeometryWarsConfig;
  private currentScene!: GeometryWarsGameScene;
  private isHeadless = false;
  public isMultiplayer = false;
  private networkManager!: NetworkManager<any>;

  constructor(options: { seed?: number; gameOptions?: Record<string, unknown>; assetProvider?: any; audio?: any; headless?: boolean; isMultiplayer?: boolean } = {}) {
    super({
      pauseKey: "Escape",
      isMultiplayer: options.isMultiplayer || false,
      headless: options.headless || false,
      assetProvider: options.assetProvider,
      gameOptions: options.gameOptions,
      audio: options.audio || new WebAudioPlayer()
    });

    this.isHeadless = options.headless || false;
    this.isMultiplayer = options.isMultiplayer || false;

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

    if (!this.isHeadless) {
      await this.onPreloadAssets();
    }

    // 2. Initialize and transition to main gameplay scene
    this.currentScene = new GeometryWarsGameScene(this.config, this.isHeadless);
    const sceneManager = this.world.getResource<SceneManager>("SceneManager") || new SceneManager(this.world);
    sceneManager.transitionTo(this.currentScene, { effect: "crt", duration: 400 });
  }

  private async onPreloadAssets(): Promise<void> {
    const audio = this.audio;
    const assets = [
      { id: "shoot", path: "/audio/shoot.mp3" },
      { id: "explosion", path: "/audio/explosion.mp3" },
      { id: "explosion2", path: "/audio/explosion2.mp3" },
    ];
    for (const asset of assets) {
      try {
        await audio.loadSFX(asset.id, asset.path);
      } catch (e) {
        console.error(`[Audio] Failed to load asset "${asset.id}" from "${asset.path}":`, e);
      }
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

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public applyInputToEntity(entityId: number, input: any) {
    const activeWorld = this.getWorld();
    if (!activeWorld.hasComponent(entityId, "Player")) {
      return;
    }
    activeWorld.mutateComponent(entityId, "Player", (p: any) => {
      if (input.axes?.moveX !== undefined) p.moveX = input.axes.moveX;
      if (input.axes?.moveY !== undefined) p.moveY = input.axes.moveY;
    });

    if (activeWorld.hasComponent(entityId, "Aim")) {
      activeWorld.mutateComponent(entityId, "Aim", (aim: any) => {
        if (input.axes?.aimX !== undefined && input.axes?.aimY !== undefined) {
          aim.aimX = input.axes.aimX;
          aim.aimY = input.axes.aimY;
        }
        aim.isFiring = input.actions?.includes("fire") || false;
      });
    }
  }

  public runSimulationStep(deltaTime: number, isResimulating: boolean) {
    const activeWorld = this.getWorld();
    const random = activeWorld.gameplayRandom;
    const wasLocked = random ? random.isLocked() : false;

    if (random) {
      random.unlock();
    }

    try {
      activeWorld.update(deltaTime);
    } finally {
      if (random && wasLocked) {
        random.lock();
      }
    }
  }

  public predictLocalPlayer(input: any, deltaTime: number) {
    const localPlayer = this.getWorld().query("Player")[0];
    if (localPlayer !== undefined) {
      this.applyInputToEntity(localPlayer, input);
    }
    this.runSimulationStep(deltaTime, false);
  }

  public updateFromServer(state: Record<string, unknown>, localSessionId?: string) {
    if (!this.isMultiplayer || !state) return;

    if (!this.networkManager) {
      this.networkManager = NetworkManager.registerGame(this.gameId, this, {
        strategy: 'snapshot',
        interpolationDelay: 100
      });
    }

    const world = this.getWorld();
    const commands = world.getCommandBuffer();
    const replicator = this.networkManager.getReplicator();

    const currentServerEntities = new Set<string>();

    if (state.players && typeof state.players === 'object') {
      const players = state.players as Record<string, { x: number, y: number, alive: boolean, angle: number }>;
      Object.entries(players).forEach(([sessionId, playerState]) => {
        // Skip updating local player via snapshot to prevent jitter over local prediction, or let reconciliation handle it
        if (localSessionId && sessionId === localSessionId) {
          return;
        }

        const serverId = `player_${sessionId}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "Player" } as any);
          commands.addComponent(entity, { type: "Transform", x: playerState.x, y: playerState.y, rotation: playerState.angle, scaleX: 1, scaleY: 1, worldX: playerState.x, worldY: playerState.y, worldRotation: playerState.angle, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
          commands.addComponent(entity, { type: "Render", shape: "gw_player", size: 16, color: colors.cyan, rotation: playerState.angle, visible: true, opacity: 1, order: 1, hitFlashFrames: 0, angularVelocity: 0 } as any);
          commands.addComponent(entity, { type: "Health", current: playerState.alive ? 1 : 0, max: 1 } as any);
        }

        world.mutateComponent(entity, "Transform", (t: any) => {
          t.x = playerState.x;
          t.y = playerState.y;
          t.rotation = playerState.angle;
        });

        world.mutateComponent(entity, "Render", (render: any) => {
          render.rotation = playerState.angle;
          render.color = playerState.alive ? colors.cyan : "gray";
        });
      });
    }

    if (state.enemies && typeof state.enemies === 'object') {
      const enemies = state.enemies as Record<string, { x: number, y: number, angle: number, type: string }>;
      Object.entries(enemies).forEach(([id, enemyState]) => {
        const serverId = `enemy_${id}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "Transform", x: enemyState.x, y: enemyState.y, rotation: enemyState.angle, scaleX: 1, scaleY: 1, worldX: enemyState.x, worldY: enemyState.y, worldRotation: enemyState.angle, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
          commands.addComponent(entity, { type: "Render", shape: enemyState.type || "gw_seeker", size: 12, color: colors.pink, rotation: enemyState.angle, visible: true, opacity: 1, order: 1, hitFlashFrames: 0, angularVelocity: 0 } as any);
        }

        world.mutateComponent(entity, "Transform", (t: any) => {
          t.x = enemyState.x;
          t.y = enemyState.y;
          t.rotation = enemyState.angle;
        });
      });
    }

    if (state.bullets && typeof state.bullets === 'object') {
      const bullets = state.bullets as Record<string, { x: number, y: number, angle: number }>;
      Object.entries(bullets).forEach(([id, bulletState]) => {
        const serverId = `bullet_${id}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "Transform", x: bulletState.x, y: bulletState.y, rotation: bulletState.angle, scaleX: 1, scaleY: 1, worldX: bulletState.x, worldY: bulletState.y, worldRotation: bulletState.angle, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
          commands.addComponent(entity, { type: "Render", shape: "gw_bullet", size: 4, color: colors.gold, rotation: bulletState.angle, visible: true, opacity: 1, order: 2, hitFlashFrames: 0, angularVelocity: 0 } as any);
        }

        world.mutateComponent(entity, "Transform", (t: any) => {
          t.x = bulletState.x;
          t.y = bulletState.y;
          t.rotation = bulletState.angle;
        });
      });
    }

    // Sync with NetworkManager for interpolation
    const snapshot: WorldSnapshot = {
        tick: (state.tick as number) || 0,
        entities: [],
        componentData: { Transform: {} },
        stateVersion: 0,
        structureVersion: 0,
        seed: 0,
        nextEntityId: 0,
        freeEntities: []
    };

    if (state.players) {
        Object.entries(state.players).forEach(([sessionId, p]: [string, Record<string, unknown>]) => {
            const entityId = replicator.getLocalId(`player_${sessionId}`);
            if (entityId !== undefined) {
                snapshot.entities.push(entityId);
                snapshot.componentData["Transform"][entityId] = { type: "Transform", x: (p as any).x, y: (p as any).y, rotation: (p as any).angle, scaleX: 1, scaleY: 1, worldX: (p as any).x, worldY: (p as any).y, worldRotation: (p as any).angle, worldScaleX: 1, worldScaleY: 1, dirty: false };
            }
        });
    }
    if (state.enemies) {
        Object.entries(state.enemies).forEach(([id, p]: [string, Record<string, unknown>]) => {
            const entityId = replicator.getLocalId(`enemy_${id}`);
            if (entityId !== undefined) {
                snapshot.entities.push(entityId);
                snapshot.componentData["Transform"][entityId] = { type: "Transform", x: (p as any).x, y: (p as any).y, rotation: (p as any).angle, scaleX: 1, scaleY: 1, worldX: (p as any).x, worldY: (p as any).y, worldRotation: (p as any).angle, worldScaleX: 1, worldScaleY: 1, dirty: false };
            }
        });
    }
    if (state.bullets) {
        Object.entries(state.bullets).forEach(([id, p]: [string, Record<string, unknown>]) => {
            const entityId = replicator.getLocalId(`bullet_${id}`);
            if (entityId !== undefined) {
                snapshot.entities.push(entityId);
                snapshot.componentData["Transform"][entityId] = { type: "Transform", x: (p as any).x, y: (p as any).y, rotation: (p as any).angle, scaleX: 1, scaleY: 1, worldX: (p as any).x, worldY: (p as any).y, worldRotation: (p as any).angle, worldScaleX: 1, worldScaleY: 1, dirty: false };
            }
        });
    }

    this.networkManager.processServerUpdate(snapshot.tick, snapshot);

    // Cleanup removed entities
    replicator.getMappings().forEach((entity: number, serverId: string) => {
      if (!currentServerEntities.has(serverId)) {
        commands.removeEntity(entity);
        replicator.removeMapping(serverId);
      }
    });

    if (!world.isUpdating) {
        world.flush();
    }
  }

  public getWorld(): World<GeometryWarsComponentRegistry> {
    const scene = this.currentScene;
    if (scene) {
      return scene.getWorld() as World<GeometryWarsComponentRegistry>;
    }
    return this.world;
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
      const {
        drawPlayerShip,
        drawBullet,
        drawChaser,
        drawEvader,
        drawGrunt,
        drawParticle,
        drawEnemySeeker,
        drawEnemyFastSeeker,
        drawGeometryWarsBackground
      } = require("./rendering/GeometryWarsCanvasVisuals");
      renderer.registerShape("gw_player", drawPlayerShip);
      renderer.registerShape("gw_bullet", drawBullet);
      renderer.registerShape("gw_chaser", drawChaser);
      renderer.registerShape("gw_evader", drawEvader);
      renderer.registerShape("gw_grunt", drawGrunt);
      renderer.registerShape("gw_particle", drawParticle);
      renderer.registerShape("gw_seeker", drawEnemySeeker);
      renderer.registerShape("gw_fast_seeker", drawEnemyFastSeeker);
      renderer.registerBackgroundEffect("gw_bg", drawGeometryWarsBackground);
    } else if (renderer.type === "skia") {
      const {
        drawSkiaPlayerShip,
        drawSkiaBullet,
        drawSkiaChaser,
        drawSkiaEvader,
        drawSkiaGrunt,
        drawSkiaParticle,
        drawSkiaEnemySeeker,
        drawSkiaEnemyFastSeeker,
        drawSkiaGeometryWarsBackground
      } = require("./rendering/GeometryWarsSkiaVisuals");
      renderer.registerShape("gw_player", drawSkiaPlayerShip);
      renderer.registerShape("gw_bullet", drawSkiaBullet);
      renderer.registerShape("gw_chaser", drawSkiaChaser);
      renderer.registerShape("gw_evader", drawSkiaEvader);
      renderer.registerShape("gw_grunt", drawSkiaGrunt);
      renderer.registerShape("gw_particle", drawSkiaParticle);
      renderer.registerShape("gw_seeker", drawSkiaEnemySeeker);
      renderer.registerShape("gw_fast_seeker", drawSkiaEnemyFastSeeker);
      renderer.registerBackgroundEffect("gw_bg", drawSkiaGeometryWarsBackground);
    }
  }

  public getGameState(): any {
    const sceneWorld = this.currentScene ? this.currentScene.getWorld() : this.world;
    const state = sceneWorld.getSingleton("GeometryWarsState");
    if (state) {
      let combo = 0;
      let multiplier = 1;
      let comboTimerRemaining = 0;

      const comboEntities = sceneWorld.query("Combo" as any);
      const comboEntity = comboEntities[0];
      if (comboEntity !== undefined) {
        const comboComp = sceneWorld.getComponent(comboEntity, "Combo" as any) as any;
        if (comboComp) {
          combo = comboComp.combo;
          multiplier = comboComp.multiplier;
          comboTimerRemaining = Math.max(0, comboComp.timerRemaining);
        }
      }

      return {
        ...state,
        combo,
        multiplier,
        comboTimerRemaining
      };
    }
    return {
      type: "GeometryWarsState",
      score: 0,
      lives: this.config.INITIAL_LIVES,
      bombs: this.config.INITIAL_BOMBS,
      wave: 1,
      isGameOver: false,
      gameTime: 0,
      combo: 0,
      multiplier: 1,
      comboTimerRemaining: 0
    };
  }

  public isGameOver(): boolean {
    const state = this.getGameState();
    return state?.isGameOver ?? false;
  }
}
