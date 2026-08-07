import { SpaceInvadersRoom } from "../SpaceInvadersRoom";
import { type Client, CloseCode } from "@colyseus/core";
import { SpaceInvadersState } from "../schema/SpaceInvadersState";

describe("SpaceInvadersRoom Lifecycle & Normalization", () => {
  let room: SpaceInvadersRoom;
  const messageHandlers = new Map<string, Function>();

  beforeEach(async () => {
    messageHandlers.clear();
    room = new SpaceInvadersRoom();

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

  it("should handle client joining", () => {
    const mockClient = {
      sessionId: "client_1",
      send: jest.fn(),
    } as unknown as Client;

    room.onJoin(mockClient, { name: "Player One" });

    // Verify player state in schema
    const player = room.state.players.get("client_1");
    expect(player).toBeDefined();
    expect(player?.name).toBe("Player One");
    expect(player?.x).toBe(400);
    expect(player?.y).toBe(500);
    expect(player?.alive).toBe(true);

    // Verify entity assignment in ECS world
    const world = (room as any).world;
    const entity = (room as any).playerEntities.get("client_1");
    expect(entity).toBeDefined();
    expect(world.hasComponent(entity, "Player")).toBe(true);
  });

  it("should support client reconnection on leave", async () => {
    const mockClient = {
      sessionId: "client_1",
      send: jest.fn(),
    } as unknown as Client;

    room.onJoin(mockClient, { name: "Player One" });

    // Client leaves temporarily (not consented)
    await room.onLeave(mockClient, CloseCode.GOING_AWAY);

    // Reconnection should have been allowed
    expect(room.allowReconnection).toHaveBeenCalledWith(mockClient, 10);
    // State should still have the player
    expect(room.state.players.has("client_1")).toBe(true);
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
});
