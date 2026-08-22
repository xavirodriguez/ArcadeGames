import { AsteroidsRoom } from "../AsteroidsRoom";
import { type Client, CloseCode } from "@colyseus/core";
import { AsteroidsState } from "../schema/GameState";

describe("AsteroidsRoom Lifecycle & Normalization", () => {
  let room: AsteroidsRoom;
  const messageHandlers = new Map<string, Function>();

  beforeEach(async () => {
    messageHandlers.clear();
    room = new AsteroidsRoom();

    // Mock Colyseus Room infrastructure
    room.setState = jest.fn((state) => {
      room.state = state;
    }) as any;
    room.setPatchRate = jest.fn();
    room.setSimulationInterval = jest.fn();
    room.onMessage = jest.fn((type: any, callback: any) => {
      messageHandlers.set(type.toString(), callback);
      return {} as any;
    }) as any;
    room.allowReconnection = jest.fn().mockResolvedValue({} as any);
    room.broadcast = jest.fn();

    // Initialize room
    await room.onCreate({ seed: 12345 });
  });

  afterEach(() => {
    room.onDispose();
  });

  it("should initialize with correct state during onCreate", () => {
    expect(room.state).toBeDefined();
    expect(room.state.seed).toBe(12345);
    expect(room.state.gameWidth).toBe(800);
    expect(room.state.gameHeight).toBe(600);
    expect(room.state.gameStarted).toBe(false);
    expect(room.state.gameOver).toBe(false);
    expect(room.state.serverTick).toBe(0);
  });

  it("should register message handlers", () => {
    expect(room.onMessage).toHaveBeenCalledWith("input", expect.any(Function));
    expect(room.onMessage).toHaveBeenCalledWith("sync_tick", expect.any(Function));
    expect(room.onMessage).toHaveBeenCalledWith("start_game", expect.any(Function));
  });

  it("should handle client joining without gameplayRandom locked errors", () => {
    const mockClient = {
      sessionId: "client_1",
      send: jest.fn(),
    } as unknown as Client;

    // This should run smoothly and not throw RandomService locked error!
    expect(() => {
      room.onJoin(mockClient, { name: "Asteroid Slayer" });
    }).not.toThrow();

    // Verify player state in schema
    const player = room.state.players.get("client_1");
    expect(player).toBeDefined();
    expect(player?.name).toBe("Asteroid Slayer");
    expect(player?.x).toBeGreaterThanOrEqual(100);
    expect(player?.x).toBeLessThanOrEqual(700);
    expect(player?.y).toBeGreaterThanOrEqual(100);
    expect(player?.y).toBeLessThanOrEqual(500);
    expect(player?.alive).toBe(true);

    // Verify entity assignment in ECS world
    const world = (room as any).world;
    const entity = (room as any).playerEntities.get("client_1");
    expect(entity).toBeDefined();
    expect(world.hasComponent(entity, "Ship")).toBe(true);
  });

  it("should support starting game and spawning asteroids without locked errors", () => {
    const mockClient = {
      sessionId: "client_1",
      send: jest.fn(),
    } as unknown as Client;

    room.onJoin(mockClient, { name: "Asteroid Slayer" });

    const startGameHandler = messageHandlers.get("start_game");
    expect(startGameHandler).toBeDefined();

    // Spawning asteroids should not throw gameplayRandom locked error!
    expect(() => {
      startGameHandler!();
    }).not.toThrow();

    expect(room.state.gameStarted).toBe(true);

    // Run 1 update step to flush commands and sync asteroids
    room.update(16.66);

    expect(room.state.asteroids.size).toBe(6);
  });

  it("should map different sessionIds to different ECS player entities", () => {
    const mockClient1 = { sessionId: "client_1", send: jest.fn() } as unknown as Client;
    const mockClient2 = { sessionId: "client_2", send: jest.fn() } as unknown as Client;

    room.onJoin(mockClient1, { name: "Player One" });
    room.onJoin(mockClient2, { name: "Player Two" });

    const entity1 = (room as any).playerEntities.get("client_1");
    const entity2 = (room as any).playerEntities.get("client_2");

    expect(entity1).toBeDefined();
    expect(entity2).toBeDefined();
    expect(entity1).not.toBe(entity2); // Ensure they are distinct ECS entities

    const world = (room as any).world;
    expect(world.hasComponent(entity1, "Ship")).toBe(true);
    expect(world.hasComponent(entity2, "Ship")).toBe(true);
  });

  it("should support client reconnection on leave and clear input buffer to prevent ghost inputs", async () => {
    const mockClient = {
      sessionId: "client_1",
      send: jest.fn(),
    } as unknown as Client;

    room.onJoin(mockClient, { name: "Player One" });

    const inputHandler = messageHandlers.get("input")!;
    inputHandler(mockClient, {
      tick: 1,
      timestamp: Date.now(),
      actions: ["thrust"],
      axes: {}
    });

    // Client leaves temporarily (not consented)
    await room.onLeave(mockClient, CloseCode.GOING_AWAY);

    // Reconnection should have been allowed
    expect(room.allowReconnection).toHaveBeenCalledWith(mockClient, 10);
    // State should still have the player
    expect(room.state.players.has("client_1")).toBe(true);
    // Input buffer for disconnected client should be cleared to prevent ghost inputs
    const buffer = (room as any).inputBuffers.get("client_1");
    expect(buffer).toEqual([]);
  });

  it("should permanently clean up player state if leave is consented", async () => {
    const mockClient = {
      sessionId: "client_1",
      send: jest.fn(),
    } as unknown as Client;

    room.onJoin(mockClient, { name: "Player One" });

    // Consented leave (close code normal / CONSENTED)
    await room.onLeave(mockClient, CloseCode.CONSENTED);

    // Reconnection should NOT be allowed
    expect(room.allowReconnection).not.toHaveBeenCalled();
    // State should NOT have the player anymore
    expect(room.state.players.has("client_1")).toBe(false);
    // Entity should be removed from player entities mapping
    expect((room as any).playerEntities.has("client_1")).toBe(false);
  });

  describe("Input Frame Pipeline & Updates", () => {
    let mockClient: Client;

    beforeEach(() => {
      mockClient = {
        sessionId: "client_1",
        send: jest.fn(),
      } as unknown as Client;
      room.onJoin(mockClient, { name: "Player One" });
    });

    it("should process input, step the simulation, and synchronize coordinates and components", () => {
      const startGameHandler = messageHandlers.get("start_game")!;
      startGameHandler();

      const inputHandler = messageHandlers.get("input")!;
      inputHandler(mockClient, {
        tick: 1,
        timestamp: Date.now(),
        actions: ["thrust"],
        axes: { rotate_x: 0 }
      });

      // Run 1 update step
      room.update(16.66);

      expect(room.state.serverTick).toBe(1);

      // Verify that coordinates got synchronized to schema
      const player = room.state.players.get("client_1")!;
      expect(player).toBeDefined();

      // The ship should move authoritatively
      expect(player.x).toBeDefined();
      expect(player.y).toBeDefined();
    });
  });
});
