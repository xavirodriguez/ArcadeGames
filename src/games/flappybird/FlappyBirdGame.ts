import { BaseGame, WorldSnapshot, GameLoop, World, System, SystemPhase, InputSystem, MovementSystem, CollisionSystem2D, JuiceSystem, Renderer, RenderContext, EventRegistry, EventBus, UnifiedInputSystem, MutatorSystem, NetworkManager, LocalPredictionSystem, RemoteInterpolationSystem, HierarchySystem, TTLSystem, WebAudioPlayer, ConfigService, NullBaseGame, loadAudioAssets, InterpolationSnapshotEntry, EntitySyncDescriptor, applyServerState, preloadSharedAudioManifest, SHARED_AUDIO_MANIFEST, IAudioPlayer, Mutator, ComboComponent, MultiplayerRegistry } from "@tiny-aster/core";
import { FlappyBirdInput, FLAPPY_CONFIG, INITIAL_FLAPPY_STATE, FlappyBirdState, BirdComponent, PipeComponent, FlappyBirdComponentRegistry, FlappyBirdEventRegistry } from "./types/FlappyBirdTypes";
import { FlappyBirdConfigSchema, FlappyBirdConfig as FlappyBirdConfigType, DEFAULT_FLAPPY_BIRD_CONFIG } from "./types/FlappyBirdConfigSchema";
import { ComboSystem } from "@tiny-aster/core";
import { MissionSystem } from "../shared/missions/MissionSystem";
import { FLAPPY_BIRD_MINI_MISSIONS } from "./FlappyBirdMissions";
import { MutatorRegistry } from "../../utils/MutatorRegistry";
import { FlappyBirdGameStateSystem } from "./systems/FlappyBirdGameStateSystem";
import { FlappyBirdInputSystem } from "./systems/FlappyBirdInputSystem";
import { FlappyBirdCollisionSystem } from "./systems/FlappyBirdCollisionSystem";
import { FlappyBirdGlideSystem } from "./systems/FlappyBirdGlideSystem";
import { FlappyBirdPipeMovementSystem } from "./systems/FlappyBirdPipeMovementSystem";
import { FlappyBirdRenderSystem } from "./systems/FlappyBirdRenderSystem";
import { IFlappyBirdGame } from "./types/GameInterfaces";
import { InputBufferSystem } from "./systems/FlappyBirdInputSystem";
import {
  createBird,
  createGameState,
  createGround
} from "./EntityFactory";
import { registerMutatorHook } from "../../utils/MutatorRegistry";
import { applyMutators } from "../shared/configHelper";
import { AchievementSystem } from "@tiny-aster/gameplay-kit";

/**
 * Controlador principal del juego Flappy Bird.
 *
 * @remarks
 * Implementa mecánicas de scroll infinito y generación procedural de obstáculos (tuberías).
 * Utiliza un sistema de gravedad simple y una única acción de entrada ("jump").
 */
import { ColliderComponent, CollisionEventsComponent, ShapeType, CircleShape, BoxShape, BoundaryComponent, TransformComponent, VelocityComponent, RenderComponent, HealthComponent, BlueprintDefinition, createEmitter, Theme, resolveThemeColor, EntityBuilder } from "@tiny-aster/core";
import { CollisionLayers } from "@tiny-aster/gameplay-kit";
import { spawnVisualParticle as spawnCanvasParticle } from "./rendering/FlappyBirdCanvasVisuals";
import { spawnVisualParticle as spawnSkiaParticle } from "./rendering/FlappyBirdSkiaVisuals";
import { createThemeFromGameAccents } from "../../theme/gameAccents";

export interface FlappyBirdBlueprintMap extends Record<string, BlueprintDefinition<FlappyBirdComponentRegistry, EventRegistry, unknown>> {
  bird: BlueprintDefinition<FlappyBirdComponentRegistry, EventRegistry, { x: number, y: number }>;
  pipe: BlueprintDefinition<FlappyBirdComponentRegistry, EventRegistry, {
    x: number;
    gapY: number;
    visualVariant?: "standard" | "damaged" | "rusted";
    movementType?: "static" | "oscillating" | "laser_gate";
    oscillationSpeed?: number;
    oscillationAmplitude?: number;
    isNarrowGap?: boolean;
  }>;
  ground: BlueprintDefinition<FlappyBirdComponentRegistry, EventRegistry, {}>;
  state: BlueprintDefinition<FlappyBirdComponentRegistry, EventRegistry, {}>;
}

export class FlappyBirdGame
  extends BaseGame<FlappyBirdState, FlappyBirdInput, FlappyBirdComponentRegistry, FlappyBirdEventRegistry, FlappyBirdBlueprintMap>
  implements IFlappyBirdGame {

  private gameStateSystem!: FlappyBirdGameStateSystem;
  private missionSystem!: MissionSystem;
  private networkManager!: NetworkManager<FlappyBirdComponentRegistry>;
  public readonly gameId = "flappybird";
  private baseConfig: FlappyBirdConfigType;
  private config: FlappyBirdConfigType;
  public isMultiplayer = false;
  private activeRendererType: "canvas" | "skia" = "canvas";

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown>, audio?: IAudioPlayer, theme?: Theme } = {}) {
    const seed = config.gameOptions?.seed as number || config.seed;
    super({
      pauseKey: DEFAULT_FLAPPY_BIRD_CONFIG.KEYS.PAUSE,
      restartKey: DEFAULT_FLAPPY_BIRD_CONFIG.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      theme: config.theme ?? createThemeFromGameAccents("flappy-bird"),
      gameOptions: { ...config.gameOptions, seed },
      audio: config.audio || new WebAudioPlayer()
    });
    this.baseConfig = ConfigService.load<FlappyBirdConfigType>(
      this.gameId,
      FlappyBirdConfigSchema,
      config.gameOptions?.rawConfig ?? {}
    );
    this.config = this.baseConfig;
    this.isMultiplayer = !!config.isMultiplayer;
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = applyMutators(this.baseConfig, this._config.gameOptions);
    this.world.setResource("GameConfig", this.config);
    this.setupCommonArcadeResources();
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    // Register blueprints
    this.blueprints.register("bird", {
      spawn: (world, entity, args: { x: number, y: number }) => {
        const config = world.getResource<FlappyBirdConfigType>("GameConfig") || DEFAULT_FLAPPY_BIRD_CONFIG;
        const tint = resolveThemeColor(world, "bird", "player");

        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withRender({
            shape: "bird",
            size: config.BIRD_RADIUS,
            color: tint
          })
          .withCollider({
            shape: { type: ShapeType.Circle, radius: (config.BIRD_RADIUS - 2) * 0.85 } as CircleShape,
            layer: CollisionLayers.PLAYER,
            mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS,
            offsetX: 0,
            offsetY: 0
          })
          .withCollisionEvents();

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
        } as ComboComponent);
        world.addComponent(entity, {
          type: "GlideEnergy",
          currentEnergy: 100,
          maxEnergy: 100,
          rechargeRate: 25,
          drainRate: 40,
          isOverheated: false,
          overheatCooldownTicks: 0,
        });

        createEmitter(world, {
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
      spawn: (world, entity, args: {
        x: number;
        gapY: number;
        visualVariant?: "standard" | "damaged" | "rusted";
        movementType?: "static" | "oscillating" | "laser_gate";
        oscillationSpeed?: number;
        oscillationAmplitude?: number;
        isNarrowGap?: boolean;
      }) => {
        const config = world.getResource<FlappyBirdConfigType>("GameConfig") || DEFAULT_FLAPPY_BIRD_CONFIG;
        const pipeColor = resolveThemeColor(world, "pipe", "enemy");

        const gapMultiplier = args.isNarrowGap ? 0.7 : 1.0;
        const gapSize = config.GAP_SIZE * gapMultiplier;
        const halfGap = gapSize / 2;
        const pipeWidth = config.PIPE_WIDTH;
        const pipeSpeed = config.PIPE_SPEED;

        let variant = args.visualVariant;
        if (!variant) {
          const rand = world.gameplayRandom.next();
          variant = rand < 0.5 ? "standard" : rand < 0.8 ? "damaged" : "rusted";
        }

        const movementType = args.movementType ?? "static";
        const oscillationSpeed = args.oscillationSpeed ?? 2.0;
        const oscillationAmplitude = args.oscillationAmplitude ?? 35;
        const oscillationPhase = (world.tick * 0.1) % (Math.PI * 2);
        const pairId = entity;

        // Top Pipe
        const topY = args.gapY - halfGap;
        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: topY / 2 })
          .withVelocity({ vx: -pipeSpeed, vy: 0 })
          .withRender({ shape: "pipe", size: pipeWidth, color: pipeColor, order: 0 })
          .withCollider({
            shape: { type: ShapeType.Box, width: pipeWidth, height: topY } as BoxShape,
            layer: CollisionLayers.ENEMY,
            mask: CollisionLayers.PLAYER
          })
          .withCollisionEvents();

        world.addComponent(entity, {
          type: "Pipe",
          gapY: args.gapY,
          baseGapY: args.gapY,
          gapSize,
          scored: false,
          visualVariant: variant,
          movementType,
          oscillationSpeed,
          oscillationAmplitude,
          oscillationPhase,
          laserActive: movementType === "laser_gate" ? true : undefined,
          laserPulseFrequency: movementType === "laser_gate" ? 3.0 : undefined,
          isNarrowGap: !!args.isNarrowGap,
          narrowGapMultiplier: gapMultiplier,
          pairId,
          isTopPipe: true
        });

        // Bottom Pipe
        const bottomY = args.gapY + halfGap;
        const bottomHeight = config.worldHeight - bottomY;
        const bottomEntity = EntityBuilder.create(world)
          .withTransform({ x: args.x, y: bottomY + bottomHeight / 2 })
          .withVelocity({ vx: -pipeSpeed, vy: 0 })
          .withRender({ shape: "pipe", size: pipeWidth, color: pipeColor, order: 0 })
          .withCollider({
            shape: { type: ShapeType.Box, width: pipeWidth, height: bottomHeight } as BoxShape,
            layer: CollisionLayers.ENEMY,
            mask: CollisionLayers.PLAYER
          })
          .withCollisionEvents()
          .build();

        world.addComponent(bottomEntity, {
          type: "Pipe",
          gapY: args.gapY,
          baseGapY: args.gapY,
          gapSize,
          scored: true,
          visualVariant: variant,
          movementType,
          oscillationSpeed,
          oscillationAmplitude,
          oscillationPhase,
          laserActive: movementType === "laser_gate" ? true : undefined,
          laserPulseFrequency: movementType === "laser_gate" ? 3.0 : undefined,
          isNarrowGap: !!args.isNarrowGap,
          narrowGapMultiplier: gapMultiplier,
          pairId,
          isTopPipe: false
        });
      }
    });

    this.blueprints.register("ground", {
      spawn: (world, entity, _args: {}) => {
        const config = world.getResource<FlappyBirdConfigType>("GameConfig") || DEFAULT_FLAPPY_BIRD_CONFIG;
        const groundColor = resolveThemeColor(world, "ground");

        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x: config.worldWidth / 2, y: config.GROUND_Y })
          .withCollider({
            shape: { type: ShapeType.Box, width: config.worldWidth, height: config.worldHeight - config.GROUND_Y } as BoxShape,
            layer: CollisionLayers.DEBRIS,
            mask: CollisionLayers.PLAYER
          })
          .withCollisionEvents()
          .withRender({ shape: "ground", size: config.worldWidth, color: groundColor, order: 0 });

        world.addComponent(entity, { type: "Ground" });
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
          pipesSpawnedCount: 0,
          currentSectorEvent: "none",
          sectorEventTicks: 0,
          sectorEventDuration: 0,
          pipeSpeedMultiplier: 1.0,
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
    this.world.addSystem(new FlappyBirdPipeMovementSystem(), { phase: SystemPhase.Simulation, priority: 5 });
    this.world.addSystem(new HierarchySystem() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Transform });
    this.world.addSystem(new TTLSystem() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Simulation });
    this.world.addSystem(new CollisionSystem2D() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Collision });
    this.world.addSystem(new FlappyBirdCollisionSystem(this, this.config), { phase: SystemPhase.GameRules });
    this.world.addSystem(this.gameStateSystem, { phase: SystemPhase.GameRules });

    this.missionSystem = new MissionSystem();
    this.world.addSystem(this.missionSystem as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.GameRules });

    this.eventBus.on("mission:completed", (event: unknown) => {
      if (this.world.isReSimulating) return;
      const payload = event as { reward?: { scoreBonus?: number; mutatorId?: string } } | undefined;
      if (payload?.reward?.scoreBonus) {
        const gs = this.world.getSingleton("FlappyState");
        if (gs) {
          this.world.mutateSingleton("FlappyState", (state) => {
            state.score += payload.reward!.scoreBonus!;
          });
        }
      }
      if (payload?.reward?.mutatorId) {
        const mutator = MutatorRegistry.get(payload.reward.mutatorId);
        if (mutator) {
          mutator.apply(this.world);
        }
      }

      // Rotate to next mission deterministically
      const activeMission = this.missionSystem.getActiveMission();
      let nextIndex = 0;
      if (activeMission) {
        const currentIndex = FLAPPY_BIRD_MINI_MISSIONS.findIndex(m => m.id === activeMission.id);
        nextIndex = (currentIndex + 1) % FLAPPY_BIRD_MINI_MISSIONS.length;
      }
      const nextMission = FLAPPY_BIRD_MINI_MISSIONS[nextIndex];
      if (nextMission) {
        this.missionSystem.setActiveMission(this.world, nextMission);
      }
    });

    this.world.addSystem(new AchievementSystem() as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Simulation });

    const activeMutators = (this._config.gameOptions?.mutators || this._config.gameOptions?.activeMutators || []) as Mutator<FlappyBirdComponentRegistry>[];
    this.world.addSystem(new MutatorSystem(activeMutators) as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Simulation });

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
    this.world.addSystem(new LocalPredictionSystem(this.networkManager as unknown as NetworkManager<MultiplayerRegistry>, () => {}) as unknown as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Input });
    this.world.addSystem(new RemoteInterpolationSystem(this.networkManager as unknown as NetworkManager<MultiplayerRegistry>) as unknown as System<FlappyBirdComponentRegistry>, { phase: SystemPhase.Presentation });
  }

  protected override async onInitializeEntities(): Promise<void> {
    if (this.isMultiplayer) return;
    const config = this.world.getResource<FlappyBirdConfigType>("GameConfig") || DEFAULT_FLAPPY_BIRD_CONFIG;
    createGameState(this.world);
    createBird({ world: this.world, x: config.BIRD_X, y: config.BIRD_START_Y });
    createGround(this.world);

    if (this.missionSystem) {
      const selectedMission = FLAPPY_BIRD_MINI_MISSIONS[0];
      this.missionSystem.setActiveMission(this.world, selectedMission);
    }
  }

  public getMissionSystem(): MissionSystem {
    return this.missionSystem;
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

  protected override async onPreloadAssets(): Promise<void> {
    if (this.audio) {
      await preloadSharedAudioManifest(this.audio);
    }
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public override setInputState(input: Record<string, unknown> | object): void {
    const world = this.getWorld();
    const birdEntity = world.query("Bird")[0];
    if (birdEntity !== undefined) {
      if (!world.hasComponent(birdEntity, "FlappyInput")) {
        world.addComponent(birdEntity, {
          type: "FlappyInput",
          flap: false,
          glide: false,
          flapCooldownRemaining: 0,
        });
      }
      world.mutateComponent(birdEntity, "FlappyInput", (inputComp) => {
        const inputObj = input as Record<string, unknown>;
        if (inputObj && typeof inputObj === "object" && inputObj.axes) {
          const axes = inputObj.axes as Record<string, number>;
          const moveY = axes.moveY ?? 0;
          const actions = inputObj.actions as Set<string> | string[] | undefined;
          const hasAction = (name: string) => actions instanceof Set ? actions.has(name) : !!(actions as string[])?.includes?.(name);

          inputComp.flap = hasAction("confirm") || hasAction("fire") || moveY < 0;
          inputComp.glide = hasAction("boost") || moveY > 0;
        } else {
          if (typeof inputObj.flap === "boolean") {
            inputComp.flap = inputObj.flap;
          }
          if (typeof inputObj.glide === "boolean") {
            inputComp.glide = inputObj.glide;
          }
        }
      });
    }
  }

  public setInput(input: Partial<FlappyBirdInput>) {
    this.setInputState(input);
  }

  private readonly ENTITY_SYNC_DESCRIPTORS: EntitySyncDescriptor<Record<string, unknown>, unknown, FlappyBirdComponentRegistry>[] = [
    {
      serverIdPrefix: "player",
      getStateMap: (root) => root.players as Record<string, unknown>,
      spawn: (world, entity, rawState) => {
        const state = rawState as { x: number; y: number; alive: boolean; velocityY: number };
        const commands = world.getCommandBuffer();
        commands.addComponent(entity, { type: "Transform", x: state.x, y: state.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: state.x, worldY: state.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
        commands.addComponent(entity, { type: "Render", shape: "bird", size: 15, color: "yellow", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as RenderComponent);
        commands.addComponent(entity, {
          type: "Bird",
          velocityY: state.velocityY,
          isAlive: state.alive,
          isGliding: false,
          nearMissTimer: 0
        } as BirdComponent);
      },
      sync: (world, entity, rawState) => {
        const state = rawState as { x: number; y: number; alive: boolean; velocityY: number };
        world.mutateComponent(entity, "Bird", bird => {
          bird.isAlive = state.alive;
          bird.velocityY = state.velocityY;
        });

        world.mutateComponent(entity, "Render", render => {
          render.color = state.alive ? "yellow" : "gray";
        });
      }
    },
    {
      serverIdPrefix: "pipe",
      getStateMap: (root) => root.pipes as Record<string, unknown>,
      spawn: (world, entity, rawState) => {
        const state = rawState as { x: number; gapY: number; id: string };
        const commands = world.getCommandBuffer();
        commands.addComponent(entity, { type: "Transform", x: state.x, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: state.x, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
        commands.addComponent(entity, { type: "Render", shape: "pipe", size: 60, color: "green", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as RenderComponent);
        commands.addComponent(entity, { type: "Pipe", gapY: state.gapY, gapSize: 140, scored: false } as PipeComponent);
      },
      sync: () => {}
    }
  ];

  public updateFromServer(state: Record<string, unknown>, localSessionId?: string) {
    if (!this.isMultiplayer || !state) return;

    const replicator = this.networkManager.getReplicator();
    const entries: InterpolationSnapshotEntry[] = [];
    if (state.players) {
      Object.entries(state.players as Record<string, { x: number; y: number }>).forEach(([sessionId, p]) => {
        const entityId = replicator.getLocalId(`player_${sessionId}`);
        if (entityId !== undefined) entries.push({ entityId, x: p.x, y: p.y });
      });
    }
    if (state.pipes) {
      Object.entries(state.pipes as Record<string, { x: number }>).forEach(([id, p]) => {
        const entityId = replicator.getLocalId(`pipe_${id}`);
        if (entityId !== undefined) entries.push({ entityId, x: p.x, y: 0 });
      });
    }

    applyServerState(
      this.getWorld(),
      this.networkManager,
      this.ENTITY_SYNC_DESCRIPTORS,
      state,
      entries,
      localSessionId
    );
  }

  public initializeRenderer(renderer: Renderer<FlappyBirdComponentRegistry, RenderContext>): void {
    if (renderer.type === "canvas") {
      this.activeRendererType = "canvas";
      const { drawFlappyBird, drawFlappyPipe, drawFlappyGround, scrollingBackgroundEffect } = require("./rendering/FlappyBirdCanvasVisuals");
      const { drawFlappyBirdMissionHUD } = require("./rendering/FlappyBirdMissionHUD");
      renderer.registerShape("bird", drawFlappyBird);
      renderer.registerShape("pipe", drawFlappyPipe);
      renderer.registerShape("ground", drawFlappyGround);
      renderer.registerBackgroundEffect("scrollingSky", scrollingBackgroundEffect);
      renderer.registerBackgroundEffect("mission_hud", drawFlappyBirdMissionHUD);
    } else if (renderer.type === "skia") {
      this.activeRendererType = "skia";
      const { drawSkiaFlappyBird, drawSkiaFlappyPipe, drawSkiaFlappyGround, scrollingSkiaBackgroundEffect } = require("./rendering/FlappyBirdSkiaVisuals");
      const { drawSkiaFlappyBirdMissionHUD } = require("./rendering/FlappyBirdSkiaMissionHUD");
      renderer.registerShape("bird", drawSkiaFlappyBird);
      renderer.registerShape("pipe", drawSkiaFlappyPipe);
      renderer.registerShape("ground", drawSkiaFlappyGround);
      renderer.registerBackgroundEffect("scrollingSky", scrollingSkiaBackgroundEffect);
      renderer.registerBackgroundEffect("mission_hud", drawSkiaFlappyBirdMissionHUD);
    }
  }

  public getGameState(): FlappyBirdState & { combo?: number; multiplier?: number; comboMultiplier?: number; comboTimerRemaining?: number } {
    const world = this.getWorld();
    const state = world.getSingleton("FlappyState");
    let combo = 0;
    let multiplier = 1;
    let comboTimerRemaining = 0;

    const comboEntities = world.query("Combo");
    if (comboEntities.length > 0) {
      const comboComp = world.getComponent(comboEntities[0], "Combo");
      if (comboComp) {
        combo = comboComp.combo ?? 0;
        multiplier = comboComp.multiplier ?? 1;
        comboTimerRemaining = Math.max(0, comboComp.timerRemaining ?? 0);
      }
    }

    const baseState = state ? { ...state } : { ...INITIAL_FLAPPY_STATE };
    return {
      ...baseState,
      combo,
      multiplier,
      comboMultiplier: multiplier,
      comboTimerRemaining
    };
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }
}

export class NullFlappyBirdGame extends NullBaseGame<FlappyBirdState, FlappyBirdInput, FlappyBirdComponentRegistry> implements IFlappyBirdGame {
  public isMultiplayer = false;
  public gameId = "flappybird";

  public override getGameState(): FlappyBirdState {
    return INITIAL_FLAPPY_STATE;
  }

  public setInput(input: Partial<FlappyBirdInput>): void {
    this.setInputState(input);
  }
}

// ==========================================================================
// GAME-SPECIFIC MUTATOR HOOKS (DECOUPLED FROM CORE REGISTRY)
// ==========================================================================

registerMutatorHook("combo_head_start", (world: World<FlappyBirdComponentRegistry>) => {
  const comboEntities = world.query("Combo");
  if (comboEntities.length > 0) {
    world.mutateComponent(comboEntities[0], "Combo", (c) => {
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
    sounds: SHARED_AUDIO_MANIFEST
  }
};
