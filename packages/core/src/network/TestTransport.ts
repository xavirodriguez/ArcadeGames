import { NetworkTransport } from "./NetworkTransport";

/**
 * A test implementation of NetworkTransport that allows simulating
 * network delay (latency) and packet loss for adverse condition testing.
 *
 * @public
 */
export class TestTransport<
  TServerEvents extends Record<string, unknown> = Record<string, unknown>,
  TClientEvents extends Record<string, unknown> = Record<string, unknown>
> implements NetworkTransport<TServerEvents, TClientEvents> {
  public readonly isOffline = false;
  public latencyMs = 0;
  public packetLossRate = 0; // range [0, 1]

  private messageHandlers: Partial<{ [K in keyof TServerEvents]: ((message: TServerEvents[K]) => void)[] }> = {};
  public sentMessages: { type: keyof TClientEvents; message: unknown; timestamp: number }[] = [];

  public async connect(_url: string): Promise<void> {
    return Promise.resolve();
  }

  public send<K extends keyof TClientEvents>(type: K, message: TClientEvents[K]): void {
    if (this.packetLossRate > 0 && Math.random() < this.packetLossRate) {
      return; // simulate packet loss
    }
    this.sentMessages.push({ type, message, timestamp: Date.now() });
  }

  public onMessage<K extends keyof TServerEvents>(type: K, handler: (message: TServerEvents[K]) => void): void {
    if (!this.messageHandlers[type]) {
      this.messageHandlers[type] = [];
    }
    this.messageHandlers[type]!.push(handler);
  }

  public simulateServerMessage<K extends keyof TServerEvents>(
    type: K,
    message: TServerEvents[K],
    delayMs = this.latencyMs
  ): void {
    if (delayMs <= 0) {
      this.deliverMessage(type, message);
    } else {
      setTimeout(() => {
        this.deliverMessage(type, message);
      }, delayMs);
    }
  }

  private deliverMessage<K extends keyof TServerEvents>(type: K, message: TServerEvents[K]): void {
    const handlers = this.messageHandlers[type];
    if (handlers) {
      handlers.forEach((h) => h(message));
    }
  }

  public disconnect(): void {
    this.messageHandlers = {};
  }
}
