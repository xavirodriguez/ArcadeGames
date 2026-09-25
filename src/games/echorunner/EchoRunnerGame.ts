/* eslint-disable @typescript-eslint/no-require-imports */
import {
  BaseGame,
  World,
  System,
  PhysicsUtils,
  ConfigService,
  SystemPhase,
  BlueprintDefinition,
  CoreComponentRegistry,
  EventRegistry,
  RenderContext,
  WebAudioPlayer,
  IAudioPlayer,
  EventBus,
  Renderer,
  TransformComponent,
  VelocityComponent,
  Collider2DComponent,
  TagComponent,
  HealthComponent,
  RenderComponent,
  RunState,
  registerEnemyStateMachines,
  SegmentTemplate,
  SegmentGenerator,
  LevelPlan,
  EntityBuilder,
  preloadSharedAudioManifest,
  SHARED_AUDIO_MANIFEST
} from "@tiny-aster/core";
import { drawEchoBackground, drawEchoPlayer, drawMemoryFragment, drawMemoryCore, drawCheckpointNode, drawPulseAttack, drawSentinel, drawHopper, drawWatcher, drawCharger } from "./rendering/EchoRunnerCanvasVisuals";
import { EchoRunnerInput, EchoRunnerGameState, EchoRunnerEventRegistry, ECHO_CONFIG } from "./types/EchoRunnerTypes";
import { EchoRunnerConfigSchema, EchoRunnerConfig as EchoRunnerConfigType, DEFAULT_ECHO_RUNNER_CONFIG } from "./types/EchoRunnerConfigSchema";
import { PlatformerArcadeGame } from "../shared/PlatformerArcadeGame";
import { PlatformerInputSystem } from "../platformer/systems/PlatformerInputSystem";
import { resolveAndApplyMutators } from "../../config/MutatorConfig";
import { ArcadeEntityBuilder, registerPlatformerEnemyBlueprints, registerPlatformerEnvironmentBlueprints, mutatePlatformerInputState, registerCommonPlatformerSystems, updatePlayerInvulnerabilityAndContactDamage } from "@tiny-aster/gameplay-kit";
import { setupPlatformerMovementComponents, registerPlatformerTilemapBlueprint, createMainCamera2D, registerPresentationSystems, syncLevelWorldDimensions } from "../shared/componentBuilders";
import defaultLevelData from "./levels/level-01.json";

export interface EchoRunnerConfig {
  seed?: number;
  gameOptions?: Record<string, unknown>;
  levelData?: { templates: SegmentTemplate[]; grammar: string[] };
}

export interface EchoRunnerBlueprintMap extends Record<string, BlueprintDefinition<CoreComponentRegistry, EventRegistry, unknown>> {
  pulse_hitbox: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { dir: number; x: number; y: number; parent: number }>;
  player: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { x: number; y: number }>;
  tilemap: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { data: number[][]; tileDefinitions: Record<number, unknown> }>;
  collectible_fragment: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { x: number; y: number; id: string }>;
  collectible_core: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { x: number; y: number; id: string }>;
}

/**
 * System that manages triggering the Pulse attack and processing its cooldowns.
 */
class EchoRunnerAttackSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const players = world.query("PlatformerInput", "Transform");
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const input = world.getComponent(player, "PlatformerInput") as { pulseCooldown?: number; pulsePressed?: boolean } | undefined;
      const trans = world.getComponent(player, "Transform")!;

      if (!input) continue;

      // Manage attack cooldowns
      let cd = input.pulseCooldown ?? 0;
      if (cd > 0) {
        cd = PhysicsUtils.tickTimer(cd, deltaTime);
        world.mutateComponent(player, "PlatformerInput", (inp: unknown) => {
          (inp as { pulseCooldown?: number }).pulseCooldown = cd;
        });
      }

      // Read trigger and fire!
      if (input.pulsePressed && cd <= 0) {
        world.mutateComponent(player, "PlatformerInput", (inp: unknown) => {
          (inp as { pulseCooldown?: number }).pulseCooldown = 0.45; // Cooldown of 0.45s
        });

        // Determine direction of attack
        const vel = world.getComponent(player, "Velocity")!;
        let dir = 1;
        if (vel.vx !== 0) {
          dir = vel.vx > 0 ? 1 : -1;
        } else if (trans.scaleX < 0) {
          dir = -1;
        }

        // Play sound
        const audio = world.getResource<IAudioPlayer>("AudioPlayer") || world.getResource<IAudioPlayer>("Audio");
        if (audio) {
          audio.playSFX("pulse");
        }

        // Spawn pulse attack hitbox child entity via deferred commands
        world.commands.spawnFromBlueprint("pulse_hitbox", {
          dir,
          x: trans.x,
          y: trans.y,
          parent: player
        });

        // Clear pulse triggers
        world.mutateComponent(player, "PlatformerInput", (inp: unknown) => {
          (inp as { pulsePressed?: boolean }).pulsePressed = false;
        });
      }
    }
  }
}

/**
 * System that handles damage when player overlaps an enemy or spikes.
 */
class EchoRunnerDamageSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    updatePlayerInvulnerabilityAndContactDamage(world, deltaTime, {
      contactDistance: 20,
      invulnerabilityDuration: 1.0,
      damageAmount: 1,
      hitFlashFrames: 8,
      screenShakeIntensity: 12,
      screenShakeDuration: 0.25,
      sfxName: "hit"
    });
  }
}

export class EchoRunnerGame extends PlatformerArcadeGame<EchoRunnerGameState, EchoRunnerInput, CoreComponentRegistry, EchoRunnerEventRegistry, EchoRunnerBlueprintMap> {
  public readonly gameId = "echorunner";
  private gameOver = false;
  private levelPlan!: LevelPlan;
  private dbgFrames = 0;
  private customLevelData?: { templates: SegmentTemplate[]; grammar: string[] };
  private baseConfig: EchoRunnerConfigType;
  private config: EchoRunnerConfigType;

  public getLevelPlan(): LevelPlan {
    return this.levelPlan;
  }

  constructor(config: EchoRunnerConfig = {}) {
    super({
      pauseKey: "KeyP",
      restartKey: "KeyR",
      gameOptions: config.gameOptions,
      seed: config.seed,
      audio: new WebAudioPlayer()
    });
    this.baseConfig = ConfigService.load<EchoRunnerConfigType>(
      this.gameId,
      EchoRunnerConfigSchema,
      config.gameOptions?.rawConfig ?? {}
    );
    this.config = this.baseConfig;
    this.customLevelData = config.levelData ?? (config.gameOptions?.levelData as { templates: SegmentTemplate[]; grammar: string[] } | undefined);
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = resolveAndApplyMutators(this.baseConfig, this._config.gameOptions);

    this.world.setResource("GameConfig", this.config);
    await super.onRegisterSystems();

    // Register blueprints
    this.blueprints.register("pulse_hitbox", {
      spawn: (world, entity, args: { dir: number; x: number; y: number; parent: number }) => {
        ArcadeEntityBuilder.fromEntity(world, entity)
          .withTransform({
            x: args.dir * 25,
            y: 0,
            worldX: args.x + args.dir * 25,
            worldY: args.y,
            parentEntity: args.parent
          })
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 15, halfHeight: 15 },
            layer: 1 << 3,
            mask: 1 << 4,
            isTrigger: true
          })
          .withCollisionEvents()
          .withTTL(0.15)
          .withRender({
            shape: "pulse_attack",
            size: 30,
            order: 5,
            rotation: args.dir < 0 ? Math.PI : 0
          });

        world.addComponent(entity, { type: "Hitbox", hitEntities: [] } as { type: string; [key: string]: unknown });
      }
    });

    this.blueprints.register("player", {
      spawn: (world, entity, args: { x: number; y: number }) => {
        ArcadeEntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withVelocity()
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
            layer: 1,
            mask: 0xffff,
            enabled: true,
            isTrigger: false
          })
          .withRender({ shape: "player", size: 24, order: 2 })
          .withCollisionEvents();

        world.addComponent(entity, { type: "Health", current: 3, max: 3 } as HealthComponent);
        world.addComponent(entity, { type: "Tag", tags: ["TileCollider", "Player"] } as TagComponent);
        world.addComponent(entity, { type: "Hurtbox" } as { type: string; [key: string]: unknown });
        const config = world.getResource<EchoRunnerConfigType>("GameConfig") || DEFAULT_ECHO_RUNNER_CONFIG;

        setupPlatformerMovementComponents(world, entity, config);
        world.addComponent(entity, {
          type: "PlatformerInput",
          moveDir: 0,
          jumpPressed: false,
          jumpHeld: false,
          jumpReleased: false,
          pulsePressed: false,
          pulseCooldown: 0
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
          type: "PlatformerJumper",
          coyoteTimer: 0,
          jumpBufferTimer: 0,
          coyoteTimeMax: config.COYOTE_TIME_MAX,
          jumpBufferMax: config.JUMP_BUFFER_MAX
        } as { type: string; [key: string]: unknown });
      }
    });

    registerPlatformerTilemapBlueprint(this.blueprints, DEFAULT_ECHO_RUNNER_CONFIG);

    this.blueprints.register("collectible_fragment", {
      spawn: (world, entity, args: { x: number; y: number; id: string }) => {
        ArcadeEntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 10, halfHeight: 10 },
            isTrigger: true
          })
          .withCollisionEvents()
          .withRender({ shape: "fragment", size: 16, order: 1 });

        world.addComponent(entity, {
          type: "Collectible",
          kind: "fragment",
          value: 10,
          persistent: false,
          collectOnce: false,
          id: args.id
        } as { type: string; [key: string]: unknown });
      }
    });

    this.blueprints.register("collectible_core", {
      spawn: (world, entity, args: { x: number; y: number; id: string }) => {
        ArcadeEntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 12, halfHeight: 12 },
            isTrigger: true
          })
          .withCollisionEvents()
          .withRender({ shape: "core", size: 24, order: 1 });

        world.addComponent(entity, {
          type: "Collectible",
          kind: "core",
          value: 100,
          persistent: true,
          collectOnce: true,
          id: args.id
        } as { type: string; [key: string]: unknown });
      }
    });

    registerPlatformerEnvironmentBlueprints(this.blueprints);
    registerPlatformerEnemyBlueprints(this.blueprints);

    // Register State Machine Behaviors
    registerEnemyStateMachines(this.world);

    // Input systems
    this.world.addSystem(new PlatformerInputSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new EchoRunnerAttackSystem(), { phase: SystemPhase.Input });

    // Common platformer / runner systems
    registerCommonPlatformerSystems(this.world, { includeMovingPlatforms: true });

    // Game-specific simulation systems
    this.world.addSystem(new EchoRunnerDamageSystem(), { phase: SystemPhase.Simulation });

    // Game-specific presentation systems
    registerPresentationSystems(this.world);

    // Listen to Hit Detection events
    const eventBus = this.world.getEventBus();
    if (eventBus) {
      eventBus.on("hitbox:hit", (event: unknown) => {
        const payload = event as { victim?: number; attacker?: number } | undefined;
        const victim = payload?.victim;
        const attacker = payload?.attacker;

        // If player hits an enemy
        if (attacker && this.world.hasComponent(attacker, "PlatformerInput") && victim && this.world.hasComponent(victim, "Enemy")) {
          // Reduce health of enemy (most enemies have 1 health, so they explode!)
          if (this.world.hasComponent(victim, "Health")) {
            this.world.mutateComponent(victim, "Health", (h) => {
              h.current--;
            });
            this.world.mutateComponent(victim, "Render", (r) => {
              r.hitFlashFrames = 8;
            });

            // Play hit/kill sound
            this.audio.playSFX("explosion");

            // Trigger screenshake
            const cameras = this.world.query("Camera2D");
            for (let c = 0; c < cameras.length; c++) {
              this.world.commands.addComponent(cameras[c], {
                type: "ScreenShake",
                intensity: 6,
                duration: 0.15,
                remaining: 0.15
              });
            }

            // Remove enemy if health is <= 0
            const enemyHealth = this.world.getComponent(victim, "Health")!;
            if (enemyHealth.current <= 0) {
              this.world.commands.removeEntity(victim);
            }
          }
        }
      });

      // Listen for collectible pickup to play score sound
      eventBus.on("CollectiblePickedUp", () => {
        this.audio.playSFX("score");
      });

      // Listen for player died to play game over/death sound
      eventBus.on("PlayerDied", () => {
        this.audio.playSFX("game_over");
      });
    }

    console.log("[EchoDebug] sistemas registrados:", [
      "PauseSystem",
      "InputBridgeSystem",
      "ArcadeControlSystem",
      "AudioSystem",
      "ParticleSystem",
      "PlatformerInputSystem",
      "EchoRunnerAttackSystem",
      "PlatformerMovementSystem",
      "PlatformerGravitySystem",
      "PlatformerCoyoteSystem",
      "MovingPlatformSystem",
      "PlatformCarrySystem",
      "EnemySensorSystem",
      "StateMachineSystem",
      "CheckpointSystem",
      "DeathSystem",
      "RespawnSystem",
      "PhysicsIntegrateSystem",
      "TileCollisionSystem",
      "CollectibleSystem",
      "HitDetectionSystem",
      "Camera2DSystem",
      "TilemapRenderSystem",
      "EchoRunnerDamageSystem",
      "SpriteRenderSystem",
      "DebugRenderSystem"
    ]);
  }

  protected override async onInitializeEntities(): Promise<void> {
    try {
      const tileDefinitions = {
        1: { solid: true, kind: "normal" as const },
        2: { solid: true, kind: "ice" as const },
        3: { solid: true, kind: "bounce" as const, bounce: 1.5 },
        4: { solid: true, kind: "spike" as const },
        5: { solid: true, oneWay: true, kind: "normal" as const }
      };

      const rawData = this.customLevelData ?? defaultLevelData;
      const runnerSeed = this.getSeed() || 41873;
      this.levelPlan = SegmentGenerator.generatePlan(
        rawData.templates as SegmentTemplate[],
        rawData.grammar as string[],
        runnerSeed
      );

      syncLevelWorldDimensions(this.world, this.levelPlan, DEFAULT_ECHO_RUNNER_CONFIG);

      // Set world resources
      this.world.setResource("PlayerStartPoint", { x: 100, y: 350 });

      // Instantiate Plan
      const config = this.world.getResource<EchoRunnerConfigType>("GameConfig") || DEFAULT_ECHO_RUNNER_CONFIG;
      SegmentGenerator.instantiatePlan(this.world, this.levelPlan, config.TILE_SIZE, tileDefinitions);

      // Spawn Player
      const playerEntity = this.world.createEntity();
      const playerBp = this.blueprints.get("player");
      if (playerBp) {
        playerBp.spawn(this.world, playerEntity, { x: 100, y: 350 });
      } else {
        throw new Error("[EchoRunnerGame] Blueprint 'player' is not registered.");
      }

      // Spawn Main Follow Camera centered on player
      const camEntity = createMainCamera2D(this.world, playerEntity, {
        lookAheadX: 80,
        smoothingX: 6.0,
        smoothingY: 6.0,
        verticalDeadzone: 45
      });
      this.world.addComponent(camEntity, {
        type: "ScreenShake",
        intensity: 0,
        duration: 0,
        remaining: 0
      });

      // Flush all deferred commands from SegmentGenerator and blueprint spawns
      this.world.flush();
    } catch (err) {
      console.error("[EchoRunnerGame] Failed to initialize entities:", err);
      throw err instanceof Error ? err : new Error(`[EchoRunnerGame] Initialization error: ${String(err)}`);
    }
  }

  public override update(dt: number): void {
    const runState = this.world.getResource<RunState>("RunState");
    if (runState) {
      runState.elapsedTime += dt;
    }

    // Check level complete (Core collected)
    if (runState && runState.collectedPermanentIds.includes("archive_core_1")) {
      if (!this.gameOver) {
        this.gameOver = true;
        this.eventBus.emit("game:over", {
          state: this.getGameState()
        });
      }
    }

    if (process.env.NODE_ENV !== "asdg") {
      this.dbgFrames = (this.dbgFrames ?? 0) + 1;
      if (this.dbgFrames % 30 === 0) {
        const player = this.world.query("Tag").find(e =>
          this.world.getComponent(e, "Tag")?.tags?.includes("Player")
        );
        console.log("[EchoDebug]", {
          frame: this.dbgFrames,
          dt,
          paused: this.isPausedState?.(),
          elapsed: runState?.elapsedTime,
          playerEntity: player,
          transform: player ? this.world.getComponent(player, "Transform") : null,
          velocity: player ? this.world.getComponent(player, "Velocity") : null,
          grounded: player ? this.world.getComponent(player, "PlatformerGroundState") : null,
          input: player ? this.world.getComponent(player, "PlatformerInput") : null
        });
      }
    }

    this.world.update(dt);
  }

  public override setInputState(input: Partial<EchoRunnerInput>): void {
    mutatePlatformerInputState(this.getWorld(), input);
  }

  protected override async onPreloadAssets(): Promise<void> {
    if (this.audio) {
      await preloadSharedAudioManifest(this.audio);
    }
  }

  public initializeRenderer(renderer: Renderer<CoreComponentRegistry, RenderContext>): void {
    if (renderer.type === "canvas") {
      const {
        drawEchoBackground,
        drawEchoPlayer,
        drawMemoryFragment,
        drawMemoryCore,
        drawCheckpointNode,
        drawPulseAttack,
        drawSentinel,
        drawHopper,
        drawWatcher,
        drawCharger
      } = require("./rendering/EchoRunnerCanvasVisuals");

      const { drawPlatformerTilemap } = require("../platformer/rendering/PlatformerCanvasVisuals");

      renderer.registerBackgroundEffect("echo_bg", drawEchoBackground);
      renderer.registerShape("tilemap", drawPlatformerTilemap);
      renderer.registerShape("player", drawEchoPlayer);
      renderer.registerShape("fragment", drawMemoryFragment);
      renderer.registerShape("core", drawMemoryCore);
      renderer.registerShape("node", drawCheckpointNode);
      renderer.registerShape("pulse_attack", drawPulseAttack);
      renderer.registerShape("sentinel", drawSentinel);
      renderer.registerShape("hopper", drawHopper);
      renderer.registerShape("watcher", drawWatcher);
      renderer.registerShape("charger", drawCharger);
    } else if (renderer.type === "skia") {
      const {
        drawSkiaEchoBackground,
        drawSkiaEchoPlayer,
        drawSkiaMemoryFragment,
        drawSkiaMemoryCore,
        drawSkiaCheckpointNode,
        drawSkiaPulseAttack,
        drawSkiaSentinel,
        drawSkiaHopper,
        drawSkiaWatcher,
        drawSkiaCharger
      } = require("./rendering/EchoRunnerSkiaVisuals");

      renderer.registerBackgroundEffect("echo_bg", drawSkiaEchoBackground);
      renderer.registerShape("player", drawSkiaEchoPlayer);
      renderer.registerShape("fragment", drawSkiaMemoryFragment);
      renderer.registerShape("core", drawSkiaMemoryCore);
      renderer.registerShape("node", drawSkiaCheckpointNode);
      renderer.registerShape("pulse_attack", drawSkiaPulseAttack);
      renderer.registerShape("sentinel", drawSentinel);
      renderer.registerShape("hopper", drawHopper);
      renderer.registerShape("watcher", drawWatcher);
      renderer.registerShape("charger", drawCharger);
    }
  }

  public getGameState(): EchoRunnerGameState {
    const runState = this.world.getResource<RunState>("RunState");
    const score = runState ? runState.collectedTemporalIds.length * 10 + runState.collectedPermanentIds.length * 100 : 0;

    return {
      type: "EchoRunnerGameState",
      score,
      isGameOver: this.gameOver,
      attempts: runState ? runState.attempt : 1,
      deaths: runState ? runState.deaths : 0,
      fragments: runState ? runState.collectedTemporalIds.length : 0,
      cores: runState ? runState.collectedPermanentIds.length : 0,
      activeCheckpoint: runState ? runState.activeCheckpoint : null,
      elapsedTime: runState ? runState.elapsedTime : 0
    };
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }
}

export const EchoRunnerDefinition = {
  name: "echorunner",
  createSimulation: (seed: number) => {
    return new EchoRunnerGame({ seed });
  },
  inputSchema: {
    actions: ["left", "right", "jump", "pulse"]
  },
  assets: {
    sprites: [],
    sounds: SHARED_AUDIO_MANIFEST
  }
};
