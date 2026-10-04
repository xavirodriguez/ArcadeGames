import { GameError } from "./GameError";
import { GameErrorReporter } from "./GameErrorReporter";

/**
 * Game error reporter implementation that outputs structured error context to console.error.
 * @public
 */
export class ConsoleGameErrorReporter implements GameErrorReporter {
  public report(error: GameError): void {
    const { context, error: err, timestamp } = error;
    const systemInfo = context.system ? ` [System: ${context.system}]` : "";
    const metaInfo = context.metadata ? ` | Meta: ${JSON.stringify(context.metadata)}` : "";
    const deployInfo =
      context.gitCommit || context.deploymentId || context.environment
        ? ` | Env: ${context.environment ?? "unknown"} (commit: ${context.gitCommit ?? "unknown"}, deploy: ${context.deploymentId ?? "unknown"})`
        : "";

    console.error(
      `[GameEngineError] [${new Date(timestamp).toISOString()}] [Game: ${context.gameId}] [Phase: ${context.phase}]${systemInfo} [Session: ${context.sessionId}] [Engine: v${context.engineVersion}]${deployInfo}${metaInfo}\n`,
      err
    );
  }
}
