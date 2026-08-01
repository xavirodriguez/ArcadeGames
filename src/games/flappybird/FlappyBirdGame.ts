import { BaseGame, WorldSnapshot, GameLoop, World, System, SystemPhase, InputSystem, MovementSystem, HierarchySystem, CollisionSystem2D, JuiceSystem, Renderer, EventBus, UnifiedInputSystem, MutatorSystem, NetworkManager, LocalPredictionSystem, RemoteInterpolationSystem, ParallaxSystem } from "@tiny-aster/core";
import { FlappyBirdInput, FLAPPY_CONFIG, INITIAL_FLAPPY_STATE, FlappyBirdState, BirdComponent, PipeComponent, FlappyBirdComponentRegistry } from "./types/FlappyBirdTypes";
import { FlappyBirdGameStateSystem } from "./systems/FlappyBirdGameStateSystem";
import { ComboSystem } from "../shared/arcade";
import { BENEFICIAL_MUTATORS } from "../../utils/MutatorRegistry";
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

/**
 * Controlador principal del juego Flappy Bird.
 *
 * @remarks
 * Implementa mecánicas de scroll infinito y generación procedural de obstáculos (tuberías).
 * Utiliza un sistema de gravedad simple y una única acción de entrada ("jump").
 */
import { Collider2DComponent, BoundaryComponent, TransformComponent, VelocityComponent, RenderComponent, HealthComponent, BlueprintDefinition, createEmitter } from "@tiny-aster/core";
import { CollisionLayers } from "../shared/types/CollisionLayers";

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
  private networkManager!: NetworkManager;
  public readonly gameId = "flappybird";
  private config!: typeof FLAPPY_CONFIG;
  public isMultiplayer = false;

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown> } = {}) {
    const seed = config.gameOptions?.seed as number || config.seed;
    super({
      isMultiplayer: config.isMultiplayer,
      gameOptions: { ...config.gameOptions, seed }
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
        world.addComponent(entity, { type: "Transform", x: args.x, y: args.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: args.x, worldY: args.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
        world.addComponent(entity, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 } as VelocityComponent);
        world.addComponent(entity, {
          type: "Render",
          shape: "bird",
          size: FLAPPY_CONFIG.BIRD_RADIUS,
          color: "#FFD700",
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 0,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent);
        world.addComponent(entity, {
          type: "Collider2D",
          shape: { type: "circle", radius: (FLAPPY_CONFIG.BIRD_RADIUS - 2) * 0.85 },
          layer: CollisionLayers.PLAYER,
          mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as Collider2DComponent);
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
          color: ["#FFD700"],
          loop: false
        });
      }
    });

    this.blueprints.register("pipe", {
      spawn: (world, entity, args: { x: number, gapY: number }) => {
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
          color: "#2ecc71",
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 0,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent);
        world.addComponent(entity, {
          type: "Collider2D",
          shape: { type: "aabb", halfWidth: pipeWidth / 2, halfHeight: topY / 2 },
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as Collider2DComponent);
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
          color: "#2ecc71",
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 0,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as RenderComponent);
        world.addComponent(bottomEntity, {
          type: "Collider2D",
          shape: { type: "aabb", halfWidth: pipeWidth / 2, halfHeight: bottomHeight / 2 },
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as Collider2DComponent);
        world.addComponent(bottomEntity, { type: "Pipe", gapY: args.gapY, gapSize: FLAPPY_CONFIG.GAP_SIZE, scored: true });
      }
    });

    this.blueprints.register("ground", {
      spawn: (world, entity, _args: {}) => {
        world.addComponent(entity, { type: "Transform", x: FLAPPY_CONFIG.SCREEN_WIDTH / 2, y: FLAPPY_CONFIG.GROUND_Y, rotation: 0, scaleX: 1, scaleY: 1, worldX: FLAPPY_CONFIG.SCREEN_WIDTH / 2, worldY: FLAPPY_CONFIG.GROUND_Y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
        world.addComponent(entity, {
          type: "Collider2D",
          shape: { type: "aabb", halfWidth: FLAPPY_CONFIG.SCREEN_WIDTH / 2, halfHeight: (FLAPPY_CONFIG.SCREEN_HEIGHT - FLAPPY_CONFIG.GROUND_Y) / 2 },
          layer: CollisionLayers.DEBRIS,
          mask: CollisionLayers.PLAYER,
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          enabled: true
        } as Collider2DComponent);
        world.addComponent(entity, { type: "Ground" });
        world.addComponent(entity, {
          type: "Render",
          shape: "ground",
          size: FLAPPY_CONFIG.SCREEN_WIDTH,
          color: "#deb887",
          rotation: 0,
          visible: false, // Changed from true to false to hide redundant legacy render (scrolling ground is now a ParallaxLayer)
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
          comboMultiplier: 1,
        });
        world.addComponent(entity, {
          type: "Combo",
          combo: 0,
          multiplier: 1,
          timerRemaining: 0,
          timerDuration: 3.0
        } as any);
      }
    });

    // Bind inputs for UnifiedInputSystem
    this.unifiedInput.bind("flap", [FLAPPY_CONFIG.KEYS.FLAP]);

    this.gameStateSystem = new FlappyBirdGameStateSystem(this, this.config);

    const inputSys = new FlappyBirdInputSystem(this.config);
    if (this.isMultiplayer) inputSys.setMultiplayerMode(true);

    this.world.addSystem(this.unifiedInput as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Input });
    this.world.addSystem(new InputBufferSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(inputSys, { phase: SystemPhase.Simulation });
    this.world.addSystem(new FlappyBirdGlideSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(new HierarchySystem(), { phase: SystemPhase.Transform });
    this.world.addSystem(new CollisionSystem2D() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Collision });
    this.world.addSystem(new FlappyBirdCollisionSystem(this), { phase: SystemPhase.GameRules });
    this.world.addSystem(this.gameStateSystem, { phase: SystemPhase.GameRules });
    this.world.addSystem(new ComboSystem() as any, { phase: SystemPhase.GameRules });

    this.world.addSystem(new MutatorSystem(mutators) as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Simulation });

    // Visual / Presentation
    this.world.addSystem(new JuiceSystem() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Presentation });
    this.world.addSystem(new FlappyBirdRenderSystem(), { phase: SystemPhase.Presentation });
    this.world.addSystem(new ParallaxSystem() as any, { phase: SystemPhase.Presentation });

    if (!this.networkManager) {
      this.networkManager = NetworkManager.registerGame(this.gameId, this, {
        strategy: 'snapshot',
        interpolationDelay: 100
      });
    }
    this.world.addSystem(new LocalPredictionSystem(this.networkManager, () => {}) as System<any>, { phase: SystemPhase.Input });
    this.world.addSystem(new RemoteInterpolationSystem(this.networkManager) as System<any>, { phase: SystemPhase.Presentation });
  }

  private createParallaxLayers(world: World<FlappyBirdComponentRegistry>): void {
    // 1. Sky Gradient Layer (Far back, static)
    const sky = world.createEntity();
    world.addComponent(sky, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    } as TransformComponent);
    world.addComponent(sky, {
      type: "ParallaxLayer",
      factorX: 0,
      factorY: 0,
      tileWidth: FLAPPY_CONFIG.SCREEN_WIDTH,
      tileHeight: FLAPPY_CONFIG.SCREEN_HEIGHT,
      initialX: 0,
      initialY: 0,
      autoScrollX: 0,
      autoScrollY: 0,
      layerType: "sky_gradient",
      paused: false
    } as any);
    world.addComponent(sky, {
      type: "Render",
      shape: "parallax_tile",
      visible: true,
      opacity: 1,
      order: -100,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    } as RenderComponent);

    // 2. Mountains Layer (Slowest)
    const mountains = world.createEntity();
    world.addComponent(mountains, {
      type: "Transform",
      x: 0,
      y: 320,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 320,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    } as TransformComponent);
    world.addComponent(mountains, {
      type: "ParallaxLayer",
      factorX: 0.1,
      factorY: 0.05,
      tileWidth: FLAPPY_CONFIG.SCREEN_WIDTH,
      tileHeight: 120,
      initialX: 0,
      initialY: 320,
      speedX: -10,
      speedY: 0,
      autoScrollX: 0,
      autoScrollY: 0,
      layerType: "mountains",
      paused: false
    } as any);
    world.addComponent(mountains, {
      type: "Render",
      shape: "parallax_tile",
      visible: true,
      opacity: 0.5,
      order: -95,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    } as RenderComponent);

    // 3. Skyline City Layer (Medium)
    const skyline = world.createEntity();
    world.addComponent(skyline, {
      type: "Transform",
      x: 0,
      y: 300,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 300,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    } as TransformComponent);
    world.addComponent(skyline, {
      type: "ParallaxLayer",
      factorX: 0.25,
      factorY: 0.1,
      tileWidth: FLAPPY_CONFIG.SCREEN_WIDTH,
      tileHeight: 150,
      initialX: 0,
      initialY: 300,
      speedX: -25,
      speedY: 0,
      autoScrollX: 0,
      autoScrollY: 0,
      layerType: "skyline",
      paused: false
    } as any);
    world.addComponent(skyline, {
      type: "Render",
      shape: "parallax_tile",
      visible: true,
      opacity: 0.7,
      order: -90,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    } as RenderComponent);

    // 4. Clouds Layer (Fast sky layer)
    const clouds = world.createEntity();
    world.addComponent(clouds, {
      type: "Transform",
      x: 0,
      y: 80,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 80,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    } as TransformComponent);
    world.addComponent(clouds, {
      type: "ParallaxLayer",
      factorX: 0.4,
      factorY: 0.15,
      tileWidth: 300,
      tileHeight: 100,
      initialX: 0,
      initialY: 80,
      speedX: -45,
      speedY: 0,
      autoScrollX: 0,
      autoScrollY: 0,
      layerType: "clouds",
      paused: false
    } as any);
    world.addComponent(clouds, {
      type: "Render",
      shape: "parallax_tile",
      visible: true,
      opacity: 0.85,
      order: -80,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    } as RenderComponent);

    // 5. Ground Scrolling Visual Layer (Full speed)
    const groundVisual = world.createEntity();
    world.addComponent(groundVisual, {
      type: "Transform",
      x: 0,
      y: FLAPPY_CONFIG.GROUND_Y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: FLAPPY_CONFIG.GROUND_Y,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    } as TransformComponent);
    world.addComponent(groundVisual, {
      type: "ParallaxLayer",
      factorX: 1.0,
      factorY: 1.0,
      tileWidth: 100,
      tileHeight: FLAPPY_CONFIG.SCREEN_HEIGHT - FLAPPY_CONFIG.GROUND_Y,
      initialX: 0,
      initialY: FLAPPY_CONFIG.GROUND_Y,
      speedX: -FLAPPY_CONFIG.PIPE_SPEED,
      speedY: 0,
      autoScrollX: 0,
      autoScrollY: 0,
      layerType: "ground",
      paused: false
    } as any);
    world.addComponent(groundVisual, {
      type: "Render",
      shape: "parallax_tile",
      visible: true,
      opacity: 1,
      order: 10, // Render in front of bird and pipes
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    } as RenderComponent);
  }

  protected override async onInitializeEntities(): Promise<void> {
    if (this.isMultiplayer) return;
    createGameState(this.world);
    createBird({ world: this.world, x: FLAPPY_CONFIG.BIRD_X, y: FLAPPY_CONFIG.BIRD_START_Y });
    createGround(this.world);
    this.createParallaxLayers(this.world);

    // Apply active beneficial mutators
    const activeBeneficials = (this._config.gameOptions?.activeBeneficialMutators as string[]) || [];
    for (const mutatorId of activeBeneficials) {
      const mutator = BENEFICIAL_MUTATORS[mutatorId];
      if (mutator) {
        mutator.apply(this.world);
      }
    }
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
    try {
      await Promise.all([
        audio.loadSFX("flap", "/audio/flap.mp3"),
        audio.loadSFX("hit", "/audio/hit.mp3"),
        audio.loadSFX("score", "/audio/score.mp3"),
        audio.loadSFX("game_over", "/audio/game_over.mp3"),
      ]);
    } catch (e) {
      console.warn("[FlappyBird] Asset preloading failed.", e);
    }
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public setInput(input: Partial<FlappyBirdInput>) {
    this.setInputState(input);
  }

  public setInputState(input: Partial<FlappyBirdInput>): void {
    const world = this.getWorld();
    const bird = world.query("Bird", "FlappyInput" as any)[0];
    if (bird !== undefined) {
      world.mutateComponent(bird, "FlappyInput" as any, (inp: any) => {
        if (input.flap !== undefined) inp.flap = input.flap;
        if (input.glide !== undefined) inp.glide = input.glide;
      });
    }
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

  public initializeRenderer(renderer: Renderer<any>): void {
    if ((renderer as any).type === "canvas") {
      const { drawFlappyBird, drawFlappyPipe, drawFlappyGround } = require("./rendering/FlappyBirdCanvasVisuals");
      (renderer as any).registerShape("bird", drawFlappyBird);
      (renderer as any).registerShape("pipe", drawFlappyPipe);
      (renderer as any).registerShape("ground", drawFlappyGround);
    }
  }

  public getGameState(): FlappyBirdState {
    const state = this.getWorld().getSingleton("FlappyState");
    return state ? { ...state } : INITIAL_FLAPPY_STATE;
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  public getWorld(): World<FlappyBirdComponentRegistry> {
    return this.world;
  }
}

export class NullFlappyBirdGame implements IFlappyBirdGame {
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
  public setInput(input: Partial<FlappyBirdInput>) {}
  public setInputState(input: Partial<FlappyBirdInput>) {}
  public subscribe(cb: (state: FlappyBirdState) => void) { return () => {}; }
  public initializeRenderer() {}
  public getInputSystem(): InputSystem { return new UnifiedInputSystem(); }
}
