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
  SHARED_AUDIO_MANIFEST,
  Theme
} from "@tiny-aster/core";
import { drawEchoBackground, drawEchoPlayer, drawMemoryFragment, drawMemoryCore, drawCheckpointNode, drawPulseAttack, drawSentinel, drawHopper, drawWatcher, drawCharger } from "./rendering/EchoRunnerCanvasVisuals";
import { EchoRunnerInput, EchoRunnerInputComponent, EchoRunnerGameState, EchoRunnerEventRegistry, EchoRunnerCollectibleProgress, EchoRunnerCollectibleKind, toEchoRunnerCollectibleKind, ECHO_CONFIG } from "./types/EchoRunnerTypes";
import { EchoRunnerConfigSchema, EchoRunnerConfig as EchoRunnerConfigType, DEFAULT_ECHO_RUNNER_CONFIG } from "./types/EchoRunnerConfigSchema";
import { PlatformerArcadeGame, loadPlatformerArcadeConfig } from "../shared/PlatformerArcadeGame";
import { PlatformerInputSystem } from "../shared/systems/PlatformerInputSystem";
import { resolveAndApplyMutators } from "../../config/MutatorConfig";
import { ArcadeEntityBuilder, registerPlatformerEnemyBlueprints, registerPlatformerEnvironmentBlueprints, mutatePlatformerInputState, registerCommonPlatformerSystems, updatePlayerInvulnerabilityAndContactDamage, updateRunProgress } from "@tiny-aster/gameplay-kit";
import { setupPlatformerMovementComponents, registerPlatformerTilemapBlueprint, createMainCamera2D, registerPresentationSystems, generateAndInstantiatePlatformerLevel, registerStandardPlatformerCollectibles, registerCollectibleTriggerBlueprint } from "../shared/componentBuilders";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import defaultLevelData from "./levels/level-01.json";
import { SpriteRegistry, createSpriteAnimator } from "../shared/sprites";
import { EchoRunnerSpriteSystem } from "./systems/EchoRunnerSpriteSystem";

export interface EchoRunnerConfig {
  seed?: number;
  gameOptions?: Record<string, unknown>;
  theme?: Theme;
  levelData?: { templates: SegmentTemplate[]; grammar: string[] };
}

export interface EchoRunnerBlueprintMap extends Record<string, BlueprintDefinition<CoreComponentRegistry, EventRegistry, unknown>> {
  pulse_hitbox: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { dir: number; x: number; y: number; parent: number }>;
  player: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { x: number; y: number }>;
  tilemap: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { data: number[][]; tileDefinitions: Record<number, unknown> }>;
  collectible_fragment: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { x: number; y: number; id: string }>;
  collectible_core: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { x: number; y: number; id: string }>;
  collectible_coin: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { x: number; y: number; id: string }>;
  state_switch: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { x: number; y: number; id: string; targetId: string }>;
  state_gate: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { x: number; y: number; id: string; targetId: string }>;
  death_zone: BlueprintDefinition<CoreComponentRegistry, EventRegistry, { x: number; y: number; id: string; halfWidth?: number; halfHeight?: number }>;
}

/**
 * System that manages triggering the Pulse attack and processing its cooldowns.
 */
class EchoRunnerAttackSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const players = world.query("EchoRunnerInput", "Transform");
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const echoInput = world.getComponent(player, "EchoRunnerInput") as EchoRunnerInputComponent | undefined;
      const trans = world.getComponent(player, "Transform")!;

      if (!echoInput) continue;

      let newCooldown = echoInput.pulseCooldown;
      let newPulsePressed = echoInput.pulsePressed;

      // Manage attack cooldowns
      if (newCooldown > 0) {
        newCooldown = PhysicsUtils.tickTimer(newCooldown, deltaTime);
      }

      // Read trigger and fire!
      if (newPulsePressed && newCooldown <= 0) {
        newCooldown = 0.45; // Cooldown of 0.45s

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

        // Clear pulse trigger
        newPulsePressed = false;
      } else if (newPulsePressed) {
        // Pulse is a one-shot action, not a queued request. A press during cooldown
        // must be discarded rather than firing later when the cooldown reaches zero.
        newPulsePressed = false;
      }

      // Merge component mutations into a single mutateComponent call
      if (newCooldown !== echoInput.pulseCooldown || newPulsePressed !== echoInput.pulsePressed) {
        world.mutateComponent(player, "EchoRunnerInput", (inp) => {
          const input = inp as EchoRunnerInputComponent;
          input.pulseCooldown = newCooldown;
          input.pulsePressed = newPulsePressed;
        });
      }
    }
  }
}

/**
 * System that handles damage when player overlaps an enemy or spikes.
 */
class EchoRunnerDeathZoneSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const zones = world.query("DeathZone", "CollisionEvents");
    const players = world.query("PlatformerInput", "Health", "CollisionEvents");
    const eventBus = world.getEventBus();

    for (const zoneEntity of zones) {
      const zone = world.getComponent(zoneEntity, "DeathZone");
      const zoneEvents = world.getComponent(zoneEntity, "CollisionEvents");
      if (!zone || !zoneEvents) continue;

      for (const playerEntity of players) {
        const playerEvents = world.getComponent(playerEntity, "CollisionEvents");
        const health = world.getComponent(playerEntity, "Health");
        if (!playerEvents || !health || health.current <= 0) continue;

        const enteredZone =
          zoneEvents.triggersEntered.includes(playerEntity) ||
          playerEvents.triggersEntered.includes(zoneEntity);
        if (!enteredZone) continue;

        world.mutateComponent(playerEntity, "Health", (mutableHealth) => {
          mutableHealth.current = 0;
        });
        eventBus.emitDeferred("DeathZoneEntered", {
          zoneEntity,
          zoneId: zone.id,
          playerEntity
        });
      }
    }
  }
}

class EchoRunnerDamageSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    updatePlayerInvulnerabilityAndContactDamage(world, deltaTime);
  }
}

export class EchoRunnerGame extends PlatformerArcadeGame<EchoRunnerGameState, EchoRunnerInput, CoreComponentRegistry, EchoRunnerEventRegistry, EchoRunnerBlueprintMap> {
  public readonly gameId = "echorunner";
  private gameOver = false;
  private levelPlan!: LevelPlan;
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
      theme: config.theme ?? (config.gameOptions?.theme as Theme | undefined) ?? createThemeFromGameAccents("echorunner"),
      audio: new WebAudioPlayer()
    });
    const res = this.loadConfig<EchoRunnerConfigType>(
      EchoRunnerConfigSchema,
      config.gameOptions,
      config.levelData
    );
    this.baseConfig = res.baseConfig;
    this.config = res.baseConfig;
    this.customLevelData = res.customLevelData;
  }

  protected override async onRegisterSystems(): Promise<void> {
    this.config = this.setupArcadeGameConfig(this.baseConfig, resolveAndApplyMutators);
    await super.onRegisterSystems();

    // Initialize sprite sheets (oni_red etc.)
    SpriteRegistry.init();

    // Keep the shared death system configurable per game without changing the
    // platformer defaults used by other games.
    this.world.setResource("DeathPlaneY", this.config.DEATH_PLANE_Y);
    const collectibleProgress: EchoRunnerCollectibleProgress = {
      kindsById: {},
      valuesById: {}
    };
    this.world.setResource("EchoRunnerCollectibleProgress", collectibleProgress);

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
          jumpReleased: false
        } as { type: string; [key: string]: unknown });
        world.addComponent(entity, {
          type: "EchoRunnerInput",
          pulsePressed: false,
          pulseCooldown: 0
        } as EchoRunnerInputComponent);
        world.addComponent(entity, {
          type: "PlatformerJumper",
          coyoteTimer: 0,
          jumpBufferTimer: 0,
          coyoteTimeMax: config.COYOTE_TIME_MAX,
          jumpBufferMax: config.JUMP_BUFFER_MAX
        } as { type: string; [key: string]: unknown });

        // Temporary: use oni_red sprite sheet as protagonist for testing
        const animState = createSpriteAnimator("oni_red", "idle");
        world.addComponent(entity, {
          type: "SpriteAnimator",
          sheetId: animState.sheetId,
          currentAnim: animState.currentAnim,
          frameIndex: animState.frameIndex,
          timer: animState.timer,
          scale: animState.scale,
          flipX: animState.flipX,
          offsetX: animState.offsetX,
          offsetY: animState.offsetY,
        });
      }
    });

    registerPlatformerTilemapBlueprint(this.blueprints, DEFAULT_ECHO_RUNNER_CONFIG);

    registerStandardPlatformerCollectibles(this.blueprints);
    registerCollectibleTriggerBlueprint(this.blueprints, {
      id: "collectible_coin",
      kind: "coin",
      value: 20,
      size: 16,
      halfSize: 10,
      shape: "fragment",
      persistent: false,
      collectOnce: false
    });

    this.blueprints.register("state_switch", {
      spawn: (world, entity, args: { x: number; y: number; id: string; targetId: string }) => {
        ArcadeEntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 13, halfHeight: 13 },
            layer: 1 << 4,
            mask: 1 << 3,
            isTrigger: true
          })
          .withCollisionEvents()
          .withRender({ shape: "state_switch", size: 26, order: 3 });
        world.addComponent(entity, {
          type: "StateTrigger",
          id: args.id,
          targetId: args.targetId,
          activated: false
        });
        world.addComponent(entity, { type: "Hurtbox" });
      }
    });

    this.blueprints.register("state_gate", {
      spawn: (world, entity, args: { x: number; y: number; id: string; targetId: string }) => {
        ArcadeEntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withCollider2D({
            shape: { type: "aabb", halfWidth: 12, halfHeight: 30 },
            layer: 1,
            mask: 1,
            isTrigger: false
          })
          .withRender({ shape: "state_gate", size: 60, order: 2 });
        world.addComponent(entity, {
          type: "StateGate",
          id: args.id,
          targetId: args.targetId,
          isOpen: false
        });
      }
    });

    this.blueprints.register("death_zone", {
      spawn: (world, entity, args: { x: number; y: number; id: string; halfWidth?: number; halfHeight?: number }) => {
        const halfWidth = args.halfWidth ?? 28;
        const halfHeight = args.halfHeight ?? 18;
        ArcadeEntityBuilder.fromEntity(world, entity)
          .withTransform({ x: args.x, y: args.y })
          .withCollider2D({
            shape: { type: "aabb", halfWidth, halfHeight },
            layer: 1 << 5,
            mask: 1,
            isTrigger: true
          })
          .withCollisionEvents()
          .withRender({
            shape: "death_zone",
            size: Math.max(halfWidth * 2, halfHeight * 2),
            order: 1
          });
        world.addComponent(entity, { type: "DeathZone", id: args.id });
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
    this.world.addSystem(new EchoRunnerDeathZoneSystem(), {
      phase: SystemPhase.Collision,
      priority: 10
    });

    // Game-specific simulation systems
    this.world.addSystem(new EchoRunnerDamageSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new EchoRunnerSpriteSystem(), { phase: SystemPhase.Simulation });

    // Game-specific presentation systems
    registerPresentationSystems(this.world);

    // Listen to Hit Detection events
    const eventBus = this.world.getEventBus();
    if (eventBus) {
      eventBus.on("hitbox:hit", (payload) => {
        const victim = payload.victim;
        const attacker = payload.attacker;

        // Pulse can activate authored state triggers. Every matching gate opens,
        // and its collider is disabled so the interaction changes gameplay state.
        if (
          victim !== undefined &&
          attacker !== undefined &&
          (this.world.hasComponent(attacker, "PlatformerInput") || this.world.hasComponent(attacker, "EchoRunnerInput")) &&
          this.world.hasComponent(victim, "StateTrigger")
        ) {
          const trigger = this.world.getComponent(victim, "StateTrigger");
          if (trigger && !trigger.activated) {
            this.world.mutateComponent(victim, "StateTrigger", (stateTrigger) => {
              stateTrigger.activated = true;
            });

            const gates = this.world.query("StateGate");
            for (const gateEntity of gates) {
              const gate = this.world.getComponent(gateEntity, "StateGate");
              if (!gate || gate.targetId !== trigger.targetId || gate.isOpen) continue;

              this.world.mutateComponent(gateEntity, "StateGate", (stateGate) => {
                stateGate.isOpen = true;
              });
              if (this.world.hasComponent(gateEntity, "Collider2D")) {
                this.world.mutateComponent(gateEntity, "Collider2D", (collider) => {
                  collider.enabled = false;
                });
              }
            }

            eventBus.emit("StateTriggerActivated", {
              triggerEntity: victim,
              triggerId: trigger.id,
              targetId: trigger.targetId,
              attacker
            });
          }
        }

        // If player hits an enemy
        if (attacker && (this.world.hasComponent(attacker, "PlatformerInput") || this.world.hasComponent(attacker, "EchoRunnerInput")) && victim && this.world.hasComponent(victim, "Enemy")) {
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
    }
  }
}
