import { MiniGameResult, MiniGameRunContext } from "./ArcadeIntegrationTypes";

/**
 * Abstraction adapter bridging a concrete retro game engine instance to the Arcade Orchestrator.
 *
 * @remarks
 * Encapsulates game lifecycle management: initialization, receiving run contexts, mounting on host element,
 * emitting results, and clean resource teardown.
 *
 * @public
 */
export interface ArcadeGameAdapter {
  /**
   * Initializes the game instance with run context and host element.
   *
   * @param context - MiniGameRunContext containing configuration and active modifiers.
   * @param host - DOM element or canvas container where game visuals mount.
   */
  initialize(context: MiniGameRunContext, host: HTMLElement): Promise<void> | void;

  /**
   * Registers callback to emit MiniGameResult upon game session completion or termination.
   *
   * @param callback - Function invoked with final MiniGameResult payload.
   */
  onResult(callback: (result: MiniGameResult) => void): void;

  /**
   * Cleans up all simulation loops, event listeners, canvas assets, and audio instances.
   */
  dispose(): void;
}
