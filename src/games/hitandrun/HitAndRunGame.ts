/**
 * Hit&Run — fantasy belt-scroll beat'em-up (melee + ranged) on @tiny-aster/core.
 */
import {
  BaseGame,
  CoreComponentRegistry,
  EventRegistry,
  RenderContext,
  AssetLoader,
  WebAudioPlayer,
  Renderer,
  HealthComponent,
  RunState,
  SegmentTemplate,
  LevelPlan,
  preloadSharedAudioWithTimeout,
  generateBackdrop,
  BlueprintDefinition,
  Theme,
  World
} from "@tiny-aster/core";
import { updateRunProgress } from "@tiny-aster/gameplay-kit";
import { PlatformerArcadeGame } from "../shared/PlatformerArcadeGame";
import type { IAssetProvider } from "@tiny-aster/core";
import {
  createSamuraiAssetProvider,
  loadSamuraiSpritesheetAsset,
  SAMURAI_ASSET_KEY,
  SAMURAI_SPRITE_READY_RESOURCE
} from "./rendering/SamuraiVisualAssets";
import { registerHitRunSamuraiAnimationSystems } from "./rendering/SamuraiAnimationSystems";
import type {
  HitAndRunGameState,
  HitAndRunInput
} from "./types/HitAndRunTypes";
import {
  createMainCamera2D,
  registerPresentationSystems,
  generateAndInstantiatePlatformerLevel,
  registerPlatformerTilemapBlueprint,
  registerStandardPlatformerCollectibles,
} from "../shared/componentBuilders";
import { DEFAULT_HIT_AND_RUN_CONFIG } from "./types/HitAndRunConfigSchema";
import hitRunLevelData from "./levels/level-01.json";
import { registerHitRunMelee } from "./melee/registerHitRunMelee";
import { registerHitRunFeedback } from "./systems/registerHitRunFeedback";
import { registerHitRunHurt } from "./hurt/registerHitRunHurt";
import { registerHitRunWeapons } from "./weapons/registerHitRunWeapons";
import { registerHitRunWaves } from "./waves/registerHitRunWaves";
import { registerHitRunDeathFlow } from "./systems/HitRunDeathFlowSystem";
import { registerHitRunScoreSystem, HIT_RUN_SCORE_RESOURCE, type HitRunScoreState } from "./systems/HitRunScoreSystem";
import { registerBeltSystems } from "./belt/registerBeltSystems";
import {
  registerBeltPlayerBlueprint,
  DEFAULT_BELT_PLAYER_SPAWN
} from "./belt/registerBeltPlayerBlueprint";
import { mutateBeltInputState } from "./belt/mutateBeltInputState";
import { registerHitRunAI } from "./ai/registerHitRunAI";
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
  drawHitRunSamuraiFallback,
  drawHitRunBullet,
  drawHitRunRocket
} from "./rendering/HitRunCanvasVisuals";
import {
  drawHitRunMonoTilemap,
  drawHitRunMonoFragment,
  drawHitRunMonoCore,
} from "./rendering/HitRunPlaceholderVisuals";
import { drawHitRunHud } from "./rendering/HitRunHudCanvas";
import { drawHitRunDebugOverlay } from "./rendering/HitRunDebugOverlay";
import { createThemeFromGameAccents } from "../../theme/gameAccents";
import { runWithUnlockedRandomAndMutators } from "../shared/configHelper";
import { ThemeRegistry, resolveThemeIdFromConfig } from "./rendering/theme/ThemeRegistry";
import { storePreviousTransforms } from "./rendering/HitRunRenderInterpolation";

export interface HitAndRunConfig {
  seed?: number;
  gameOptions?: Record<string, unknown>;
  levelData?: { templates: SegmentTemplate[]; grammar: string[] };
  theme?: Theme;
  audio?: WebAudioPlayer;
  assetProvider?: IAssetProvider;
}

export type HitAndRunBlueprintMap = Record<
  string,
  BlueprintDefinition<CoreComponentRegistry, EventRegistry, unknown>
>;

function registerHitRunRenderers(
  renderer: Renderer<CoreComponentRegistry, RenderContext>
): void {
  renderer.registerBackgroundEffect("hit_run_procedural_backdrop", drawHitRunProceduralBackdrop);
  renderer.registerBackgroundEffect("hit_run_hud", drawHitRunHud);
  renderer.registerBackgroundEffect("hit_run_debug_overlay", drawHitRunDebugOverlay);

  renderer.registerShape("player", drawHitRunPlayer);
  renderer.registerShape("popcorn", drawHitRunPopcorn);
  renderer.registerShape("wall_trooper", drawHitRunWallTrooper);
  renderer.registerShape("hopper", drawHitRunHopper);
  renderer.registerShape("charger", drawHitRunCharger);
  renderer.registerShape("elite", drawHitRunElite);
  renderer.registerShape("samurai", drawHitRunSamuraiFallback);

  renderer.registerShape("bullet_hmg", drawHitRunBullet);
  renderer.registerShape("bullet_shotgun", drawHitRunBullet);
  renderer.registerShape("bullet_rocket", drawHitRunRocket);
  renderer.registerShape("enemy_bullet", drawHitRunBullet);
  renderer.registerShape("arrow", drawHitRunBullet);
  renderer.registerShape("bolt", drawHitRunBullet);
  renderer.registerShape("fireball", drawHitRunBullet);

  // Monochrome placeholders so SegmentGenerator spawns are visible (diagnostics).
  renderer.registerShape("tilemap", drawHitRunMonoTilemap);
  renderer.registerShape("fragment", drawHitRunMonoFragment);
  renderer.registerShape("core", drawHitRunMonoCore);
}

export class HitAndRunGame extends BaseGame<
  HitAndRunGameState,
  HitAndRunInput,
  CoreComponentRegistry,
  EventRegistry,
  HitAndRunBlueprintMap
> {
  public readonly gameId = "hitandrun";
  private gameOver = false;
  private levelPlan!: LevelPlan;
  private customLevelData?: { templates: SegmentTemplate[]; grammar: string[] };
  private readonly samuraiAssetLoader: AssetLoader;

  constructor(config: HitAndRunConfig = {}) {
    super({
      seed: config.seed,
      gameOptions: config.gameOptions,
      theme: config.theme ?? createThemeFromGameAccents("hitandrun"),
      audio: config.audio || new WebAudioPlayer(),
      assetProvider: config.assetProvider,
    });
    this.samuraiAssetLoader = new AssetLoader();
    if (config.levelData) {
      this.customLevelData = config.levelData;
    }
  }

  protected override async onRegisterSystems(): Promise<void> {
    await super.onRegisterSystems();

    this.setupCommonArcadeResources();
    this.world.deleteResource("IsPaused");

    const runState: RunState = {
      attempt: 1,
      lives: 3,
      activeCheckpoint: null,
      elapsedTime: 0,
      deaths: 0,
      collectedPermanentIds: [],
      collectedTemporalIds: []
    };
    this.world.setResource("RunState", runState);
    this.world.setResource("AudioPlayer", this.audio);

    registerBeltSystems(this.world);
    registerHitRunAI(this.world);
    registerHitRunFeedback(this.world);
    registerHitRunHurt(this.world);
    registerHitRunMelee(this.world);
    registerHitRunWeapons(this.world);
    registerHitRunWaves(this.world, {
      defaultSpawnX: 350,
      defaultSpawnY: 400
    });
    registerHitRunDeathFlow(this.world);
    registerHitRunScoreSystem(this.world);

    this.world.setResource(COMBO_MELEE_CONFIG_RESOURCE, {
      ...DEFAULT_COMBO_MELEE_CONFIG
    });

    registerPresentationSystems(this.world);
    registerHitRunSamuraiAnimationSystems(this.world);
  }

  public getLevelPlan(): LevelPlan {
    return this.levelPlan;
  }

  protected override async onInitializeEntities(): Promise<void> {
    runWithUnlockedRandomAndMutators(this.world, this._config.gameOptions, () => {
      registerBeltPlayerBlueprint(this.blueprints);

      // Required by SegmentGenerator.instantiatePlan — without these, tilemap +
      // collectible spawn points are skipped with console warnings.
      registerPlatformerTilemapBlueprint(this.blueprints, DEFAULT_HIT_AND_RUN_CONFIG);
      registerStandardPlatformerCollectibles(this.blueprints);
      console.info(
        "[HitAndRun/diag] Registered blueprints: tilemap, collectible_fragment, collectible_core"
      );

      this.levelPlan = generateAndInstantiatePlatformerLevel(
        this.world,
        this.customLevelData,
        hitRunLevelData,
        this.getSeed() || 41873,
        DEFAULT_HIT_AND_RUN_CONFIG,
        DEFAULT_BELT_PLAYER_SPAWN
      );

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
    });
  }

  public override setInputState(input: Partial<HitAndRunInput>): void {
    mutateBeltInputState(this.getWorld(), input);
  }

  public initializeRenderer(
    renderer: Renderer<CoreComponentRegistry, RenderContext>
  ): void {
    if (renderer.type === "canvas" || renderer.type === "skia") {
      registerHitRunRenderers(renderer);
      if (renderer.type === "skia") {
        console.info(
          "[HitAndRunGame] Skia: using canvas-compatible drawers (Phase 4 parity)."
        );
      }
    }
  }

  public getGameState(): HitAndRunGameState {
    const rs = this.world.getResource<RunState>("RunState");
    const wave = this.world.getResource<WaveDirectorState>(WAVE_DIRECTOR_RESOURCE);
    const script = this.world.getResource<WaveScript>(WAVE_SCRIPT_RESOURCE);
    const scoreState = this.world.getResource<HitRunScoreState>(HIT_RUN_SCORE_RESOURCE);
    const players = this.world.query("BeltInput", "Health");
    const player = players[0];
    const health =
      player !== undefined
        ? (this.world.getComponent(player, "Health") as HealthComponent | undefined)
        : undefined;
    const weapon =
      player !== undefined
        ? (this.world.getComponent(player, "HitRunWeapon") as HitRunWeaponState | undefined)
        : undefined;

    return {
      type: "HitAndRunGameState",
      score: scoreState?.score ?? 0,
      lives: rs?.lives ?? 3,
      isGameOver: this.gameOver,
      waveIndex: wave?.waveIndex ?? 0,
      weaponId: weapon?.weaponId ?? "longbow",
      health: health?.current ?? 0,
      maxHealth: health?.max ?? 0,
    };
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }

  protected installProceduralBackdrop(width: number, height: number): void {
    const theme = HIT_RUN_BACKDROP_THEME;
    const spec = generateBackdrop(width, height, theme as never);
    this.world.setResource(HIT_RUN_BACKDROP_RESOURCE, spec);
    this.world.setResource("BackgroundEffect", "hit_run_procedural_backdrop");
  }

  public override update(dt: number): void {
    storePreviousTransforms(this.world);
    super.update(dt);
  }

  protected override async onPreloadAssets(): Promise<void> {
    if (this.audio) {
      await preloadSharedAudioWithTimeout(this.audio);
    }
  }
}

export const HitAndRunDefinition = {
  name: "hitandrun",
  createSimulation: (seed: number) => {
    const game = new HitAndRunGame({ seed });
    return game;
  },
  inputSchema: {
    actions: ["jump", "attack", "dash", "switchWeapon"],
    axes: ["moveX", "moveY"],
  },
  assets: {
    sprites: [],
    sounds: []
  }
};

export type { HitAndRunGameState, HitAndRunInput };
