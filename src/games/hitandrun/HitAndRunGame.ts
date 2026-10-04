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
import {
  WAVE_DIRECTOR_RESOURCE,
  WAVE_SCRIPT_RESOURCE,
  type WaveDirectorState,
  type WaveScript
} from "./waves/HitRunWaveTypes";
import type { HitRunWeaponState } from "./weapons/HitRunWeaponTypes";
import { HIT_RUN_BACKDROP_THEME } from "./rendering/HitAndRunPalette";
import { HIT_RUN_BACKDROP_RESOURCE } from "./rendering/HitRunBackdropCanvas";

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

    if (runState && runState.collectedPermanentIds.includes("archive_core_1")) {
      if (!this.gameOver) {
        this.gameOver = true;
        this.eventBus.emit("game:over", { state: this.getGameState() });
      }
    }

    this.world.update(dt);
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
      theme: HIT_RUN_BACKDROP_THEME,
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
    this.world.setResource(HIT_RUN_BACKDROP_RESOURCE, spec);
  }

  protected override async onRegisterSystems(): Promise<void> {
    await super.onRegisterSystems();

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
    registerBeltPlayerBlueprint(this.blueprints);

    const playerEntity = this.world.createEntity();
    const playerBp = this.blueprints.get("player");
    if (playerBp) {
      playerBp.spawn(this.world, playerEntity, {
        x: DEFAULT_BELT_PLAYER_SPAWN.x,
        y: DEFAULT_BELT_PLAYER_SPAWN.y,
        weaponId: "longbow",
        health: 5
      } as import("./belt/registerBeltPlayerBlueprint").BeltPlayerSpawnArgs);
    } else {
      throw new Error("[HitAndRunGame] Blueprint 'player' is not registered.");
    }
  }

  public override setInputState(input: Partial<HitAndRunInput>): void {
    mutateBeltInputState(this.getWorld(), input);
  }

  public initializeRenderer(
    _renderer: Renderer<CoreComponentRegistry, RenderContext>
  ): void {}

  public getGameState(): HitAndRunGameState {
    const rs = this.world.getResource<RunState>("RunState");
    const wave = this.world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
    const script = this.world.getResource<WaveScript>(WAVE_SCRIPT_RESOURCE);
    const players = this.world.query("PlatformerInput", "Health");
    const player = players[0];
    const health = player !== undefined
      ? (this.world.getComponent(player, "Health") as HealthComponent | undefined)
      : undefined;
    const weapon = player !== undefined
      ? (this.world.getComponent(player, "HitRunWeapon") as HitRunWeaponState | undefined)
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
      waveId: script?.id ?? wave?.scriptId,
      waveElapsed: wave?.elapsed,
      enemiesSpawned: wave?.totalSpawned,
      weaponId: weapon?.weaponId,
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
    actions: [
      "left",
      "right",
      "up",
      "down",
      "jump",
      "attack",
      "fire",
      "special"
    ]
  },
  assets: EchoRunnerDefinition.assets
};

export type { HitAndRunGameState, HitAndRunInput };
