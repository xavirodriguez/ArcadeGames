/**
 * Hit&Run — Metal Slug arcade run-and-gun brawler on @tiny-aster/core.
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
  TTLSystem,
  EntityBuilder,
  ShapeType,
  BoxShape,
  Theme,
  resolveThemeColor,
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
import {
  registerPlatformerEnemyBlueprints,
  registerPlatformerEnvironmentBlueprints,
  mutatePlatformerInputState,
  registerCommonPlatformerSystems
} from "@tiny-aster/gameplay-kit";
import {
  setupPlatformerMovementComponents,
  registerPlatformerTilemapBlueprint,
  createMainCamera2D,
  syncLevelWorldDimensions
} from "../shared/componentBuilders";
import { DEFAULT_ECHO_RUNNER_CONFIG } from "../echorunner/types/EchoRunnerConfigSchema";
import hitRunLevelData from "./levels/level-01.json";
import { registerHitRunMelee } from "./melee/registerHitRunMelee";
import { registerHitRunFeedback } from "./systems/registerHitRunFeedback";
import { registerHitRunHurt } from "./hurt/registerHitRunHurt";
import { registerHitRunWeapons } from "./weapons/registerHitRunWeapons";
import { registerHitRunWaves } from "./waves/registerHitRunWaves";
import { registerHitRunAI } from "./ai/registerHitRunAI";
import { registerHitRunDeathFlow } from "./systems/HitRunDeathFlowSystem";
import { registerHitRunCameraScroll } from "./systems/HitRunCameraScrollSystem";
import { HitRunPlayerControllerSystem } from "./systems/HitRunPlayerControllerSystem";
import { registerPowBlueprint } from "./pow/registerPowBlueprint";
import { HitRunPowSystem } from "./pow/HitRunPowSystem";
import { createMeleeAttackComponent } from "./melee/HitRunMeleeSystem";
import { createWeaponState } from "./weapons/HitRunWeaponCatalog";
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
import { HIT_RUN_BACKDROP_RESOURCE, drawHitRunBackdrop } from "./rendering/HitRunBackdropCanvas";
import { drawHitRunHud } from "./rendering/HitRunHudCanvas";
import {
  drawHitRunPlayer,
  drawHitRunPopcorn,
  drawHitRunWallTrooper,
  drawHitRunHopper,
  drawHitRunCharger,
  drawHitRunElite,
  drawHitRunBullet,
  drawHitRunRocket,
  drawHitRunPow
} from "./rendering/HitRunCanvasVisuals";

export type HitAndRunConfig = EchoRunnerConfig;

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

    registerCommonPlatformerSystems(this.world);

    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new HitRunPlayerControllerSystem(), { phase: SystemPhase.Simulation, priority: 2 });
    this.world.addSystem(new HitRunPowSystem(), { phase: SystemPhase.Simulation, priority: 3 });

    registerHitRunCameraScroll(this.world);
    registerHitRunFeedback(this.world);
    registerHitRunHurt(this.world);
    registerHitRunMelee(this.world);
    registerHitRunWeapons(this.world);
    registerHitRunWaves(this.world);
    registerHitRunAI(this.world);
    registerHitRunDeathFlow(this.world);

    this.world.setResource(COMBO_MELEE_CONFIG_RESOURCE, {
      ...DEFAULT_COMBO_MELEE_CONFIG
    });
  }

  protected override async onInitializeEntities(): Promise<void> {
    registerPlatformerTilemapBlueprint(this.blueprints, DEFAULT_ECHO_RUNNER_CONFIG);
    registerPlatformerEnvironmentBlueprints(this.blueprints);
    registerPlatformerEnemyBlueprints(this.blueprints);
    registerPowBlueprint(this.blueprints);

    // Register level blueprints
    const templates = (this.customLevelData?.templates ?? hitRunLevelData.templates) as SegmentTemplate[];
    const grammar = this.customLevelData?.grammar ?? hitRunLevelData.grammar;
    const seed = this.getSeed() || 12345;

    this.levelPlan = SegmentGenerator.generatePlan(templates, grammar, seed);

    const tileDefinitions = {
      1: { solid: true },
      5: { solid: true }
    };

    SegmentGenerator.instantiatePlan(this.world, this.levelPlan, DEFAULT_ECHO_RUNNER_CONFIG.TILE_SIZE, tileDefinitions);
    syncLevelWorldDimensions(this.world, this.levelPlan, DEFAULT_ECHO_RUNNER_CONFIG);

    this.blueprints.register("player", {
      spawn: (world, entity, args: { x?: number; y?: number; weaponId?: string }) => {
        const theme = world.getResource<Theme>("Theme");
        const assetKey = theme?.spriteMap["player"] ?? "player_sprite";
        const tint = resolveThemeColor(world, "player");

        const x = args.x ?? 100;
        const y = args.y ?? 300;

        EntityBuilder.fromEntity(world, entity)
          .withTransform({ x, y })
          .withVelocity()
          .withCollider({ shape: { type: ShapeType.Box, width: 20, height: 32 } as BoxShape })
          .withRender({ shape: "player", size: 28, color: tint, order: 2 });

        world.addComponent(entity, { type: "Health", current: 5, max: 5 } as HealthComponent);
        world.addComponent(entity, { type: "Tag", tags: ["TileCollider", "Player"] });
        world.addComponent(entity, { type: "Sprite", assetKey, anchor: { x: 0.5, y: 0.5 } });
        world.addComponent(entity, { type: "Faction", value: "player" });

        const config = world.getResource<import("../shared/componentBuilders").CommonPlatformerConfig>("GameConfig") || DEFAULT_ECHO_RUNNER_CONFIG;
        setupPlatformerMovementComponents(world, entity, config);

        world.addComponent(entity, {
          type: "PlatformerInput",
          moveDir: 0,
          jumpPressed: false,
          jumpHeld: false,
          jumpReleased: false,
          fireHeld: false,
          firePressed: false,
          attackPressed: false
        } as unknown as CoreComponentRegistry[Extract<keyof CoreComponentRegistry, string>]);

        world.addComponent(entity, createMeleeAttackComponent());
        world.addComponent(entity, createWeaponState(args.weaponId ?? "hmg"));
      }
    });

    const playerEntity = this.world.createEntity();
    const playerBp = this.blueprints.get("player");
    if (playerBp) {
      playerBp.spawn(this.world, playerEntity, {
        x: 100,
        y: 300
      });
    } else {
      throw new Error("[HitAndRunGame] Blueprint 'player' is not registered.");
    }

    createMainCamera2D(this.world, playerEntity, {
      zoom: 1.0
    });

    this.world.flush();
  }

  public override setInputState(input: Partial<HitAndRunInput>): void {
    mutatePlatformerInputState(this.getWorld(), input);
  }

  public initializeRenderer(
    renderer: Renderer<CoreComponentRegistry, RenderContext>
  ): void {
    if (renderer.type !== "canvas") return;

    this.installProceduralBackdrop(800, 600);
    renderer.registerBackgroundEffect("hitrun_backdrop", drawHitRunBackdrop);

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
    renderer.registerShape("pow", drawHitRunPow);

    renderer.registerBackgroundEffect("hitrun_hud", drawHitRunHud);
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
