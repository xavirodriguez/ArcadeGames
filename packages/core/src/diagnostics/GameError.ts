/**
 * Execution phase during which a game error occurred.
 * @public
 */
export type GameErrorPhase =
  | "registration"
  | "initialization"
  | "update"
  | "render"
  | "shutdown"
  | "audio"
  | "input";

/**
 * Diagnostic context metadata capturing game state and runtime environment when an error occurs.
 * @public
 */
export interface GameErrorContext {
  readonly gameId: string;
  readonly engineVersion: string;
  readonly sessionId: string;
  readonly phase: GameErrorPhase;
  readonly system?: string;
  readonly entityId?: number;
  readonly component?: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
  readonly gitCommit?: string;
  readonly deploymentId?: string;
  readonly environment?: string;
}

/**
 * Normalized game error payload containing timestamp, original Error instance, and diagnostic context.
 * @public
 */
export interface GameError {
  readonly timestamp: number;
  readonly error: Error;
  readonly context: GameErrorContext;
}

/**
 * Engine version constant for error telemetry.
 * @public
 */
export const ENGINE_VERSION = "1.0.0";
