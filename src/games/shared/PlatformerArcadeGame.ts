import {
  BaseGame,
  BaseGameConfig,
  ComponentRegistry,
  EventRegistry,
  BlueprintRegistryMap,
  RunState,
  CoreComponentRegistry,
  ConfigService,
  World
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
  levelDataOverride?: { templates: unknown[]; grammar: string[] }
): { baseConfig: TConfig; customLevelData?: { templates: any[]; grammar: string[] } } {
  const baseConfig = ConfigService.load<TConfig>(
    gameId,
    schema,
    gameOptions?.rawConfig ?? {}
  );
  const customLevelData = levelDataOverride ?? (gameOptions?.levelData as { templates: any[]; grammar: string[] } | undefined);
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
export abstract class PlatformerArcadeGame<
  TState = unknown,
  TInput extends object = Record<string, unknown>,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> extends BaseGame<TState, TInput, TComponents, TEvents, TBlueprints> {
  constructor(config: BaseGameConfig<TComponents, TEvents, TInput, TBlueprints> = {}) {
    super(config);
  }

  protected loadConfig<TConfig, TSchema extends z.ZodTypeAny = z.ZodTypeAny>(
    schema: TSchema,
    gameOptions?: Record<string, unknown>,
    levelDataOverride?: { templates: unknown[]; grammar: string[] }
  ): { baseConfig: TConfig; customLevelData?: { templates: unknown[]; grammar: string[] } } {
    return loadPlatformerArcadeConfig<TConfig, TSchema>(
      this.gameId,
      schema,
      gameOptions,
      levelDataOverride
    );
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
  }
}
