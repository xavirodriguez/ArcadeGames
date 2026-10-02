/**
 * Hit&Run — platformer run-and-gun / melee on @tiny-aster/core.
 * Branch feature/hit-and-run (fix: make playable).
 *
 * Bootstraps a playable session by:
 * - registering Hit&Run systems (feedback, hurt, melee, weapons, AI, waves)
 * - reusing EchoRunner level generation + canvas visuals as fallback content
 *   until Hit&Run owns its own full level pack and art
 */
import {
  System,
  PhysicsUtils,
  SystemPhase,
  BlueprintDefinition,
  CoreComponentRegistry,
  EventRegistry,
  RenderContext,
  WebAudioPlayer,
  IAudioPlayer,
  Renderer,
  HealthComponent,
  TagComponent,
  RunState,
  registerEnemyStateMachines,
  SegmentTemplate,
  SegmentGenerator,
  LevelPlan,
  preloadSharedAudioManifest
} from "@tiny-aster/core";
import { EchoRunnerDefinition } from "../echorunner/EchoRunnerGame";
import type { EchoRunnerConfig } from "../echorunner/EchoRunnerGame";
import { EchoRunnerBlueprintMap } from "../echorunner/EchoRunnerGame";
import { PlatformerArcadeGame } from "../shared/PlatformerArcadeGame";
import type {
  HitAndRunGameState,
  HitAndRunInput
} from "./types/HitAndRunTypes";
import { PlatformerInputSystem } from "../platformer/systems/PlatformerInputSystem";
import {
  ArcadeEntityBuilder,
  registerPlatformerEnemyBlueprints,
  registerPlatformerEnvironmentBlueprints,
  mutatePlatformerInputState,
  registerCommonPlatformerSystems,
  updatePlayerInvulnerabilityAndContactDamage
} from "@tiny-aster/gameplay-kit";
import {
  setupPlatformerMovementComponents,
  registerPlatformerTilemapBlueprint,
  createMainCamera2D,
  registerPresentationSystems,
  syncLevelWorldDimensions,
  registerCollectibleTriggerBlueprint
} from "../shared/componentBuilders";
import { DEFAULT_ECHO_RUNNER_CONFIG } from "../echorunner/types/EchoRunnerConfigSchema";
import echoDefaultLevelData from "../echorunner/levels/level-01.json";
import { registerHitRunMelee } from "./melee/registerHitRunMelee";
import { registerHitRunFeedback } from "./systems/registerHitRunFeedback";
import { registerHitRunHurt } from "./hurt/registerHitRunHurt";
import { registerHitRunWeapons } from "./weapons/registerHitRunWeapons";
import { registerHitRunAI } from "./ai/registerHitRunAI";
import { registerHitRunWaves } from "./waves/registerHitRunWaves";
import { WAVE_OPENING } from "./waves/sampleWaves";

export type HitAndRunConfig = EchoRunnerConfig;

/** Contact damage vs enemies/spikes (shared with EchoRunner feel). */
class HitRunDamageSystem extends System<CoreComponentRegistry> {
  public update(world: import("@tiny-aster/core").World<CoreComponentRegistry>, deltaTime: number): void {
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

/** Pulse / attack trigger (reuses PlatformerInput.pulsePressed). */
class HitRunAttackSystem extends System<CoreComponentRegistry> {
  public update(world: import("@tiny-aster/core").World<CoreComponentRegistry>, deltaTime: number): void {
    const players = world.query("PlatformerInput", "Transform");
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const input = world.getComponent(player, "PlatformerInput") as
        | { pulseCooldown?: number; pulsePressed?: boolean }
        | undefined;
      const trans = world.getComponent(player, "Transform")!;
      if (!input) continue;

      let cd = input.pulseCooldown ?? 0;
      if (cd > 0) {
        cd = PhysicsUtils.tickTimer(cd, deltaTime);
        world.mutateComponent(player, "PlatformerInput", (inp: unknown) => {
          (inp as { pulseCooldown?: number }).pulseCooldown = cd;
        });
      }

      if (input.pulsePressed && cd <= 0) {
        world.mutateComponent(player, "PlatformerInput", (inp: unknown) => {
          (inp as { pulseCooldown?: number }).pulseCooldown = 0.45;
        });

        const vel = world.getComponent(player, "Velocity")!;
        let dir = 1;
        if (vel.vx !== 0) dir = vel.vx > 0 ? 1 : -1;
        else if (trans.scaleX < 0) dir = -1;

        const audio =
          world.getResource<IAudioPlayer>("AudioPlayer") ||
          world.getResource<IAudioPlayer>("Audio");
        if (audio) audio.playSFX("pulse");

        world.commands.spawnFromBlueprint("pulse_hitbox", {
          dir,
          x: trans.x,
          y: trans.y,
          parent: player
        });

        world.mutateComponent(player, "PlatformerInput", (inp: unknown) => {
          (inp as { pulsePressed?: boolean }).pulsePressed = false;
        });
      }
    }
  }
}

export class HitAndRunGame extends PlatformerArcadeGame<
  HitAndRunGameState,
  HitAndRunInput,
  CoreComponentRegistry,
  EventRegistry,
  EchoRunnerBlueprintMap
> {
  public readonly gameId = "hitandrun";
  private gameOver = false;
  private levelPlan!: LevelPlan;
  private customLevelData?: { templates: SegmentTemplate[]; grammar: string[] };

  constructor(config: HitAndRunConfig = {}) {
    super({
      pauseKey: "KeyP",
      restartKey: "KeyR",
      gameOptions: config.gameOptions,
      seed: config.seed,
      audio: new WebAudioPlayer()
    });
    this.customLevelData =
      config.levelData ??
      (config.gameOptions?.levelData as
        | { templates: SegmentTemplate[]; grammar: string[] }
        | undefined);
  }

  public update(dt: number): void {
    const runState = this.world.getResource<RunState>("RunState");
    if (runState) {
      runState.elapsedTime += dt;
    }

    // Level complete when archive core collected (same id as EchoRunner plan)
    if (runState && runState.collectedPermanentIds.includes("archive_core_1")) {
      if (!this.gameOver) {
        this.gameOver = true;
        this.eventBus.emit("game:over", { state: this.getGameState() });
      }
    }

    this.world.update(dt);
  }

  public override setInputState(input: Partial<HitAndRunInput>): void {
    mutatePlatformerInputState(this.getWorld(), input);
  }

  protected override async onPreloadAssets(): Promise<void> {
    if (this.audio) {
      await preloadSharedAudioManifest(this.audio);
    }
  }

  protected override async onRegisterSystems(): Promise<void> {
    await super.onRegisterSystems();

    // --- Blueprints (shared platformer / echo shapes) ---
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

        world.addComponent(entity, {
          type: "Hitbox",
          hitEntities: []
        } as { type: string; [key: string]: unknown });
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

        world.addComponent(entity, {
          type: "Health",
          current: 3,
          max: 3
        } as HealthComponent);
        world.addComponent(entity, {
          type: "Tag",
          tags: ["TileCollider", "Player"]
        } as TagComponent);
        world.addComponent(entity, {
          type: "Hurtbox"
        } as { type: string; [key: string]: unknown });

        // Starting weapon for Hit&Run arsenal
        world.addComponent(entity, {
          type: "HitRunWeapon",
          weaponId: "hmg",
          cooldownRemaining: 0
        } as { type: string; [key: string]: unknown });

        const config =
          world.getResource<typeof DEFAULT_ECHO_RUNNER_CONFIG>("GameConfig") ||
          DEFAULT_ECHO_RUNNER_CONFIG;

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
    registerCollectibleTriggerBlueprint(
      this.blueprints,
      "collectible_fragment",
      "fragment",
      10,
      16,
      10,
      "fragment",
      false,
      false
    );
    registerCollectibleTriggerBlueprint(
      this.blueprints,
      "collectible_core",
      "core",
      100,
      24,
      12,
      "core",
      true,
      true
    );
    registerPlatformerEnvironmentBlueprints(this.blueprints);
    registerPlatformerEnemyBlueprints(this.blueprints);
    registerEnemyStateMachines(this.world);

    // Input
    this.world.addSystem(new PlatformerInputSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new HitRunAttackSystem(), { phase: SystemPhase.Input });

    // Shared platformer simulation
    registerCommonPlatformerSystems(this.world, { includeMovingPlatforms: true });
    this.world.addSystem(new HitRunDamageSystem(), { phase: SystemPhase.Simulation });
    registerPresentationSystems(this.world);

    // Hit&Run specific systems (order per README boot sequence)
    registerHitRunFeedback(this.world);
    registerHitRunHurt(this.world);
    registerHitRunMelee(this.world);
    registerHitRunWeapons(this.world);
    registerHitRunAI(this.world);
    registerHitRunWaves(this.world, {
      script: WAVE_OPENING,
      autoStart: true,
      defaultSpawnX: 400,
      defaultSpawnY: 200
    });

    // Combat / collectible SFX hooks
    const eventBus = this.world.getEventBus();
    if (eventBus) {
      eventBus.on("hitbox:hit", (event: unknown) => {
        const payload = event as { victim?: number; attacker?: number } | undefined;
        const victim = payload?.victim;
        const attacker = payload?.attacker;

        if (
          attacker &&
          this.world.hasComponent(attacker, "PlatformerInput") &&
          victim &&
          this.world.hasComponent(victim, "Enemy")
        ) {
          if (this.world.hasComponent(victim, "Health")) {
            this.world.mutateComponent(victim, "Health", (h) => {
              h.current--;
            });
            this.world.mutateComponent(victim, "Render", (r) => {
              r.hitFlashFrames = 8;
            });
            this.audio.playSFX("explosion");

            const enemyHealth = this.world.getComponent(victim, "Health")!;
            if (enemyHealth.current <= 0) {
              this.world.commands.removeEntity(victim);
            }
          }
        }
      });

      eventBus.on("CollectiblePickedUp", () => {
        this.audio.playSFX("score");
      });

      eventBus.on("PlayerDied", () => {
        this.audio.playSFX("game_over");
      });
    }
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

      // Prefer custom data; fall back to EchoRunner level pack because
      // src/games/hitandrun/levels/level-01.json currently has empty templates.
      const rawData =
        this.customLevelData &&
        Array.isArray(this.customLevelData.templates) &&
        this.customLevelData.templates.length > 0
          ? this.customLevelData
          : echoDefaultLevelData;

      const runnerSeed = this.getSeed() || 41873;
      this.levelPlan = SegmentGenerator.generatePlan(
        rawData.templates as SegmentTemplate[],
        rawData.grammar as string[],
        runnerSeed
      );

      syncLevelWorldDimensions(this.world, this.levelPlan, DEFAULT_ECHO_RUNNER_CONFIG);
      this.world.setResource("PlayerStartPoint", { x: 100, y: 350 });
      this.world.setResource("GameConfig", DEFAULT_ECHO_RUNNER_CONFIG);

      SegmentGenerator.instantiatePlan(
        this.world,
        this.levelPlan,
        DEFAULT_ECHO_RUNNER_CONFIG.TILE_SIZE,
        tileDefinitions
      );

      const playerEntity = this.world.createEntity();
      const playerBp = this.blueprints.get("player");
      if (playerBp) {
        playerBp.spawn(this.world, playerEntity, { x: 100, y: 350 });
      } else {
        throw new Error("[HitAndRunGame] Blueprint 'player' is not registered.");
      }

      createMainCamera2D(this.world, playerEntity, {
        lookAheadX: 80,
        smoothingX: 6.0,
        smoothingY: 6.0,
        verticalDeadzone: 45
      });

      this.world.flush();
    } catch (err) {
      console.error("[HitAndRunGame] Failed to initialize entities:", err);
      throw err instanceof Error
        ? err
        : new Error(`[HitAndRunGame] Initialization error: ${String(err)}`);
    }
  }

  public initializeRenderer(
    renderer: Renderer<CoreComponentRegistry, RenderContext>
  ): void {
    // Reuse EchoRunner visuals until Hit&Run has dedicated art.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
      } = require("../echorunner/rendering/EchoRunnerCanvasVisuals");
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
      } = require("../echorunner/rendering/EchoRunnerSkiaVisuals");

      renderer.registerBackgroundEffect("echo_bg", drawSkiaEchoBackground);
      renderer.registerShape("player", drawSkiaEchoPlayer);
      renderer.registerShape("fragment", drawSkiaMemoryFragment);
      renderer.registerShape("core", drawSkiaMemoryCore);
      renderer.registerShape("node", drawSkiaCheckpointNode);
      renderer.registerShape("pulse_attack", drawSkiaPulseAttack);
      renderer.registerShape("sentinel", drawSkiaSentinel);
      renderer.registerShape("hopper", drawSkiaHopper);
      renderer.registerShape("watcher", drawSkiaWatcher);
      renderer.registerShape("charger", drawSkiaCharger);
    }
  }

  public getGameState(): HitAndRunGameState {
    const rs = this.world.getResource<RunState>("RunState");
    return {
      type: "HitAndRunGameState",
      score: rs
        ? rs.collectedTemporalIds.length * 10 +
          rs.collectedPermanentIds.length * 100
        : 0,
      isGameOver: this.gameOver,
      attempts: rs?.attempt ?? 1,
      deaths: rs?.deaths ?? 0,
      fragments: rs?.collectedTemporalIds.length ?? 0,
      cores: rs?.collectedPermanentIds.length ?? 0,
      activeCheckpoint: rs?.activeCheckpoint ?? null,
      elapsedTime: rs?.elapsedTime ?? 0
    };
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }
}

export const HitAndRunDefinition = {
  name: "hitandrun",
  createSimulation: (seed: number) => {
    return new HitAndRunGame({ seed });
  },
  inputSchema: {
    actions: ["left", "right", "jump", "pulse", "attack"]
  },
  assets: EchoRunnerDefinition.assets
};

export type { HitAndRunGameState, HitAndRunInput };
