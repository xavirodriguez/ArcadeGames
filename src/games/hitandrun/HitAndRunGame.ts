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
import { registerHitRunWaves } from "./waves/registerHitRunWaves";
import { registerHitRunDeathFlow } from "./systems/HitRunDeathFlowSystem";
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
import { HIT_RUN_BACKDROP_RESOURCE, drawHitRunProceduralBackdrop } from "./rendering/HitRunBackdropCanvas";
import {
  drawHitRunPlayer,
  drawHitRunPopcorn,
  drawHitRunWallTrooper,
  drawHitRunHopper,
  drawHitRunCharger,
  drawHitRunElite,
  drawHitRunBullet,
  drawHitRunRocket
} from "./rendering/HitRunCanvasVisuals";
import { drawHitRunHud } from "./rendering/HitRunHudCanvas";
import { drawPlatformerTilemap } from "../platformer/rendering/PlatformerCanvasVisuals";

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
      try {
        await Promise.race([
          preloadSharedAudioManifest(this.audio),
          new Promise((resolve) => setTimeout(resolve, 2000))
        ]);
      } catch (e) {
        console.warn("[HitAndRunGame] Audio preloading failed or timed out:", e);
      }
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

    registerPlatformerTilemapBlueprint(this.blueprints, DEFAULT_ECHO_RUNNER_CONFIG);
    registerCollectibleTriggerBlueprint(this.blueprints, "collectible_fragment", "fragment", 10, 16, 10, "fragment", false, false);
    registerCollectibleTriggerBlueprint(this.blueprints, "collectible_core", "core", 100, 24, 12, "core", true, true);
    registerPlatformerEnvironmentBlueprints(this.blueprints);

    registerBeltSystems(this.world);

    registerHitRunFeedback(this.world);
    registerHitRunHurt(this.world);
    registerHitRunMelee(this.world);
    registerHitRunWeapons(this.world);
    registerHitRunWaves(this.world, {
      defaultSpawnX: 850,
      defaultSpawnY: 420
    });
    registerHitRunDeathFlow(this.world);

    this.world.setResource(COMBO_MELEE_CONFIG_RESOURCE, {
      ...DEFAULT_COMBO_MELEE_CONFIG
    });

    registerPresentationSystems(this.world);
  }

  public getLevelPlan(): LevelPlan {
    return this.levelPlan;
  }

  protected override async onInitializeEntities(): Promise<void> {
    registerBeltPlayerBlueprint(this.blueprints);

    const tileDefinitions = {
      1: { solid: true, kind: "normal" as const },
      2: { solid: true, kind: "ice" as const },
      3: { solid: true, kind: "bounce" as const, bounce: 1.5 },
      4: { solid: true, kind: "spike" as const },
      5: { solid: true, oneWay: true, kind: "normal" as const }
    };

    const rawData = this.customLevelData ?? hitRunLevelData;
    const runnerSeed = this.getSeed() || 41873;
    this.levelPlan = SegmentGenerator.generatePlan(
      rawData.templates as SegmentTemplate[],
      rawData.grammar as string[],
      runnerSeed
    );

    syncLevelWorldDimensions(this.world, this.levelPlan, DEFAULT_ECHO_RUNNER_CONFIG);
    this.world.setResource("LevelPlan", this.levelPlan);
    this.world.setResource("PlayerStartPoint", { x: DEFAULT_BELT_PLAYER_SPAWN.x, y: DEFAULT_BELT_PLAYER_SPAWN.y });

    SegmentGenerator.instantiatePlan(this.world, this.levelPlan, DEFAULT_ECHO_RUNNER_CONFIG.TILE_SIZE, tileDefinitions);

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

    createMainCamera2D(this.world, playerEntity, {
      lookAheadX: 60,
      smoothingX: 5.0,
      smoothingY: 5.0,
      verticalDeadzone: 40
    });

    const gameConfig = this.world.getResource<{ viewportWidth?: number; viewportHeight?: number }>("GameConfig");
    this.installProceduralBackdrop(gameConfig?.viewportWidth ?? 800, gameConfig?.viewportHeight ?? 600);

    this.world.flush();
  }

  public override setInputState(input: Partial<HitAndRunInput>): void {
    mutateBeltInputState(this.getWorld(), input);
  }

  public initializeRenderer(
    renderer: Renderer<CoreComponentRegistry, RenderContext>
  ): void {
    if (renderer.type === "canvas") {
      renderer.registerBackgroundEffect("hit_run_procedural_backdrop", drawHitRunProceduralBackdrop);
      renderer.registerBackgroundEffect("hit_run_hud", drawHitRunHud);

      renderer.registerShape("player", drawHitRunPlayer);
      renderer.registerShape("popcorn", drawHitRunPopcorn);
      renderer.registerShape("wall_trooper", drawHitRunWallTrooper);
      renderer.registerShape("hopper", drawHitRunHopper);
      renderer.registerShape("charger", drawHitRunCharger);
      renderer.registerShape("elite", drawHitRunElite);

      renderer.registerShape("bullet_hmg", drawHitRunBullet);
      renderer.registerShape("bullet_shotgun", drawHitRunBullet);
      renderer.registerShape("bullet_rocket", drawHitRunRocket);
      renderer.registerShape("enemy_bullet", drawHitRunBullet);
      renderer.registerShape("arrow", drawHitRunBullet);
      renderer.registerShape("bolt", drawHitRunBullet);
      renderer.registerShape("fireball", drawHitRunBullet);

      renderer.registerShape("tilemap", drawPlatformerTilemap);
    } else if (renderer.type === "skia") {
      console.warn("[HitAndRunGame] Skia renderer is not implemented for hitandrun; falling back to canvas.");
    }
  }

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
