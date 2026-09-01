import { BaseGame, WorldSnapshot, GameLoop, World, System, SystemPhase, InputSystem, MovementSystem, CollisionSystem2D, JuiceSystem, Renderer, EventBus, UnifiedInputSystem, MutatorSystem, NetworkManager, LocalPredictionSystem, RemoteInterpolationSystem, HierarchySystem, TTLSystem, WebAudioPlayer } from "@tiny-aster/core";
import { FlappyBirdInput, FLAPPY_CONFIG, INITIAL_FLAPPY_STATE, FlappyBirdState, BirdComponent, PipeComponent, FlappyBirdComponentRegistry } from "./types/FlappyBirdTypes";
import { ComboSystem } from "@tiny-aster/core";
import { FlappyBirdGameStateSystem } from "./systems/FlappyBirdGameStateSystem";
import { FlappyBirdInputSystem } from "./systems/FlappyBirdInputSystem";
import { FlappyBirdCollisionSystem } from "./systems/FlappyBirdCollisionSystem";
import { FlappyBirdGlideSystem } from "./systems/FlappyBirdGlideSystem";
import { FlappyBirdRenderSystem } from "./systems/FlappyBirdRenderSystem";
import { IFlappyBirdGame } from "./types/GameInterfaces";
import { InputBufferSystem } from "./systems/FlappyBirdInputSystem";
import {
  createBird,
  createGameState,
  createGround
} from "./EntityFactory";
import { registerMutatorHook } from "../../utils/MutatorRegistry";
import { AchievementSystem } from "../shared/arcade";

/**
 * Controlador principal del juego Flappy Bird.
 *
 * @remarks
 * Implementa mecánicas de scroll infinito y generación procedural de obstáculos (tuberías).
 * Utiliza un sistema de gravedad simple y una única acción de entrada ("jump").
 */
import { ColliderComponent, CollisionEventsComponent, ShapeType, CircleShape, BoxShape, BoundaryComponent, TransformComponent, VelocityComponent, RenderComponent, HealthComponent, BlueprintDefinition, createEmitter, Theme, resolveThemeColor } from "@tiny-aster/core";
import { CollisionLayers } from "../shared/types/CollisionLayers";
import { spawnVisualParticle as spawnCanvasParticle } from "./rendering/FlappyBirdCanvasVisuals";
import { spawnVisualParticle as spawnSkiaParticle } from "./rendering/FlappyBirdSkiaVisuals";
import { createThemeFromGameAccents } from "../../theme/gameAccents";

export interface FlappyBirdBlueprintMap extends Record<string, BlueprintDefinition<FlappyBirdComponentRegistry, any, any>> {
  bird: BlueprintDefinition<FlappyBirdComponentRegistry, any, { x: number, y: number }>;
  pipe: BlueprintDefinition<FlappyBirdComponentRegistry, any, { x: number, gapY: number }>;
  ground: BlueprintDefinition<FlappyBirdComponentRegistry, any, {}>;
  state: BlueprintDefinition<FlappyBirdComponentRegistry, any, {}>;
}

export class FlappyBirdGame
  extends BaseGame<FlappyBirdState, FlappyBirdInput, FlappyBirdComponentRegistry, any, FlappyBirdBlueprintMap>
  implements IFlappyBirdGame {

  private gameStateSystem!: FlappyBirdGameStateSystem;
  private networkManager!: NetworkManager<any>;
  public readonly gameId = "flappybird";
  private config!: typeof FLAPPY_CONFIG;
  public isMultiplayer = false;
  private activeRendererType: "canvas" | "skia" = "canvas";

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown>, audio?: any, theme?: Theme } = {}) {
    const seed = config.gameOptions?.seed as number || config.seed;
    super({
      pauseKey: FLAPPY_CONFIG.KEYS.PAUSE,
      restartKey: FLAPPY_CONFIG.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      theme: config.theme ?? createThemeFromGameAccents("flappy-bird"),
      gameOptions: { ...config.gameOptions, seed },
      audio: config.audio || new WebAudioPlayer()
    });
    this.isMultiplayer = !!config.isMultiplayer;
  }

  protected override async onRegisterSystems(): Promise<void> {
    const mutators = (this._config.gameOptions?.mutators as any[]) || (this._config.gameOptions?.activeMutators as any[]) || [];
    this.config = mutators.length > 0
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...(FLAPPY_CONFIG as any) })
      : { ...FLAPPY_CONFIG };
    this.world.setResource("ScreenConfig", { width: this.config.SCREEN_WIDTH, height: this.config.SCREEN_HEIGHT });
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    await this.onPreloadAssets();

    // Register blueprints
    this.blueprints.register("bird", {
      spawn: (world, entity, args: { x: number, y: number }) => {
        const tint = resolveThemeColor(world, "bird", "player");

        world.addComponent(entity, { type: "Transform", x: args.x, y: args.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: args.x, worldY: args.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
        world.addComponent(entity, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 } as VelocityComponent);
        world.addComponent(entity, {
          type: "Render",
          shape: "bird",
          size: FLAPPY_CONFIG.BIRD_RADIUS,
          color: tint,
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 0,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent);
        world.addComponent(entity, {
          type: "Collider",
          shape: { type: ShapeType.Circle, radius: (FLAPPY_CONFIG.BIRD_RADIUS - 2) * 0.85 } as CircleShape,
          layer: CollisionLayers.PLAYER,
          mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as ColliderComponent);
        world.addComponent(entity, {
          type: "CollisionEvents",
          collisions: [],
          activeTriggers: [],
          triggersEntered: [],
          triggersExited: []
        } as CollisionEventsComponent);
        world.addComponent(entity, {
          type: "Bird",
          velocityY: 0,
          isAlive: true,
          isGliding: false,
          nearMissTimer: 0,
          coyoteTimer: 0,
        });
        world.addComponent(entity, {
          type: "FlappyInput",
          flap: false,
          glide: false,
          flapCooldownRemaining: 0,
        });
        world.addComponent(entity, {
          type: "Health",
          current: 1,
          max: 1,
          invulnerableRemaining: 0,
        } as HealthComponent);
        world.addComponent(entity, {
          type: "Combo",
          combo: 0,
          multiplier: 1,
          timerRemaining: 0,
          timerDuration: 2.0
        } as any);

        createEmitter(world as any, {
          type: "spawn",
          x: args.x,
          y: args.y,
          rate: 0,
          burst: true,
          count: 3,
          lifetime: [0.8, 1.2],
          speed: [20, 40],
          angle: [260, 280],
          size: [3, 5],
          color: ["#D3D9E2", "#00F3FF"],
          loop: false
        });
      }
    });

    this.blueprints.register("pipe", {
      spawn: (world, entity, args: { x: number, gapY: number }) => {
        const pipeColor = resolveThemeColor(world, "pipe", "enemy");

        // Since original createPipe spawned TWO entities, we can spawn a bottom pipe too or define separate blueprints.
        // But to keep it as a single spawner interface, let's spawn both from this blueprint using commands inside commands!
        const halfGap = FLAPPY_CONFIG.GAP_SIZE / 2;
        const pipeWidth = FLAPPY_CONFIG.PIPE_WIDTH;
        const pipeSpeed = FLAPPY_CONFIG.PIPE_SPEED;

        // Top Pipe components are added on this entity
        const topY = args.gapY - halfGap;
        world.addComponent(entity, { type: "Transform", x: args.x, y: topY / 2, rotation: 0, scaleX: 1, scaleY: 1, worldX: args.x, worldY: topY / 2, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
        world.addComponent(entity, { type: "Velocity", vx: -pipeSpeed, vy: 0, angularVelocity: 0 } as VelocityComponent);
        world.addComponent(entity, {
          type: "Render",
          shape: "pipe",
          size: pipeWidth,
          color: pipeColor,
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 0,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent);
        world.addComponent(entity, {
          type: "Collider",
          shape: { type: ShapeType.Box, width: pipeWidth, height: topY } as BoxShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as ColliderComponent);
        world.addComponent(entity, {
          type: "CollisionEvents",
          collisions: [],
          activeTriggers: [],
          triggersEntered: [],
          triggersExited: []
        } as CollisionEventsComponent);
        world.addComponent(entity, { type: "Pipe", gapY: args.gapY, gapSize: FLAPPY_CONFIG.GAP_SIZE, scored: false });

        // Spawn Bottom Pipe entity deferredly/immediately
        const bottomEntity = world.createEntity();
        const bottomY = args.gapY + halfGap;
        const bottomHeight = FLAPPY_CONFIG.SCREEN_HEIGHT - bottomY;
        world.addComponent(bottomEntity, { type: "Transform", x: args.x, y: bottomY + bottomHeight / 2, rotation: 0, scaleX: 1, scaleY: 1, worldX: args.x, worldY: bottomY + bottomHeight / 2, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
        world.addComponent(bottomEntity, { type: "Velocity", vx: -pipeSpeed, vy: 0, angularVelocity: 0 } as VelocityComponent);
        world.addComponent(bottomEntity, {
          type: "Render",
          shape: "pipe",
          size: pipeWidth,
          color: pipeColor,
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 0,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent);
        world.addComponent(bottomEntity, {
          type: "Collider",
          shape: { type: ShapeType.Box, width: pipeWidth, height: bottomHeight } as BoxShape,
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as ColliderComponent);
        world.addComponent(bottomEntity, {
          type: "CollisionEvents",
          collisions: [],
          activeTriggers: [],
          triggersEntered: [],
          triggersExited: []
        } as CollisionEventsComponent);
        world.addComponent(bottomEntity, { type: "Pipe", gapY: args.gapY, gapSize: FLAPPY_CONFIG.GAP_SIZE, scored: true });
      }
    });

    this.blueprints.register("ground", {
      spawn: (world, entity, _args: {}) => {
        const groundColor = resolveThemeColor(world, "ground");

        world.addComponent(entity, { type: "Transform", x: FLAPPY_CONFIG.SCREEN_WIDTH / 2, y: FLAPPY_CONFIG.GROUND_Y, rotation: 0, scaleX: 1, scaleY: 1, worldX: FLAPPY_CONFIG.SCREEN_WIDTH / 2, worldY: FLAPPY_CONFIG.GROUND_Y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
        world.addComponent(entity, {
          type: "Collider",
          shape: { type: ShapeType.Box, width: FLAPPY_CONFIG.SCREEN_WIDTH, height: FLAPPY_CONFIG.SCREEN_HEIGHT - FLAPPY_CONFIG.GROUND_Y } as BoxShape,
          layer: CollisionLayers.DEBRIS,
          mask: CollisionLayers.PLAYER,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as ColliderComponent);
        world.addComponent(entity, {
          type: "CollisionEvents",
          collisions: [],
          activeTriggers: [],
          triggersEntered: [],
          triggersExited: []
        } as CollisionEventsComponent);
        world.addComponent(entity, { type: "Ground" });
        world.addComponent(entity, {
          type: "Render",
          shape: "ground",
          size: FLAPPY_CONFIG.SCREEN_WIDTH,
          color: groundColor,
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 0,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent);
      }
    });

    this.blueprints.register("state", {
      spawn: (world, entity, _args: {}) => {
        world.addComponent(entity, {
          type: "FlappyState",
          score: 0,
          isGameOver: false,
          highScore: 0,
          pipeSpawnTimer: 0,
          gameOverLogged: false,
        });
      }
    });

    // Bind inputs for UnifiedInputSystem
    this.unifiedInput.bind("flap", [FLAPPY_CONFIG.KEYS.FLAP]);

    this.gameStateSystem = new FlappyBirdGameStateSystem(this, this.config);

    const inputSys = new FlappyBirdInputSystem(this.config);
    if (this.isMultiplayer) inputSys.setMultiplayerMode(true);

    if (this.unifiedInput instanceof System) {
      this.world.addSystem(this.unifiedInput as unknown as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Input });
    }
    this.world.addSystem(new InputBufferSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ComboSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(inputSys, { phase: SystemPhase.Simulation });
    this.world.addSystem(new FlappyBirdGlideSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(new HierarchySystem() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Transform });
    this.world.addSystem(new TTLSystem() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(new CollisionSystem2D() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Collision });
    this.world.addSystem(new FlappyBirdCollisionSystem(this), { phase: SystemPhase.GameRules });
    this.world.addSystem(this.gameStateSystem, { phase: SystemPhase.GameRules });
    this.world.addSystem(new AchievementSystem() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Simulation });

    this.world.addSystem(new MutatorSystem(mutators) as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Simulation });

    // Visual / Presentation
    this.world.addSystem(new JuiceSystem() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Presentation });
    this.world.addSystem(new FlappyBirdRenderSystem(), { phase: SystemPhase.Presentation });

    // Register visual feedback listener for obstacle pipe clearance
    const eventBus = this.getEventBus();
    if (eventBus) {
      eventBus.on("pipe:passed", () => {
        const birdEntities = this.world.query("Bird", "Transform");
        if (birdEntities.length > 0) {
          const transform = this.world.getComponent(birdEntities[0], "Transform");
          if (transform) {
            const bx = transform.worldX ?? transform.x;
            const by = transform.worldY ?? transform.y;

            const spawnParticle = this.activeRendererType === "skia" ? spawnSkiaParticle : spawnCanvasParticle;

            const renderRandom = this.world.renderRandom;
            const count = 6 + renderRandom.nextInt(0, 3);
            for (let i = 0; i < count; i++) {
              const angle = renderRandom.next() * Math.PI * 2;
              const speed = renderRandom.nextRange(60, 150);
              const pvx = Math.cos(angle) * speed;
              const pvy = Math.sin(angle) * speed;
              const life = renderRandom.nextRange(0.3, 0.6);
              const size = renderRandom.nextRange(2.5, 4.5);
              const color = renderRandom.next() > 0.4 ? "#00F3FF" : "#FFFFFF"; // Cyan & white success sparks

              spawnParticle("spark", bx + 10, by, pvx, pvy, life, size, color, angle);
            }
          }
        }
      });
    }

    if (!this.networkManager) {
      this.networkManager = NetworkManager.registerGame(this.gameId, this, {
        strategy: 'snapshot',
        interpolationDelay: 100
      });
    }
    this.world.addSystem(new LocalPredictionSystem(this.networkManager, () => {}) as System<any>, { phase: SystemPhase.Input });
    this.world.addSystem(new RemoteInterpolationSystem(this.networkManager) as System<any>, { phase: SystemPhase.Presentation });
  }

  protected override async onInitializeEntities(): Promise<void> {
    if (this.isMultiplayer) return;
    createGameState(this.world);
    createBird({ world: this.world, x: FLAPPY_CONFIG.BIRD_X, y: FLAPPY_CONFIG.BIRD_START_Y });
    createGround(this.world);
  }

  protected override async onBeforeRestart(): Promise<void> {
    this.gameStateSystem?.resetGameOverState(this.world);
    if (this.isMultiplayer) {
      this.networkManager?.reset();
    }
  }

  public override update(dt: number): void {
      this.world.update(dt);
  }

  private async onPreloadAssets(): Promise<void> {
    const audio = this.audio;
    const assets = [
      { id: "flap", path: "/audio/flap.mp3" },
      { id: "hit", path: "/audio/hit.mp3" },
      { id: "score", path: "/audio/score.mp3" },
      { id: "game_over", path: "/audio/game_over.mp3" },
    ];
    for (const asset of assets) {
      try {
        await audio.loadSFX(asset.id, asset.path);
      } catch (e) {
        console.error(`[Audio] Failed to load asset "${asset.id}" from "${asset.path}":`, e);
      }
    }
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public override setInputState(input: any): void {
    const world = this.getWorld();
    const birdEntity = world.query("Bird")[0];
    if (birdEntity !== undefined) {
      if (!world.hasComponent(birdEntity, "FlappyInput")) {
        world.addComponent(birdEntity, {
          type: "FlappyInput",
          flap: false,
          glide: false,
          flapCooldownRemaining: 0,
        } as any);
      }
      world.mutateComponent(birdEntity, "FlappyInput", (inputComp: any) => {
        if (input && typeof input === "object" && input.axes) {
          const moveY = input.axes.moveY ?? 0;
          const actions = input.actions;
          const hasAction = (name: string) => actions instanceof Set ? actions.has(name) : !!actions?.includes?.(name);

          inputComp.flap = hasAction("confirm") || hasAction("fire") || moveY < 0;
          inputComp.glide = hasAction("boost") || moveY > 0;
        } else {
          if (input.flap !== undefined) {
            inputComp.flap = input.flap;
          }
          if (input.glide !== undefined) {
            inputComp.glide = input.glide;
          }
        }
      });
    }
  }

  public setInput(input: Partial<FlappyBirdInput>) {
    this.setInputState(input);
  }

  public updateFromServer(state: Record<string, unknown>) {
    if (!this.isMultiplayer || !state) return;
    const world = this.getWorld();
    const commands = world.getCommandBuffer();
    const replicator = this.networkManager.getReplicator();

    const currentServerEntities = new Set<string>();

    if (state.players && typeof state.players === 'object') {
      const players = state.players as Record<string, { x: number, y: number, alive: boolean, velocityY: number }>;
      Object.entries(players).forEach(([sessionId, playerState]) => {
        const serverId = `player_${sessionId}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "Transform", x: playerState.x, y: playerState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: playerState.x, worldY: playerState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
          commands.addComponent(entity, { type: "Render", shape: "bird", size: 15, color: "yellow", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as RenderComponent);
          commands.addComponent(entity, {
            type: "Bird",
            velocityY: playerState.velocityY,
            isAlive: playerState.alive,
            isGliding: false,
            nearMissTimer: 0
          } as BirdComponent);
        }

        world.mutateComponent(entity, "Bird", bird => {
          bird.isAlive = playerState.alive;
          bird.velocityY = playerState.velocityY;
        });

        world.mutateComponent(entity, "Render", render => {
          render.color = playerState.alive ? "yellow" : "gray";
        });
      });
    }

    if (state.pipes && typeof state.pipes === 'object') {
      const pipes = state.pipes as Record<string, { x: number, gapY: number, id: string }>;
      Object.entries(pipes).forEach(([id, pipeState]) => {
        const serverId = `pipe_${id}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "Transform", x: pipeState.x, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: pipeState.x, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
          commands.addComponent(entity, { type: "Render", shape: "pipe", size: 60, color: "green", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as RenderComponent);
          commands.addComponent(entity, { type: "Pipe", gapY: pipeState.gapY, gapSize: 140, scored: false } as PipeComponent);
        }
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
                snapshot.componentData["Transform"][entityId] = { type: "Transform", x: (p as any).x, y: (p as any).y, rotation: 0, scaleX: 1, scaleY: 1, worldX: (p as any).x, worldY: (p as any).y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
            }
        });
    }
    if (state.pipes) {
        Object.entries(state.pipes).forEach(([id, p]: [string, Record<string, unknown>]) => {
            const entityId = replicator.getLocalId(`pipe_${id}`);
            if (entityId !== undefined) {
                snapshot.entities.push(entityId);
                snapshot.componentData["Transform"][entityId] = { type: "Transform", x: (p as any).x, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: (p as any).x, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
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

  public initializeRenderer(renderer: Renderer<any, any>): void {
    if (renderer.type === "canvas") {
      this.activeRendererType = "canvas";
      const { drawFlappyBird, drawFlappyPipe, drawFlappyGround, scrollingBackgroundEffect } = require("./rendering/FlappyBirdCanvasVisuals");
      renderer.registerShape("bird", drawFlappyBird);
      renderer.registerShape("pipe", drawFlappyPipe);
      renderer.registerShape("ground", drawFlappyGround);
      renderer.registerBackgroundEffect("scrollingSky", scrollingBackgroundEffect);
    } else if (renderer.type === "skia") {
      this.activeRendererType = "skia";
      const { drawSkiaFlappyBird, drawSkiaFlappyPipe, drawSkiaFlappyGround, scrollingSkiaBackgroundEffect } = require("./rendering/FlappyBirdSkiaVisuals");
      renderer.registerShape("bird", drawSkiaFlappyBird);
      renderer.registerShape("pipe", drawSkiaFlappyPipe);
      renderer.registerShape("ground", drawSkiaFlappyGround);
      renderer.registerBackgroundEffect("scrollingSky", scrollingSkiaBackgroundEffect);
    }
  }

  public getGameState(): FlappyBirdState {
    const state = this.getWorld().getSingleton("FlappyState");
    return state ? { ...state } : { ...INITIAL_FLAPPY_STATE };
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  public getWorld(): World<FlappyBirdComponentRegistry> {
    return this.world;
  }
}

export class NullFlappyBirdGame implements IFlappyBirdGame {
  public get tick() { return 0; }
  public get state() { return this.getGameState(); }
  public step(input: any) {}
  public snapshot() {
    return {
      tick: 0,
      entities: [],
      componentData: {},
      stateVersion: 0,
      structureVersion: 0,
      seed: 0,
      nextEntityId: 0,
      freeEntities: []
    } as any;
  }
  public restore(snapshot: any) {}
  public hash() { return "00000000"; }

  public isMultiplayer = false;
  public gameId = "flappybird";
  private _world = new World<FlappyBirdComponentRegistry>();
  private _loop = new GameLoop();
  public async init() {}
  public start() {} public stop() {} public pause() {} public resume() {}
  public async restart() {} public destroy() {}
  public getWorld() { return this._world; }
  public getGameLoop() { return this._loop; }
  public getEventBus() { return new EventBus(); }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_FLAPPY_STATE; }
  public getSeed() { return 0; }
  public setInputState(input: Partial<FlappyBirdInput>) {}
  public setInput(input: Partial<FlappyBirdInput>) {}
  public subscribe(cb: (state: FlappyBirdState) => void) { return () => {}; }
  public initializeRenderer() {}
  public getInputSystem(): InputSystem { return new UnifiedInputSystem(); }
  public enterGameplayFreeze(duration?: number): void {
    this._world.setResource("GameplayFreeze", {
      remaining: duration !== undefined ? duration : undefined
    });
  }
  public exitGameplayFreeze(): void {
    this._world.deleteResource("GameplayFreeze");
  }
  public isGameplayFrozen(): boolean {
    return this._world.getResource("GameplayFreeze") !== undefined;
  }
  public getGameplayFreezeRemaining(): number | undefined {
    const freeze = this._world.getResource<{ remaining?: number }>("GameplayFreeze");
    return freeze ? freeze.remaining : undefined;
  }
}

// ==========================================================================
// GAME-SPECIFIC MUTATOR HOOKS (DECOUPLED FROM CORE REGISTRY)
// ==========================================================================

registerMutatorHook("combo_head_start", (world: World) => {
  const comboEntities = world.query("Combo" as any);
  if (comboEntities.length > 0) {
    world.mutateComponent(comboEntities[0], "Combo" as any, (c: any) => {
      c.combo = 5;
      c.multiplier = 2;
      c.timerRemaining = 999999;
    });
  }
});

registerMutatorHook("story_fragment", (world: World) => {
  const eventBus = world.getEventBus();
  if (eventBus) {
    eventBus.emit("story:beat_reached", { beatId: "flappybird_story_beat", dialogueReference: "story.chapter_1_fragment_2" });
  }
});

export const FlappyBirdDefinition = {
  name: "flappybird",
  createSimulation: (seed: number) => {
    const game = new FlappyBirdGame({ gameOptions: { seed } });
    return game;
  },
  inputSchema: {
    actions: ["flap", "glide"]
  },
  assets: {
    sprites: [],
    sounds: [
      { id: "flap", path: "/audio/flap.mp3" },
      { id: "hit", path: "/audio/hit.mp3" },
      { id: "score", path: "/audio/score.mp3" },
      { id: "game_over", path: "/audio/game_over.mp3" }
    ]
  }
};
