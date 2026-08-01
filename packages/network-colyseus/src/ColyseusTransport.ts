import { NetworkTransport } from "@tiny-aster/core";
import { Client, Room } from "@colyseus/sdk";

/**
 * Network transport implementation using Colyseus.
 */
export class ColyseusTransport<
  TServerEvents extends Record<string, any> = Record<string, any>,
  TClientEvents extends Record<string, any> = Record<string, any>
> implements NetworkTransport<TServerEvents, TClientEvents> {
  public readonly isOffline = false;
  private client: Client | null = null;
  private room: Room | null = null;
  private messageHandlers = new Map<keyof TServerEvents, Set<(message: unknown) => void>>();

  /**
   * @param roomName - Default room name to join or create.
   * @param options - Connection options for Colyseus.
   */
  constructor(
    private readonly roomName: string = "game",
    private readonly options: Record<string, any> = {}
  ) {}

  /**
   * Establishes a connection to a remote server.
   * @param url - The server URL.
   */
  public async connect(url: string): Promise<void> {
    let connectionUrl = url;
    let targetRoom = this.roomName;

    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split("/").filter(Boolean);

      if (pathSegments.length > 0) {
        // Use the last segment as room name if present
        targetRoom = pathSegments[pathSegments.length - 1];

        // Strip the room name from the URL to get the base Colyseus server URL
        urlObj.pathname = pathSegments.slice(0, -1).join("/");
        connectionUrl = urlObj.toString().replace(/\/$/, "");
      }
    } catch {
      // Fallback to defaults if URL parsing fails
    }

    this.client = new Client(connectionUrl);
    this.room = await this.client.joinOrCreate(targetRoom, this.options);

    // Register a wildcard listener to dispatch messages to local handlers
    this.room.onMessage("*", (type, message) => {
      const typeStr = typeof type === "string" ? type : String(type);
      const handlers = this.messageHandlers.get(typeStr as keyof TServerEvents);
      if (handlers) {
        handlers.forEach((handler) => handler(message));
      }
    });
  }

  /**
   * Sends a message to the server.
   */
  public send<K extends keyof TClientEvents>(type: K, message: TClientEvents[K]): void {
    if (this.room) {
      this.room.send(type as string, message);
    }
  }

  /**
   * Registers a message handler.
   * Discards Colyseus' unsubscribe return to match NetworkTransport signature.
   */
  public onMessage<K extends keyof TServerEvents>(type: K, handler: (message: TServerEvents[K]) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler as (message: unknown) => void);
  }

  public disconnect(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.client = null;
    this.messageHandlers.clear();
  }

  public getRoom(): Room | null {
    return this.room;
  }
}
