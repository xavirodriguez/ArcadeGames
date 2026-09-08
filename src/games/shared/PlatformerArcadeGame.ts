import {
  BaseGame,
  BaseGameConfig,
  ComponentRegistry,
  EventRegistry,
  BlueprintRegistryMap,
  RunState
} from "@tiny-aster/core";

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

  /**
   * Common system registration setup for platformer games.
   * Initializes screen resources, death plane Y boundary, RunState, and AudioPlayer resource.
   */
  protected override async onRegisterSystems(): Promise<void> {
    await super.onRegisterSystems();

    this.setupCommonArcadeResources();
    this.world.setResource("DeathPlaneY", 650);

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
