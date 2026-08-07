/**
 * Interface for network transport implementations.
 *
 * @remarks
 * Defines the contract for sending and receiving messages over the network.
 * Implementations are responsible for platform-specific socket logic,
 * connection management, and message serialization.
 * @public
 */
export interface NetworkTransport<
  TServerEvents extends Record<string, unknown> = Record<string, unknown>,
  TClientEvents extends Record<string, unknown> = Record<string, unknown>
> {
    readonly isOffline: boolean;
    /**
     * Establishes a connection to a remote server.
     */
    connect(url: string): Promise<void>;
    send<K extends keyof TClientEvents>(type: K, message: TClientEvents[K]): void;
    onMessage<K extends keyof TServerEvents>(type: K, handler: (message: TServerEvents[K]) => void): void;
    disconnect(): void;
}
