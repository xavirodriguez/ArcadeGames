import { NetworkTransport } from "./NetworkTransport";

/**
 * A no-op implementation of NetworkTransport for offline mode.
 *
 * @remarks
 * This implementation allows the game to function in a disconnected state
 * without requiring a real network connection or throwing errors.
 * @public
 */
export class NullTransport<
  TServerEvents extends Record<string, unknown> = Record<string, unknown>,
  TClientEvents extends Record<string, unknown> = Record<string, unknown>
> implements NetworkTransport<TServerEvents, TClientEvents> {
  public readonly isOffline = true;
  /**
   * Immediately resolves without establishing a connection.
   */
  public async connect(_url: string): Promise<void> {
    return Promise.resolve();
  }

  /**
   * No-op: messages are not sent.
   */
  public send<K extends keyof TClientEvents>(_type: K, _message: TClientEvents[K]): void {
    // No-op
  }

  /**
   * No-op: no messages will ever be received.
   */
  public onMessage<K extends keyof TServerEvents>(_type: K, _handler: (message: TServerEvents[K]) => void): void {
    // No-op
  }

  /**
   * No-op: nothing to disconnect.
   */
  public disconnect(): void {
    // No-op
  }
}
