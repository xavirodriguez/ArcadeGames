import {
  BaseGame,
  BaseGameConfig,
  ComponentRegistry,
  EventRegistry,
  BlueprintRegistryMap,
  RunState,
  CoreComponentRegistry,
  ConfigService,
  World,
  SegmentTemplate
} from "@tiny-aster/core";
import { z } from "zod";

/**
 * Loads and initializes base arcade game configuration and level data.
 * @public
 */
export function loadPlatformerArcadeConfig<TConfig, TSchema extends z.ZodTypeAny = z.ZodTypeAny>(
  gameId: string,
  schema: TSchema,
  gameOptions?: Record<string, unknown>,
  levelDataOverride?: { templates: SegmentTemplate[]; grammar: string[] }
): { baseConfig: TConfig; customLevelData?: { templates: SegmentTemplate[]; grammar: string[] } } {
  const baseConfig = ConfigService.load<TConfig>(
    gameId,
    schema,
    gameOptions?.rawConfig ?? {}
  );
  const customLevelData = levelDataOverride ?? (gameOptions?.levelData as { templates: SegmentTemplate[]; grammar: string[] } | undefined);
  return { baseConfig, customLevelData };
}
import { updateRunProgress } from "@tiny-aster/gameplay-kit";

/**
 * Abstract base class for platformer and runner minigames sharing common arcade resource setup.
 *
 * @typeParam TState - Representation of the game state payload.
 * @typeParam TInput - Dictionary structure representing user inputs.
 * @typeParam TComponents - Registry of components available in this game.
 * @typeParam TEvents - Registry of events that can be emitted.
 * @typeParam TBlueprints - Registry of blueprints that can be spawned.
 *
 * @public
 */
export const DEFAULT_PLATFORMER_TILE_DEFINITIONS = {
  1: { solid: true, kind: "normal" as const },
  2: { solid: true, kind: "ice" as const },
  3: { solid: true, kind: "bounce" as const, bounce: 1.2 },
  4: { solid: true, kind: "spike" as const },
  5: { solid: true, oneWay: true, kind: "normal" as const }
};

export function setupArcadeRunState(world: World<any>, audio?: unknown): RunState {
  const runState: RunState = {
    attempt: 1,
    lives: 3,
    activeCheckpoint: null,
    elapsedTime: 0,
    deaths: 0,
    collectedPermanentIds: [],
    collectedTemporalIds: []
  };
  world.setResource("RunState", runState);
  if (audio) {
    world.setResource("AudioPlayer", audio);
  }
  return runState;
}

export abstract class PlatformerArcadeGame<
  TState = unknown,
  TInput extends object = Record<string, unknown>,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>,
  TConfig = unknown
> extends BaseGame<TState, TInput, TComponents, TEvents, TBlueprints> {
  protected baseConfig!: TConfig;
  protected config!: TConfig;
  protected customLevelData?: { templates: SegmentTemplate[]; grammar: string[] };

  constructor(config: BaseGameConfig<TComponents, TEvents, TInput, TBlueprints> = {}) {
    super(config);
  }

  protected loadConfig<TConfigData, TSchema extends z.ZodTypeAny = z.ZodTypeAny>(
    schema: TSchema,
    gameOptions?: Record<string, unknown>,
    levelDataOverride?: { templates: SegmentTemplate[]; grammar: string[] }
  ): { baseConfig: TConfigData; customLevelData?: { templates: SegmentTemplate[]; grammar: string[] } } {
    return loadPlatformerArcadeConfig<TConfigData, TSchema>(
      this.gameId,
      schema,
      gameOptions,
      levelDataOverride
    );
  }

  protected initPlatformerConfig<TConfigData extends TConfig = TConfig>(
    schema: z.ZodTypeAny,
    gameOptions?: Record<string, unknown>,
    levelDataOverride?: { templates: SegmentTemplate[]; grammar: string[] }
  ): TConfigData {
    const { baseConfig, customLevelData } = loadPlatformerArcadeConfig<TConfigData>(
      this.gameId,
      schema,
      gameOptions,
      levelDataOverride
    );
    this.baseConfig = baseConfig as never as TConfig;
    this.config = baseConfig as never as TConfig;
    this.customLevelData = customLevelData;
    return baseConfig;
  }

  /**
   * Common system registration setup for platformer games.
   * Initializes screen resources, death plane Y boundary, RunState, and AudioPlayer resource.
   */
  /**
   * Helper to check run progress and emit `game:over` if completed.
   */
  protected checkRunProgressGameOver(
    dt: number,
    currentlyGameOver: boolean,
    predicate: (rs: RunState) => boolean = (rs) => rs.collectedPermanentIds.includes("archive_core_1")
  ): boolean {
    const isComplete = updateRunProgress(this.world as unknown as World<CoreComponentRegistry>, dt, predicate);
    if (isComplete && !currentlyGameOver) {
      (this.eventBus as unknown as { emit: (event: string, payload: unknown) => void }).emit("game:over", {
        state: this.getGameState()
      });
      return true;
    }
    return currentlyGameOver;
  }

  protected override async onRegisterSystems(): Promise<void> {
    await super.onRegisterSystems();

    this.setupCommonArcadeResources();
    this.world.setResource("DeathPlaneY", 650);
    this.world.deleteResource("IsPaused");

    setupArcadeRunState(this.world, this.audio);
  }
}
