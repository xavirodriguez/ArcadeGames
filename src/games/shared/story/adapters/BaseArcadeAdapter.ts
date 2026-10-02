import {
  ArcadeGameAdapter,
  MiniGameResult,
  MiniGameRunContext,
  BaseGame
} from "@tiny-aster/core";
import { applyStandardEncounterModifiers } from "../helpers/encounterHelpers";

type AnyBaseGame = BaseGame<any, any, any, any, any>;

/**
 * Abstract base class for ArcadeGameAdapter implementations in story/campaign encounters.
 * Encapsulates minigame initialization, modifier application, completion listener binding, and teardown.
 *
 * @typeParam TGame - The BaseGame subclass type managed by this adapter.
 * @public
 */
export abstract class BaseArcadeAdapter<TGame extends AnyBaseGame = AnyBaseGame> implements ArcadeGameAdapter {
  protected game: TGame | null = null;
  protected resultCallback: ((result: MiniGameResult) => void) | null = null;

  /**
   * Factory method implemented by subclasses to construct the minigame instance.
   *
   * @param context - The execution context containing seed and game options.
   * @returns New instance of TGame.
   */
  protected abstract createGame(context: MiniGameRunContext): TGame;

  /**
   * Formatting method implemented by subclasses to build the MiniGameResult payload.
   *
   * @param context - The run context.
   * @param payload - Optional event payload from game completion events.
   * @returns Formatted MiniGameResult.
   */
  protected abstract buildResult(context: MiniGameRunContext, payload?: unknown): MiniGameResult;

  /**
   * Custom hook to apply narrative modifiers to the game instance.
   *
   * @param game - The instantiated minigame.
   * @param context - The run context containing modifiers.
   */
  protected applyModifiers(game: TGame, context: MiniGameRunContext): void {
    applyStandardEncounterModifiers(game, context);
    const targetGame = game as Record<string, unknown>;
    for (const modifier of context.modifiers) {
      if (typeof modifier.targetProperty === "string" && modifier.value !== undefined) {
        targetGame[modifier.targetProperty] = modifier.value;
      }
    }
  }

  public initialize(context: MiniGameRunContext, _host: HTMLElement): void {
    const game = this.createGame(context);
    this.game = game;

    this.applyModifiers(game, context);

    game.start();

    const eventBus = game.getEventBus();
    if (eventBus) {
      const handleCompletion = (payload: unknown) => this.emitResult(context, payload);
      eventBus.on("game:over" as never, handleCompletion);
      eventBus.on("level:completed" as never, handleCompletion);
      eventBus.on("match:completed" as never, handleCompletion);
    }
  }

  public onResult(callback: (result: MiniGameResult) => void): void {
    this.resultCallback = callback;
  }

  public emitResult(context: MiniGameRunContext, payload?: unknown): void {
    if (!this.resultCallback) return;
    const result = this.buildResult(context, payload);
    this.resultCallback(result);
  }

  public dispose(): void {
    if (this.game) {
      this.game.destroy();
      this.game = null;
    }
    this.resultCallback = null;
  }

  protected buildRunnerResult(
    context: MiniGameRunContext,
    secretId: string,
    payload?: Record<string, unknown>
  ): MiniGameResult {
    const score = (payload?.score as number | undefined) ?? this.game?.getGameState()?.score ?? 0;
    const completed = (payload?.completed as boolean | undefined) ?? (score >= (context.config.targetScore ?? 1500));
    const durationMs = (payload?.durationMs as number | undefined) ?? 35000;
    const collisions = (payload?.collisions as number | undefined) ?? 0;
    const distanceCovered = (payload?.distanceCovered as number | undefined) ?? 0;
    const secretsFound: string[] = Array.isArray(payload?.secretsFound)
      ? (payload.secretsFound as string[])
      : [];

    if (payload?.foundMemoryFragment) {
      secretsFound.push(secretId);
    }

    return {
      runId: context.runId,
      gameId: context.gameId,
      score,
      completed,
      durationMs,
      metrics: {
        collisions,
        distanceCovered
      },
      secretsFound
    };
  }
}
