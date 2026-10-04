import { GameError } from "./GameError";
import { GameErrorReporter } from "./GameErrorReporter";

/**
 * Composite reporter that dispatches errors to multiple underlying GameErrorReporter instances.
 * Ensures that if one reporter throws an exception, other reporters still receive the error
 * and the main execution flow is not disrupted.
 */
export class CompositeGameErrorReporter implements GameErrorReporter {
  private readonly reporters: GameErrorReporter[];

  constructor(reporters: GameErrorReporter[] = []) {
    this.reporters = [...reporters];
  }

  public addReporter(reporter: GameErrorReporter): void {
    this.reporters.push(reporter);
  }

  public report(error: GameError): void {
    for (const reporter of this.reporters) {
      try {
        reporter.report(error);
      } catch (reporterError) {
        try {
          console.error("[CompositeGameErrorReporter] Inner reporter failed:", reporterError);
        } catch {
          // Ignore console output failure
        }
      }
    }
  }
}
