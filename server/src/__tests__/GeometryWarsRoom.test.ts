import { GeometryWarsRoom } from "../GeometryWarsRoom";
import { type Client, CloseCode } from "@colyseus/core";
import { GeometryWarsState } from "../schema/GeometryWarsState";

describe("GeometryWarsRoom Lifecycle & Normalization", () => {
  let room: GeometryWarsRoom;
  const messageHandlers = new Map<string, Function>();

  beforeEach(async () => {
    messageHandlers.clear();
    room = new GeometryWarsRoom();

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
    expect(room.state.score).toBe(0);
    expect(room.state.wave).toBe(1);
    expect(room.state.bombs).toBe(3);
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
    expect(player?.y).toBe(300);
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

  it("should process input and sync players, enemies, and bullets to Colyseus state in simulation steps", () => {
    const mockClient = {
      sessionId: "client_1",
      send: jest.fn(),
    } as unknown as Client;

    room.onJoin(mockClient, { name: "Player One" });

    // Start game
    const startGameHandler = messageHandlers.get("start_game")!;
    startGameHandler();
    expect(room.state.gameStarted).toBe(true);

    // Receive player input
    const inputHandler = messageHandlers.get("input")!;
    inputHandler(mockClient, {
      protocolVersion: 1,
      tick: 1,
      timestamp: Date.now(),
      actions: ["fire"],
      axes: {
        moveX: 1,
        moveY: 0,
        aimX: 0,
        aimY: -1
      }
    });

    // Run 1 update step
    room.update(16.66);

    // Verify tick increment and player movement
    expect(room.state.serverTick).toBe(1);
    const player = room.state.players.get("client_1");
    expect(player).toBeDefined();
    expect(player!.velocityX).toBeGreaterThan(0);

    // Check that we can spawn an enemy and sync it
    const world = (room as any).world;
    const enemyEntity = world.createEntity();
    world.addComponent(enemyEntity, {
      type: "Transform",
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(enemyEntity, {
      type: "Faction",
      faction: "enemy",
      value: "enemy"
    });
    world.addComponent(enemyEntity, {
      type: "Render",
      shape: "gw_chaser",
      size: 14,
      color: "#ff00ff",
      visible: true,
      opacity: 1,
      order: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    });

    // Sync state
    (room as any).syncWorldToSchema();

    // Verify enemy is in the Colyseus map state (including newly spawned wave enemies)
    expect(room.state.enemies.size).toBeGreaterThanOrEqual(1);
    const enemy = room.state.enemies.get(enemyEntity.toString());
    expect(enemy).toBeDefined();
    expect(enemy!.type).toBe("gw_chaser");
    expect(enemy!.x).toBe(100);
    expect(enemy!.y).toBe(100);

    // Check that we can spawn a bullet and sync it
    const bulletEntity = world.createEntity();
    world.addComponent(bulletEntity, {
      type: "Transform",
      x: 150,
      y: 150,
      rotation: 1.5,
      scaleX: 1,
      scaleY: 1,
      worldX: 150,
      worldY: 150,
      worldRotation: 1.5,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(bulletEntity, {
      type: "Render",
      shape: "gw_bullet",
      size: 4,
      color: "#ffff00",
      visible: true,
      opacity: 1,
      order: 2,
      rotation: 1.5,
      angularVelocity: 0,
      hitFlashFrames: 0
    });

    // Sync state
    (room as any).syncWorldToSchema();

    // Verify bullet is in the Colyseus map state (including newly fired player bullets)
    expect(room.state.bullets.size).toBeGreaterThanOrEqual(1);
    const bullet = room.state.bullets.get(bulletEntity.toString());
    expect(bullet).toBeDefined();
    expect(bullet!.x).toBe(150);
    expect(bullet!.y).toBe(150);
    expect(bullet!.angle).toBe(1.5);
  });
});
