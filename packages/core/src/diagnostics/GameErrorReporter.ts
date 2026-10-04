import { GameError } from "./GameError";

/**
 * Interface for capturing and reporting game engine errors.
 * Implementations can log to console, send remote telemetry, or store errors locally.
 */
export interface GameErrorReporter {
  report(error: GameError): void;
}
