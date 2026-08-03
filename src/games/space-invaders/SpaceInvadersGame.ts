import { World, GameLoop, BaseGame, WorldSnapshot, Component, EventBus, UnifiedInputSystem, InputSystem, ConfigService, Renderer, NetworkManager, LocalPredictionSystem, RemoteInterpolationSystem, MutatorSystem, SystemPhase, createEmitter } from "@tiny-aster/core";
import { LootSystem, PowerUpSystem, ComboSystem } from "../shared/arcade";
import { EnemyFactory } from "./EnemyFactory";
/* eslint-disable @typescript-eslint/no-require-imports */
import { GameStateComponent, InputState, INITIAL_GAME_STATE, SpaceInvadersComponentRegistry, GAME_CONFIG } from "./types/SpaceInvadersTypes";
import { SpaceInvadersConfigSchema, SpaceInvadersConfig } from "./types/SpaceInvadersConfigSchema";
import { ISpaceInvadersGame } from "./types/GameInterfaces";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "./EntityPool";
import { SpaceInvadersGameScene } from "./scenes/SpaceInvadersGameScene";
import {
  drawSpaceInvadersPlayer,
  drawSpaceInvadersInvader,
  drawSpaceInvadersBullet,
  drawSpaceInvadersShield,
  drawSpaceInvadersParticle
} from "./rendering/SpaceInvadersCanvasVisuals";
import * as SharedVFX from "../shared/rendering/SharedVFX";

const __DEV__ = process.env.NODE_ENV !== "production";

/**
 * Main controller for the Space Invaders game.
 *
 * @remarks
 * Manages the enemy horde lifecycle and wave progression.
 * Unlike Asteroids, it uses a rigid formation system where the movement
 * of one entity affects the whole group (Swarm movement).
 */
import { TransformComponent, VelocityComponent, RenderComponent, Collider2DComponent, HealthComponent, BlueprintDefinition } from "@tiny-aster/core";
import { CollisionLayers } from "../shared/types/CollisionLayers";

export interface SpaceInvadersBlueprintMap extends Record<string, BlueprintDefinition<SpaceInvadersComponentRegistry, any, any>> {
  player: BlueprintDefinition<SpaceInvadersComponentRegistry, any, { x: number, y: number }>;
  invader: BlueprintDefinition<SpaceInvadersComponentRegistry, any, { x: number, y: number, row: number, col: number }>;
  shield: BlueprintDefinition<SpaceInvadersComponentRegistry, any, { x: number, y: number, row: number, col: number }>;
  state: BlueprintDefinition<SpaceInvadersComponentRegistry, any, {}>;
  formation: BlueprintDefinition<SpaceInvadersComponentRegistry, any, {}>;
}

export class SpaceInvadersGame
  extends BaseGame<GameStateComponent, InputState, SpaceInvadersComponentRegistry, any, SpaceInvadersBlueprintMap>
  implements ISpaceInvadersGame {

  public isMultiplayer = false;
  private playerBulletPool!: PlayerBulletPool;
  private enemyBulletPool!: EnemyBulletPool;
  private particlePool!: ParticlePool;
  private networkManager!: NetworkManager;
  public readonly gameId = "space-invaders";
  private config!: SpaceInvadersConfig;

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown> } = {}) {
    const seed = config.gameOptions?.seed as number || config.seed;
    const rawConfig = require("./config/space-invaders.json");
    super({
      pauseKey: rawConfig.KEYS.PAUSE,
      restartKey: rawConfig.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      gameOptions: { ...config.gameOptions, seed }
    });
    this.isMultiplayer = !!config.isMultiplayer;
  }

  protected override async onRegisterSystems(): Promise<void> {
    const rawConfig = require("./config/space-invaders.json");
    const baseConfig = ConfigService.load(this.gameId, SpaceInvadersConfigSchema, rawConfig) as any;

    const mutators = (this._config.gameOptions?.mutators as any[]) || (this._config.gameOptions?.activeMutators as any[]) || [];
    this.config = mutators.length > 0
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...(baseConfig as any) }) as SpaceInvadersConfig
      : { ...(baseConfig as any) } as SpaceInvadersConfig;

    this.world.setResource("GameConfig", this.config);
    this.world.setResource("ScreenConfig", { width: GAME_CONFIG.SCREEN_WIDTH, height: GAME_CONFIG.SCREEN_HEIGHT });
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    await this.onPreloadAssets();

    if (!this.playerBulletPool) this.playerBulletPool = new PlayerBulletPool();
    if (!this.enemyBulletPool) this.enemyBulletPool = new EnemyBulletPool();
    if (!this.particlePool) this.particlePool = new ParticlePool();

    // Register blueprints
    this.blueprints.register("player", {
      spawn: (world, entity, args: { x: number, y: number }) => {
        const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
        world.addComponent(entity, { type: "Transform", x: args.x, y: args.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: args.x, worldY: args.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
        world.addComponent(entity, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 } as VelocityComponent);
        world.addComponent(entity, {
          type: "Render",
          shape: "player_ship",
          size: config.PLAYER_RENDER_WIDTH,
          color: "#00FF00",
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 0,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent);
        world.addComponent(entity, {
          type: "Collider2D",
          shape: { type: "circle", radius: config.PLAYER_COLLIDER_RADIUS },
          layer: CollisionLayers.PLAYER,
          mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as Collider2DComponent);
        world.addComponent(entity, {
          type: "Health",
          current: config.PLAYER_INITIAL_LIVES,
          max: config.PLAYER_INITIAL_LIVES,
          invulnerableRemaining: 0,
        } as HealthComponent);
        world.addComponent(entity, {
          type: "Input",
          moveLeft: false,
          moveRight: false,
          shoot: false,
          shootCooldownRemaining: 0,
        } as any);
        world.addComponent(entity, { type: "Player" } as any);
        world.addComponent(entity, {
          type: "Boundary",
          width: GAME_CONFIG.SCREEN_WIDTH - config.PLAYER_RENDER_WIDTH,
          height: GAME_CONFIG.SCREEN_HEIGHT,
          mode: "bounce"
        } as any);

        createEmitter(world as any, {
          type: "spawn",
          x: args.x,
          y: args.y,
          rate: 0,
          burst: true,
          count: 4,
          lifetime: [1.0, 1.5],
          speed: [30, 60],
          angle: [260, 280],
          size: [2, 4],
          color: ["#00FF00"],
          loop: false
        });
      }
    });

    this.blueprints.register("invader", {
      spawn: (world, entity, args: { x: number, y: number, row: number, col: number }) => {
        const blueprintId = args.row === 0 ? "invader_commander" : "invader_scout";
        const enemy = EnemyFactory.createEnemy(world, blueprintId, args.x, args.y, {}, false);
        const points = (5 - args.row) * 10;

        world.addComponent(enemy, { type: "Invader", row: args.row, col: args.col, points } as any);
        world.addComponent(enemy, {
          type: "LootTable",
          tableId: "invader",
          drops: [
            { type: "speed", chance: 0.05, config: { value: 1.5, duration: 5000 } },
            { type: "triple_shot", chance: 0.05, config: { duration: 8000 } }
          ]
        } as any);
      }
    });

    this.blueprints.register("shield", {
      spawn: (world, entity, args: { x: number, y: number, row: number, col: number }) => {
        const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
        world.addComponent(entity, { type: "Transform", x: args.x, y: args.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: args.x, worldY: args.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
        world.addComponent(entity, {
          type: "Render",
          shape: "shield_block",
          size: 15,
          color: "#00FF00",
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 0,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent);
        world.addComponent(entity, {
          type: "Collider2D",
          shape: { type: "aabb", halfWidth: 7.5, halfHeight: 7.5 },
          layer: CollisionLayers.DEBRIS,
          mask: CollisionLayers.ENEMY | CollisionLayers.PROJECTILE,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as Collider2DComponent);
        world.addComponent(entity, {
          type: "Shield",
          hp: config.SHIELD_SEGMENT_HP,
          maxHp: config.SHIELD_SEGMENT_HP,
          segment: { row: args.row, col: args.col }
        } as any);
      }
    });

    this.blueprints.register("state", {
      spawn: (world, entity, _args: {}) => {
        const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
        const hasComboHeadStart = world.getResource("HasComboHeadStart") === true;
        const initialCombo = hasComboHeadStart ? 5 : 0;
        const initialMultiplier = hasComboHeadStart ? 2 : 1;
        const initialTimerRemaining = hasComboHeadStart ? config.COMBO_TIMEOUT / 1000 : 0;

        world.addComponent(entity, {
          type: "GameState",
          lives: config.PLAYER_INITIAL_LIVES,
          score: 0,
          level: 1,
          invadersRemaining: 0,
          isGameOver: false,
          combo: initialCombo,
          multiplier: initialMultiplier,
          comboTimerRemaining: initialTimerRemaining,
          screenShake: null,
          kamikazesActive: 0,
        } as any);
        world.addComponent(entity, {
          type: "Combo",
          combo: initialCombo,
          multiplier: initialMultiplier,
          timerRemaining: initialTimerRemaining,
          timerDuration: config.COMBO_TIMEOUT / 1000
        } as any);
      }
    });

    this.blueprints.register("formation", {
      spawn: (world, entity, _args: {}) => {
        const config = world.getResource<SpaceInvadersConfig>("GameConfig") || GAME_CONFIG;
        world.addComponent(entity, {
          type: "Formation",
          direction: 1,
          stepDownPending: false,
          speed: config.INVADER_SPEED_BASE,
          descentStep: config.INVADER_DESCENT_STEP,
          leftBound: 0,
          rightBound: 0,
          fireCooldownRemaining: config.ENEMY_FIRE_INTERVAL_MIN,
        } as any);
      }
    });

    // Bind inputs for UnifiedInputSystem
    this.unifiedInput.bind("moveLeft", [this.config.KEYS.LEFT]);
    this.unifiedInput.bind("moveRight", [this.config.KEYS.RIGHT]);
    this.unifiedInput.bind("shoot", [this.config.KEYS.SHOOT]);

    const gameScene = new SpaceInvadersGameScene(
      this,
      this.playerBulletPool,
      this.enemyBulletPool,
      this.particlePool,
      this.config
    );

    // Register Power-up systems in the scene world
    const sceneWorld = gameScene.getWorld();
    sceneWorld.addSystem(new LootSystem());
    sceneWorld.addSystem(new PowerUpSystem());
    sceneWorld.addSystem(new ComboSystem() as any);

    if (!this.networkManager) {
      this.networkManager = NetworkManager.registerGame(this.gameId, this, {
          strategy: 'hybrid',
          interpolationDelay: 100
      });
    }
    sceneWorld.addSystem(new LocalPredictionSystem(this.networkManager, () => {}), { phase: SystemPhase.Input });
    sceneWorld.addSystem(new RemoteInterpolationSystem(this.networkManager), { phase: SystemPhase.Presentation });

    await this.sceneManager.transitionTo(gameScene);
  }

  protected override async onBeforeRestart(): Promise<void> {
    this.sceneManager?.destroy();
  }

  public override update(dt: number): void {
      this.getWorld().update(dt);
  }

  private async onPreloadAssets(): Promise<void> {
    const audio = this.audio;
    try {
      await Promise.all([
        audio.loadSFX("shoot", "/audio/shoot.mp3"),
        audio.loadSFX("explosion", "/audio/explosion.mp3"),
        audio.loadSFX("hit", "/audio/hit.mp3"),
        audio.loadSFX("game_over", "/audio/game_over.mp3"),
      ]);
    } catch (e) {
      console.warn("[SpaceInvaders] Asset preloading failed.", e);
    }
  }

  public initializeRenderer(renderer: Renderer<any>): void {
    if ((renderer as any).type === "canvas") {
      (renderer as any).registerShape("player_ship", drawSpaceInvadersPlayer);
      (renderer as any).registerShape("invader", drawSpaceInvadersInvader);
      (renderer as any).registerShape("player_bullet", drawSpaceInvadersBullet);
      (renderer as any).registerShape("enemy_bullet", drawSpaceInvadersBullet); // Reuse bullet drawer
      (renderer as any).registerShape("shield_block", drawSpaceInvadersShield);
      (renderer as any).registerShape("particle", drawSpaceInvadersParticle);

      // Register custom new VFX
      (renderer as any).registerBackgroundEffect("starfield", SharedVFX.ScrollingStarfieldEffect);
      (renderer as any).registerBackgroundEffect("crt_scanlines", SharedVFX.RetroCRTScanlinesEffect);
      (renderer as any).registerBackgroundEffect("warp_speed", SharedVFX.HyperdriveWarpSpeedLinesEffect);
      (renderer as any).registerBackgroundEffect("nebula", SharedVFX.DriftingNebulaBackgroundEffect);
      (renderer as any).registerBackgroundEffect("matrix_rain", SharedVFX.MatrixDigitalRainEffect);
      (renderer as any).registerBackgroundEffect("crt_glitch", SharedVFX.CRTGlitchShudderEffect);
      (renderer as any).registerBackgroundEffect("border_glow", SharedVFX.ScreenBorderGlowEffect);
      (renderer as any).registerShape("shield_bubble", SharedVFX.EnergyShieldBubbleEffect);
      (renderer as any).registerShape("shockwave", SharedVFX.DebrisShockwaveEffect);
      (renderer as any).registerShape("thruster_flame", SharedVFX.ThrusterPlumeFlameEffect);
      (renderer as any).registerShape("laser_beam", SharedVFX.LaserRailBeamEffect);
      (renderer as any).registerShape("singularity", SharedVFX.SingularityVortexEffect);
      (renderer as any).registerShape("comet_trail", SharedVFX.CometMotionTrailEffect);
      (renderer as any).registerShape("hologram_glitch", SharedVFX.RGBHologramGlitchEffect);
      (renderer as any).registerShape("floating_text", SharedVFX.FloatingTextScoreEffect);
    } else if ((renderer as any).type === "skia") {
      // Register custom new VFX for Skia mode
      (renderer as any).registerBackgroundEffect("starfield", SharedVFX.SkiaScrollingStarfieldEffect);
      (renderer as any).registerBackgroundEffect("crt_scanlines", SharedVFX.SkiaRetroCRTScanlinesEffect);
      (renderer as any).registerBackgroundEffect("warp_speed", SharedVFX.SkiaHyperdriveWarpSpeedLinesEffect);
      (renderer as any).registerBackgroundEffect("nebula", SharedVFX.SkiaDriftingNebulaBackgroundEffect);
      (renderer as any).registerBackgroundEffect("matrix_rain", SharedVFX.SkiaMatrixDigitalRainEffect);
      (renderer as any).registerBackgroundEffect("crt_glitch", SharedVFX.SkiaCRTGlitchShudderEffect);
      (renderer as any).registerBackgroundEffect("border_glow", SharedVFX.SkiaScreenBorderGlowEffect);
      (renderer as any).registerShape("shield_bubble", SharedVFX.SkiaEnergyShieldBubbleEffect);
      (renderer as any).registerShape("shockwave", SharedVFX.SkiaDebrisShockwaveEffect);
      (renderer as any).registerShape("thruster_flame", SharedVFX.SkiaThrusterPlumeFlameEffect);
      (renderer as any).registerShape("laser_beam", SharedVFX.SkiaLaserRailBeamEffect);
      (renderer as any).registerShape("singularity", SharedVFX.SkiaSingularityVortexEffect);
      (renderer as any).registerShape("comet_trail", SharedVFX.SkiaCometMotionTrailEffect);
      (renderer as any).registerShape("hologram_glitch", SharedVFX.SkiaRGBHologramGlitchEffect);
      (renderer as any).registerShape("floating_text", SharedVFX.SkiaFloatingTextScoreEffect);
    }
  }

  public getGameState(): GameStateComponent {
    const world = this.getWorld();
    const state = world.getSingleton("GameState");
    return state ? { ...state } : INITIAL_GAME_STATE;
  }

  public getWorld(): World<SpaceInvadersComponentRegistry> {
    // Priority 1: Scene-specific world (active gameplay)
    const scene = this.sceneManager?.getCurrentScene();
    if (scene) {
      return scene.getWorld() as World<SpaceInvadersComponentRegistry>;
    }
    // Priority 2: Base world (loading/initialization)
    return this.world;
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public override setInputState(input: Partial<InputState>): void {
    const world = this.getWorld();
    const playerEntity = world.query("Player")[0];
    if (playerEntity !== undefined) {
      if (!world.hasComponent(playerEntity, "Input")) {
        world.addComponent(playerEntity, {
          type: "Input",
          moveLeft: false,
          moveRight: false,
          shoot: false,
          shootCooldownRemaining: 0,
        } as any);
      }
      world.mutateComponent(playerEntity, "Input", (inputComp: any) => {
        if (input.moveLeft !== undefined) {
          inputComp.moveLeft = input.moveLeft;
        }
        if (input.moveRight !== undefined) {
          inputComp.moveRight = input.moveRight;
        }
        if (input.shoot !== undefined) {
          inputComp.shoot = input.shoot;
        }
      });
    }
  }

  public setInput(input: Partial<InputState>) {
    this.setInputState(input);
  }

  public updateFromServer(state: Record<string, unknown>) {
    if (!this.isMultiplayer || !state) return;
    const world = this.getWorld();
    const replicator = this.networkManager.getReplicator();
    const commands = world.getCommandBuffer();

    const currentServerEntities = new Set<string>();

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

    // Update Players
    if (state.players && typeof state.players === 'object') {
      const players = state.players as Record<string, { x: number, y: number, alive: boolean, sessionId?: string }>;
      Object.entries(players).forEach(([sessionId, playerState]) => {
        const serverId = `player_${sessionId}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "Player" } as any);
          commands.addComponent(entity, { type: "Transform", x: playerState.x, y: playerState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: playerState.x, worldY: playerState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
          commands.addComponent(entity, { type: "Render", shape: "player_ship", size: 20, color: "green", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as any);
        }

        snapshot.entities.push(entity);
        snapshot.componentData["Transform"][entity] = { type: "Transform", x: playerState.x, y: playerState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: playerState.x, worldY: playerState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };

        world.mutateComponent(entity, "Render", render => {
          render.color = playerState.alive ? "green" : "red";
        });
      });
    }

    // Update Invaders
    if (state.invaders && typeof state.invaders === 'object') {
      const invaders = state.invaders as Record<string, { x: number, y: number, alive: boolean, id: string }>;
      Object.entries(invaders).forEach(([id, invaderState]) => {
        if (!invaderState.alive) return;
        const serverId = `invader_${id}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "Invader", row: 0, col: 0, points: 10 } as any);
          commands.addComponent(entity, { type: "Transform", x: invaderState.x, y: invaderState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: invaderState.x, worldY: invaderState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
          commands.addComponent(entity, { type: "Render", shape: "invader", size: 15, color: "white", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as any);
        }

        snapshot.entities.push(entity);
        snapshot.componentData["Transform"][entity] = { type: "Transform", x: invaderState.x, y: invaderState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: invaderState.x, worldY: invaderState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
      });
    }

    // Update Bullets
    if (state.bullets && typeof state.bullets === 'object') {
      const bullets = state.bullets as Record<string, { x: number, y: number, ownerId: string }>;
      Object.entries(bullets).forEach(([id, bulletState]) => {
        const serverId = `bullet_${id}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "PlayerBullet" } as any);
          commands.addComponent(entity, { type: "Transform", x: bulletState.x, y: bulletState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: bulletState.x, worldY: bulletState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
          commands.addComponent(entity, { type: "Render", shape: "player_bullet", size: 5, color: "yellow", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as any);
        }

        snapshot.entities.push(entity);
        snapshot.componentData["Transform"][entity] = { type: "Transform", x: bulletState.x, y: bulletState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: bulletState.x, worldY: bulletState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
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

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  public override start(): void {
    super.start();
    if (__DEV__) console.log("[SpaceInvadersGame] Simulation started");
  }

  public stop(): void {
    if (__DEV__) console.log("[SpaceInvadersGame] Simulation stopped");
  }

  public override pause(): void {
    super.pause();
    this.getWorld().setResource("IsPaused", true);
    if (__DEV__) console.log("[SpaceInvadersGame] Simulation paused");
  }

  public override resume(): void {
    super.resume();
    this.getWorld().setResource("IsPaused", false);
    if (__DEV__) console.log("[SpaceInvadersGame] Simulation resumed");
  }
}

export class NullSpaceInvadersGame implements ISpaceInvadersGame {
  public isMultiplayer = false;
  public gameId = "space-invaders";
  private _world = new World<SpaceInvadersComponentRegistry>();
  private _loop = new GameLoop();
  public getWorld() { return this._world; }
  public getGameLoop() { return this._loop; }
  public getEventBus() { return new EventBus(); }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_GAME_STATE; }
  public getSeed() { return 0; }
  public async init() {}
  public start() {}
  public pause() {}
  public resume() {}
  public destroy() {}
  public async restart() {}
  public subscribe(cb: (state: GameStateComponent) => void) { return () => {}; }
  public setInputState(input: Partial<InputState>) {}
  public setInput(input: Partial<InputState>) {}
  public initializeRenderer() {}
  public getInputSystem(): InputSystem { return new UnifiedInputSystem(); }
}
