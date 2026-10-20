import { MiniGameResult, MiniGameRunContext } from "@tiny-aster/core";
import { BaseArcadeAdapter } from "../shared/story/adapters/BaseArcadeAdapter";
import { GalaxianGame } from "./GalaxianGame";

export class GalaxianArcadeAdapter extends BaseArcadeAdapter<GalaxianGame> {
  protected createGame(context: MiniGameRunContext): GalaxianGame {
    return new GalaxianGame({
      gameId: context.gameId ?? "galaxian",
      seed: context.seed,
      headless: false,
      gameOptions: context.config as Record<string, unknown>,
    });
  }

  protected buildResult(context: MiniGameRunContext, payload?: Record<string, unknown>): MiniGameResult {
    const gameState = this.game?.getGameState();
    const base = this.buildBaseEncounterResult(context, payload, 1000, 30000);

    return {
      runId: context.runId,
      gameId: context.gameId,
      score: payload?.score !== undefined ? (payload.score as number) : (gameState?.score ?? base.score),
      completed: base.completed,
      durationMs: base.durationMs,
      metrics: {
        livesRemaining: gameState?.lives ?? 0,
        level: gameState?.level ?? 1,
      },
      secretsFound: base.secretsFound,
    };
  }
}
