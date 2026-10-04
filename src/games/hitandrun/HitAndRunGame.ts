/**
 * Hit&Run — fantasy belt-scroll beat'em-up (melee + ranged) on @tiny-aster/core.
 */
import {
  System,
  PhysicsUtils,
  SystemPhase,
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
  preloadSharedAudioManifest,
  generateBackdrop
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
import hitRunLevelData from "./levels/level-01.json";
import { registerHitRunMelee } from "./melee/registerHitRunMelee";
import { registerHitRunFeedback } from "./systems/registerHitRunFeedback";
import { registerHitRunHurt } from "./hurt/registerHitRunHurt";
import { registerHitRunWeapons } from "./weapons/registerHitRunWeapons";
import { registerBeltSystems } from "./belt/registerBeltSystems";
import {
  registerBeltPlayerBlueprint,
  DEFAULT_BELT_PLAYER_SPAWN
} from "./belt/registerBeltPlayerBlueprint";
import { mutateBeltInputState } from "./belt/mutateBeltInputState";
import {
  DEFAULT_COMBO_MELEE_CONFIG,
  COMBO_MELEE_CONFIG_RESOURCE
} from "./melee/ComboMeleeTypes";

export type HitAndRunConfig = EchoRunnerConfig;

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
        const dir = (trans as { facing?: number }).facing ?? 1;
        world.commands.spawnFromBlueprint("pulse_hitbox", {
          dir,
          x: trans.x,
          y: trans.y,
          parent: player
        });
        world.mutateComponent(player, "PlatformerInput", (inp: unknown) => {
          (inp as { pulseCooldown?: number; pulsePressed?: boolean }).pulseCooldown = 0.35;
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

    const world = this.getWorld();
    const playerEntity = world.query("PlatformerInput")[0];
    if (playerEntity !== undefined && input.attack !== undefined) {
      world.mutateComponent(playerEntity, "PlatformerInput", (comp) => {
        const held = !!input.attack;
        const c = comp as unknown as { fireHeld?: boolean; firePressed?: boolean };
        c.fireHeld = held;
        if (held) c.firePressed = true;
      });
    }
  }

  protected override async onPreloadAssets(): Promise<void> {
    if (this.audio) {
      await preloadSharedAudioManifest(this.audio);
    }
  }

  private installProceduralBackdrop(viewportWidth: number, viewportHeight: number): void {
    const seed = this.getSeed() || 41873;
    const spec = generateBackdrop({
      seed,
      viewportWidth,
      viewportHeight,
      chunkWidth: viewportWidth,
      quality: "high",
      fantasyDensity: 1.0,
      theme: undefined as any,
      playfieldMask: {
        enabled: true,
        x: 0,
        y: viewportHeight * 0.4,
        width: viewportWidth,
        height: viewportHeight * 0.6,
        opacity: 0.22,
        colorToken: "#000000"
      }
    });
    this.world.setResource("HitRunBackdrop", spec);
  }

  protected override async onRegisterSystems(): Promise<void> {
    await super.onRegisterSystems();

    // Blueprints must be registered here (before onInitializeEntities / any spawnFromBlueprint).
    // World.blueprints → BlueprintRegistry resource set by BaseGame.registerInternalResources.
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
    registerBeltPlayerBlueprint(this.blueprints);

    registerBeltSystems(this.world);

    registerHitRunFeedback(this.world);
    registerHitRunHurt(this.world);
    registerHitRunMelee(this.world);
    registerHitRunWeapons(this.world);

    this.world.setResource(COMBO_MELEE_CONFIG_RESOURCE, {
      ...DEFAULT_COMBO_MELEE_CONFIG
    });
  }

  protected override async onInitializeEntities(): Promise<void> {
    const playerEntity = this.world.createEntity();
    const playerBp = this.blueprints.get("player");
    if (!playerBp) {
      throw new Error("[HitAndRunGame] Blueprint 'player' is not registered. Register it in onRegisterSystems.");
    }
    playerBp.spawn(this.world, playerEntity, {
      x: DEFAULT_BELT_PLAYER_SPAWN.x,
      y: DEFAULT_BELT_PLAYER_SPAWN.y,
      weaponId: "longbow",
      health: 5
    });
  }

  public override setInputState(input: Partial<HitAndRunInput>): void {
    mutateBeltInputState(this.getWorld(), input);
  }

  public initializeRenderer(
    _renderer: Renderer<CoreComponentRegistry, RenderContext>
  ): void {}

  public getGameState(): HitAndRunGameState {
    const rs = this.world.getResource<RunState>("RunState");
    const players = this.world.query("PlatformerInput", "Health");
    const player = players[0];
    const health = player !== undefined
      ? (this.world.getComponent(player, "Health") as HealthComponent | undefined)
      : undefined;

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
      elapsedTime: rs?.elapsedTime ?? 0,
      health: health?.current,
      maxHealth: health?.max
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
    actions: ["attack", "jump", "moveLeft", "moveRight"],
    axes: ["moveX", "moveY"]
  },
  assets: {
    sprites: [],
    sounds: []
  }
};

export type { HitAndRunGameState, HitAndRunInput };
