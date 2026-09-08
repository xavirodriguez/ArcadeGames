/* eslint-disable @typescript-eslint/no-require-imports */
import {
  BaseGame,
  Renderer,
  SceneManager,
  World,
  Camera2DSystem,
  TransformComponent,
  WebAudioPlayer,
  GameDefinition,
  ConfigService
} from "@tiny-aster/core";
import { GeometryWarsComponentRegistry, GeometryWarsEventRegistry, GeometryWarsStateComponent, GeometryWarsInput, GeometryWarsBlueprintRegistry } from "./types/GeometryWarsRegistry";
import { GeometryWarsConfig, GeometryWarsConfigSchema, DEFAULT_CONFIG } from "./config/GeometryWarsConfig";
import { GeometryWarsGameScene } from "./scenes/GeometryWarsGameScene";
import { colors } from "../../theme/colors";
import { createThemeFromGameAccents } from "../../theme/gameAccents";

/**
 * Main game class for Geometry Wars.
 * @public
 */
import { NetworkManager, WorldSnapshot, InputFrame, pruneStaleEntities, buildInterpolationSnapshot, InterpolationSnapshotEntry, EntitySyncDescriptor, syncEntitiesFromServer } from "@tiny-aster/core";

export class GeometryWarsGame extends BaseGame<
  GeometryWarsStateComponent, // GameState description returned to HUD
  GeometryWarsInput, // Input frame type mapping
  GeometryWarsComponentRegistry,
  GeometryWarsEventRegistry,
  GeometryWarsBlueprintRegistry
> {
  public readonly gameId = "geometrywars";
  private baseConfig: GeometryWarsConfig;
  private config: GeometryWarsConfig;
  private currentScene!: GeometryWarsGameScene;
  public isMultiplayer = false;
  private networkManager!: NetworkManager<any>;

  constructor(options: { seed?: number; gameOptions?: Record<string, unknown>; assetProvider?: any; audio?: any; headless?: boolean; isMultiplayer?: boolean; theme?: any } = {}) {
    super({
      pauseKey: "Escape",
      isMultiplayer: options.isMultiplayer || false,
      headless: options.headless || false,
      assetProvider: options.assetProvider,
      theme: options.theme ?? createThemeFromGameAccents("geometrywars"),
      gameOptions: options.gameOptions,
      audio: options.audio || new WebAudioPlayer()
    });

    this.isMultiplayer = options.isMultiplayer || false;

    this.baseConfig = ConfigService.load<GeometryWarsConfig>(
      this.gameId,
      GeometryWarsConfigSchema,
      options.gameOptions?.rawConfig ?? DEFAULT_CONFIG
    );
    this.config = this.baseConfig;
  }

  protected override async onRegisterSystems(): Promise<void> {
    const mutators = (this._config.gameOptions?.mutators as any[]) || (this._config.gameOptions?.activeMutators as any[]) || [];
    this.config = mutators.length > 0
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...this.baseConfig })
      : { ...this.baseConfig };

    // 1. Set resources on the world
    this.world.setResource("GameConfig", this.config);
    this.setupCommonArcadeResources();
    this.world.setResource("BlueprintRegistry", this.blueprints);

    // 2. Initialize and transition to main gameplay scene
    this.currentScene = new GeometryWarsGameScene(this.config, this.isHeadless);
    const sceneManager = this.world.getResource<SceneManager>("SceneManager") || new SceneManager(this.world);
    sceneManager.transitionTo(this.currentScene, { effect: "crt", duration: 400 });
  }

  protected override async onPreloadAssets(): Promise<void> {
    const audio = this.audio;
    const assets = [
      { id: "shoot", path: "/audio/shoot.mp3" },
      { id: "explosion", path: "/audio/explosion.mp3" },
      { id: "explosion2", path: "/audio/explosion2.mp3" },
    ];
    // TODO(refactor): código duplicado detectado (bloque) con flappybird/FlappyBirdGame.ts:306-315. Considerar extraer a función compartida. Ref: 379c1d5e
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

  public applyInputToEntity(entityId: number, input: InputFrame) {
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

  // TODO(refactor): código duplicado detectado (método) con space-invaders/SpaceInvadersGame.ts:83-95. Considerar extraer a función compartida. Ref: 1390215f
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

  public predictLocalPlayer(input: InputFrame, deltaTime: number) {
    const localPlayer = this.getWorld().query("Player")[0];
    if (localPlayer !== undefined) {
      this.applyInputToEntity(localPlayer, input);
    }
    this.runSimulationStep(deltaTime, false);
  }

  private readonly ENTITY_SYNC_DESCRIPTORS: EntitySyncDescriptor<Record<string, unknown>, any, GeometryWarsComponentRegistry>[] = [
    {
      serverIdPrefix: "player",
      localPlayerPolicy: "skip",
      getStateMap: (root) => root.players as Record<string, { x: number; y: number; alive: boolean; angle: number }>,
      spawn: (world, entity, state) => {
        const commands = world.getCommandBuffer();
        commands.addComponent(entity, { type: "Player" } as any);
        commands.addComponent(entity, { type: "Transform", x: state.x, y: state.y, rotation: state.angle, scaleX: 1, scaleY: 1, worldX: state.x, worldY: state.y, worldRotation: state.angle, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
        commands.addComponent(entity, { type: "Render", shape: "gw_player", size: 16, color: colors.cyan, rotation: state.angle, visible: true, opacity: 1, order: 1, hitFlashFrames: 0, angularVelocity: 0 } as any);
        commands.addComponent(entity, { type: "Health", current: state.alive ? 1 : 0, max: 1 } as any);
      },
      sync: (world, entity, state) => {
        world.mutateComponent(entity, "Transform", (t: any) => {
          t.x = state.x;
          t.y = state.y;
          t.rotation = state.angle;
        });

        world.mutateComponent(entity, "Render", (render: any) => {
          render.rotation = state.angle;
          render.color = state.alive ? colors.cyan : "gray";
        });
      }
    },
    {
      serverIdPrefix: "enemy",
      getStateMap: (root) => root.enemies as Record<string, { x: number; y: number; angle: number; type: string }>,
      spawn: (world, entity, state) => {
        const commands = world.getCommandBuffer();
        commands.addComponent(entity, { type: "Transform", x: state.x, y: state.y, rotation: state.angle, scaleX: 1, scaleY: 1, worldX: state.x, worldY: state.y, worldRotation: state.angle, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
        commands.addComponent(entity, { type: "Render", shape: state.type || "gw_seeker", size: 12, color: colors.pink, rotation: state.angle, visible: true, opacity: 1, order: 1, hitFlashFrames: 0, angularVelocity: 0 } as any);
      },
      sync: (world, entity, state) => {
        world.mutateComponent(entity, "Transform", (t: any) => {
          t.x = state.x;
          t.y = state.y;
          t.rotation = state.angle;
        });
      }
    },
    {
      serverIdPrefix: "bullet",
      getStateMap: (root) => root.bullets as Record<string, { x: number; y: number; angle: number }>,
      spawn: (world, entity, state) => {
        const commands = world.getCommandBuffer();
        commands.addComponent(entity, { type: "Transform", x: state.x, y: state.y, rotation: state.angle, scaleX: 1, scaleY: 1, worldX: state.x, worldY: state.y, worldRotation: state.angle, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
        commands.addComponent(entity, { type: "Render", shape: "gw_bullet", size: 4, color: colors.gold, rotation: state.angle, visible: true, opacity: 1, order: 2, hitFlashFrames: 0, angularVelocity: 0 } as any);
      },
      sync: (world, entity, state) => {
        world.mutateComponent(entity, "Transform", (t: any) => {
          t.x = state.x;
          t.y = state.y;
          t.rotation = state.angle;
        });
      }
    }
  ];

  public updateFromServer(state: Record<string, unknown>, localSessionId?: string) {
    if (!this.isMultiplayer || !state) return;

    if (!this.networkManager) {
      this.networkManager = NetworkManager.registerGame(this.gameId, this, {
        strategy: 'snapshot',
        interpolationDelay: 100
      });
    }

    const world = this.getWorld();
    const replicator = this.networkManager.getReplicator();
    const currentServerEntities = new Set<string>();

    this.ENTITY_SYNC_DESCRIPTORS.forEach(descriptor => {
      syncEntitiesFromServer(world, replicator, descriptor, state, currentServerEntities, localSessionId);
    });

    const entries: InterpolationSnapshotEntry[] = [];
    if (state.players) {
        Object.entries(state.players as Record<string, any>).forEach(([sessionId, p]) => {
            const entityId = replicator.getLocalId(`player_${sessionId}`);
            if (entityId !== undefined) entries.push({ entityId, x: p.x, y: p.y, rotation: p.angle });
        });
    }
    if (state.enemies) {
        Object.entries(state.enemies as Record<string, any>).forEach(([id, p]) => {
            const entityId = replicator.getLocalId(`enemy_${id}`);
            if (entityId !== undefined) entries.push({ entityId, x: p.x, y: p.y, rotation: p.angle });
        });
    }
    if (state.bullets) {
        Object.entries(state.bullets as Record<string, any>).forEach(([id, p]) => {
            const entityId = replicator.getLocalId(`bullet_${id}`);
            if (entityId !== undefined) entries.push({ entityId, x: p.x, y: p.y, rotation: p.angle });
        });
    }

    const snapshot = buildInterpolationSnapshot((state.tick as number) || 0, entries);
    this.networkManager.processServerUpdate(snapshot.tick, snapshot);

    pruneStaleEntities(replicator, currentServerEntities, world.getCommandBuffer());

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
  public override setInputState(input: any): void {
    const sceneWorld = this.currentScene ? this.currentScene.getWorld() : this.world;
    const players = sceneWorld.query("Player");
    if (players.length > 0) {
      const player = players[0];

      // CanonicalInputState support
      const axes = input.axes ?? input;
      const actions = input.actions;

      if (sceneWorld.hasComponent(player, "Player")) {
        sceneWorld.mutateComponent(player, "Player", (p: any) => {
          if (axes.moveX !== undefined) p.moveX = axes.moveX;
          if (axes.moveY !== undefined) p.moveY = axes.moveY;
          if (actions !== undefined) {
            p.useBomb = actions instanceof Set ? actions.has("bomb") : !!actions.bomb;
          } else if (input.bomb !== undefined) {
            p.useBomb = !!input.bomb;
          }
        });
      }

      if (sceneWorld.hasComponent(player, "Aim")) {
        sceneWorld.mutateComponent(player, "Aim", (aim: any) => {
          if (axes.aimX !== undefined && axes.aimY !== undefined) {
            if (input.mouseAbsolute) {
              const playerTransform = sceneWorld.getComponent(player, "Transform") as TransformComponent | undefined;
              if (playerTransform) {
                const worldMouse = Camera2DSystem.screenToWorld(sceneWorld, axes.aimX, axes.aimY);
                aim.aimX = worldMouse.x - playerTransform.x;
                aim.aimY = worldMouse.y - playerTransform.y;
              }
            } else {
              aim.aimX = axes.aimX;
              aim.aimY = axes.aimY;
            }
          }
          if (actions !== undefined) {
            aim.isFiring = actions instanceof Set ? actions.has("fire") : !!actions.fire;
          } else if (input.fire !== undefined) {
            aim.isFiring = !!input.fire;
          }
        });
      }
    }
  }

  public initializeRenderer(renderer: Renderer<GeometryWarsComponentRegistry, any>): void {
    const { registerSharedVFX } = require("../shared/rendering/SharedVFX");
    registerSharedVFX(renderer);

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

      const comboEntities = sceneWorld.query("Combo");
      const comboEntity = comboEntities[0];
      if (comboEntity !== undefined) {
        const comboComp = sceneWorld.getComponent(comboEntity, "Combo");
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

export const GeometryWarsDefinition: GameDefinition = {
  name: "geometrywars",
  createSimulation: (seed: number) => {
    const game = new GeometryWarsGame({ gameOptions: { seed } });
    return game;
  },
  inputSchema: {
    actions: [
      "moveUp",
      "moveDown",
      "moveLeft",
      "moveRight",
      "shootUp",
      "shootDown",
      "shootLeft",
      "shootRight",
      "bomb"
    ]
  },
  assets: {
    sprites: [],
    sounds: []
  }
};
