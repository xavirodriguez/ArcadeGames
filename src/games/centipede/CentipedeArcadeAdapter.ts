import { MiniGameEncounter, MiniGameResult, MiniGameRunContext } from "@tiny-aster/core";
import { BaseArcadeAdapter } from "../shared/story/adapters/BaseArcadeAdapter";
import { CentipedeGame } from "./CentipedeGame";

export const CENTIPEDE_ENCOUNTER_ID = "centipede_encounter_01";

export const centipedeEncounter: MiniGameEncounter = {
  id: CENTIPEDE_ENCOUNTER_ID,
  gameId: "centipede",
  baseConfig: {
    difficulty: "normal",
    targetScore: 1000
  },
  modifierRules: [],
  outcomeRules: [
    {
      id: "rule_success",
      priority: 10,
      condition: {
        field: "completed",
        operator: "==",
        value: true
      },
      effects: [
        {
          type: "setFlag",
          key: "centipedeForestCleared",
          value: true
        }
      ]
    }
  ]
};

export class CentipedeArcadeAdapter extends BaseArcadeAdapter<CentipedeGame> {
  protected createGame(context: MiniGameRunContext): CentipedeGame {
    return new CentipedeGame({ seed: context.seed, headless: true });
  }

  protected buildResult(context: MiniGameRunContext, payload?: Record<string, unknown>): MiniGameResult {
    const score = (payload?.score as number | undefined) ?? this.game?.getGameState?.()?.score ?? 0;
    const completed = (payload?.completed as boolean | undefined) ?? (score >= (context.config.targetScore ?? 1000));
    const durationMs = (payload?.durationMs as number | undefined) ?? 30000;
    const segmentsDestroyed = (payload?.segmentsDestroyed as number | undefined) ?? Math.floor(score / 50);
    const secretsFound: string[] = Array.isArray(payload?.secretsFound) ? (payload.secretsFound as string[]) : [];

    return {
      runId: context.runId,
      gameId: context.gameId,
      score,
      completed,
      durationMs,
      metrics: {
        segmentsDestroyed
      },
      secretsFound
    };
  }
}
