import { ArcadeGameAdapter, MiniGameResult, MiniGameRunContext } from "@tiny-aster/core";

/**
 * Base abstract class for ArcadeGameAdapter mini-game encounters.
 * Handles result callback tracking, event-based result emission, and lifecycle disposal.
 *
 * @public
 */
export abstract class BaseMiniGameEncounter<TGame = any> implements ArcadeGameAdapter {
  protected game: TGame | null = null;
  protected resultCallback: ((result: MiniGameResult) => void) | null = null;

  public abstract initialize(context: MiniGameRunContext, host: HTMLElement): void;

  public onResult(callback: (result: MiniGameResult) => void): void {
    this.resultCallback = callback;
  }

  /**
   * Hook for subclasses to supply game-specific metrics and secrets payload.
   */
  protected abstract buildResultPayload(
    context: MiniGameRunContext,
    payload?: any
  ): { metrics?: Record<string, number>; secretsFound?: string[] };

  public emitResult(context: MiniGameRunContext, payload?: any): void {
    if (!this.resultCallback) return;

    const score = payload?.score ?? (this.game as any)?.getScore?.() ?? 0;
    const completed = payload?.completed ?? (score >= (context.config.targetScore ?? 1000));
    const durationMs = payload?.durationMs ?? 60000;

    const extra = this.buildResultPayload(context, payload);

    const result: MiniGameResult = {
      runId: context.runId,
      gameId: context.gameId,
      score,
      completed,
      durationMs,
      metrics: extra.metrics ?? {},
      secretsFound: extra.secretsFound ?? []
    };

    this.resultCallback(result);
  }

  public dispose(): void {
    if (this.game) {
      if (typeof (this.game as any).destroy === "function") {
        (this.game as any).destroy();
      } else if (typeof (this.game as any).stop === "function") {
        (this.game as any).stop();
      }
      this.game = null;
    }
    this.resultCallback = null;
  }
}
