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
    expect(world.hasComponent(entity1, "Player")).toBe(true);
    expect(world.hasComponent(entity2, "Player")).toBe(true);
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

  describe("Input Frame Pipeline", () => {
    let mockClient: Client;

    beforeEach(() => {
      mockClient = {
        sessionId: "client_1",
        send: jest.fn(),
      } as unknown as Client;
      room.onJoin(mockClient, { name: "Player One" });
    });

    it("should accept valid input and store it in buffer", () => {
      const handler = messageHandlers.get("input");
      expect(handler).toBeDefined();

      const validFrame = {
        tick: 1,
        timestamp: Date.now(),
        actions: ["shoot"],
        axes: { moveX: 1 }
      };

      handler!(mockClient, validFrame);

      const buffer = (room as any).inputBuffers.get("client_1");
      expect(buffer).toBeDefined();
      expect(buffer.length).toBe(1);
      expect(buffer[0].tick).toBe(1);
      expect(buffer[0].actions).toEqual(["shoot"]);
      expect(buffer[0].axes.moveX).toBe(1);
    });

    it("should reject malformed inputs", () => {
      const handler = messageHandlers.get("input");
      const malformedFrame = {
        tick: "invalid-tick", // non-number tick
        actions: "shoot" // string instead of array
      };

      handler!(mockClient, malformedFrame);

      const buffer = (room as any).inputBuffers.get("client_1");
      expect(buffer.length).toBe(0);
    });

    it("should reject negative tick", () => {
      const handler = messageHandlers.get("input");
      const negativeTickFrame = {
        tick: -10,
        actions: [],
        axes: {}
      };

      handler!(mockClient, negativeTickFrame);

      const buffer = (room as any).inputBuffers.get("client_1");
      expect(buffer.length).toBe(0);
    });

    it("should cap axes values", () => {
      const handler = messageHandlers.get("input");
      const extremeAxesFrame = {
        tick: 5,
        actions: [],
        axes: { moveX: 5.5 } // out of [-1, 1] range
      };

      handler!(mockClient, extremeAxesFrame);

      const buffer = (room as any).inputBuffers.get("client_1");
      expect(buffer[0].axes.moveX).toBe(1); // capped to 1
    });

    it("should ignore unallowed actions", () => {
      const handler = messageHandlers.get("input");
      const hackyFrame = {
        tick: 3,
        actions: ["shoot", "teleport_cheat"],
        axes: {}
      };

      handler!(mockClient, hackyFrame);

      const buffer = (room as any).inputBuffers.get("client_1");
      expect(buffer[0].actions).toEqual(["shoot"]); // teleport_cheat ignored
    });

    it("should ignore duplicate ticks", () => {
      const handler = messageHandlers.get("input");
      const frame = {
        tick: 10,
        actions: [],
        axes: {}
      };

      handler!(mockClient, frame);
      handler!(mockClient, frame); // duplicated tick

      const buffer = (room as any).inputBuffers.get("client_1");
      expect(buffer.length).toBe(1);
    });
  });

  describe("Headless Simulation Loop", () => {
    let mockClient: Client;

    beforeEach(() => {
      mockClient = {
        sessionId: "client_1",
        send: jest.fn(),
      } as unknown as Client;
      room.onJoin(mockClient, { name: "Player One" });
    });

    it("should run authoritative headless simulation steps and sync updates", () => {
      // Start the game to trigger initialization and spawn directors, formations, shields
      const startGameHandler = messageHandlers.get("start_game");
      expect(startGameHandler).toBeDefined();
      startGameHandler!();

      expect(room.state.gameStarted).toBe(true);

      // Verify that the initial structures were successfully spawned in the ECS world
      const world = (room as any).world;
      const stateEntities = world.query("GameState");
      expect(stateEntities.length).toBe(1);

      const formationEntities = world.query("Formation");
      expect(formationEntities.length).toBe(1);

      // Verify a client-side player entity has been created
      const playerEntity = (room as any).playerEntities.get("client_1");
      expect(playerEntity).toBeDefined();

      const initialPos = { ...world.getComponent(playerEntity, "Transform") };
      expect(initialPos.x).toBe(400);

      // Submit an input frame to move the player right
      const inputHandler = messageHandlers.get("input");
      const moveRightFrame = {
        tick: 1,
        timestamp: Date.now(),
        actions: [],
        axes: { moveX: 1 } // Move Right
      };
      inputHandler!(mockClient, moveRightFrame);

      // Advance Room simulation by 1 update frame
      room.update(16.66);

      // Verify the simulation step ran and updated the position and synchronized the Schema
      const updatedPlayerSchema = room.state.players.get("client_1");
      expect(updatedPlayerSchema?.x).toBeGreaterThan(initialPos.x); // Player should have moved to the right
      expect(room.state.serverTick).toBe(1);

      // Submit a shooting frame
      const shootFrame = {
        tick: 2,
        timestamp: Date.now(),
        actions: ["shoot"],
        axes: {}
      };
      inputHandler!(mockClient, shootFrame);

      // Advance Room simulation again
      room.update(16.66);

      // Verify that a PlayerBullet was spawned autoritatively and is synchronized on the Schema
      expect(room.state.serverTick).toBe(2);
      expect(room.state.bullets.size).toBe(1);

      const bulletSchema = Array.from(room.state.bullets.values())[0];
      expect(bulletSchema.ownerId).toBe("player");
    });

    it("should execute with a strict fixed timestep regardless of variable input dt", () => {
      // Start game
      const startGameHandler = messageHandlers.get("start_game");
      startGameHandler!();

      const world = (room as any).world;
      const playerEntity = (room as any).playerEntities.get("client_1");
      const inputHandler = messageHandlers.get("input");

      // Configure a slow PLAYER_SPEED to avoid hitting screen boundaries/clamping
      const config = world.getResource("GameConfig");
      if (config) {
        config.PLAYER_SPEED = 2;
      }

      // Verify server tick starts at 0
      expect(room.state.serverTick).toBe(0);

      // Submit an input frame to move player left
      inputHandler!(mockClient, {
        tick: 1,
        timestamp: Date.now(),
        actions: [],
        axes: { moveX: -1 }
      });

      // Update room with 50ms of delta time
      const initialPosX = world.getComponent(playerEntity, "Transform").x;
      room.update(50); // Larger dt

      const posXAfterUpdate1 = world.getComponent(playerEntity, "Transform").x;
      const distanceWithLargeDt = initialPosX - posXAfterUpdate1;

      // Submit next input frame to move player left
      inputHandler!(mockClient, {
        tick: 2,
        timestamp: Date.now(),
        actions: [],
        axes: { moveX: -1 }
      });

      // Update room with 5ms of delta time (much smaller)
      room.update(5); // Smaller dt

      const posXAfterUpdate2 = world.getComponent(playerEntity, "Transform").x;
      const distanceWithSmallDt = posXAfterUpdate1 - posXAfterUpdate2;

      // Assert that server ticks advanced by exactly 1 in both cases (no double step, no time-skipping)
      expect(room.state.serverTick).toBe(2);

      // Assert that the distance moved is exactly the same because fixed timestep (16.66ms) is enforced internally,
      // proving that the simulation is independent of real-world delta time jitter.
      expect(distanceWithLargeDt).toBeCloseTo(distanceWithSmallDt, 5);
    });
  });

  describe("State Synchronization (syncWorldToSchema)", () => {
    let mockClient: Client;

    beforeEach(() => {
      mockClient = {
        sessionId: "client_1",
        send: jest.fn(),
      } as unknown as Client;
      room.onJoin(mockClient, { name: "Player One" });
    });

    it("should synchronize create, update, and delete events for players, invaders, and bullets", () => {
      // Start the game to populate initial state
      const startGameHandler = messageHandlers.get("start_game");
      startGameHandler!();

      // Run an update step to allow SpawnDirectorSystem to process spawning of invaders
      room.update(16.66);

      const world = (room as any).world;
      const playerEntity = (room as any).playerEntities.get("client_1");

      // 1. Verify Player Created
      expect(room.state.players.has("client_1")).toBe(true);
      const playerSchema = room.state.players.get("client_1")!;
      expect(playerSchema.x).toBe(400);
      expect(playerSchema.y).toBe(500);

      // 2. Verify Player Moved
      world.mutateComponent(playerEntity, "Transform", (t: any) => {
        t.x = 425;
        t.y = 480;
      });
      (room as any).syncWorldToSchema();
      expect(playerSchema.x).toBe(425);
      expect(playerSchema.y).toBe(480);

      // 3. Verify Player Deleted on permanent leave
      room.onLeave(mockClient, CloseCode.CONSENTED);
      expect(room.state.players.has("client_1")).toBe(false);

      // Re-join player for subsequent tests
      room.onJoin(mockClient, { name: "Player One" });

      // 4. Verify Invaders creation
      const invaderEntities = world.query("Invader");
      expect(invaderEntities.length).toBeGreaterThan(0);
      expect(room.state.invaders.size).toBe(invaderEntities.length);

      // 5. Verify Invader Deleted
      const firstInvader = invaderEntities[0];
      const invaderId = firstInvader.toString();
      expect(room.state.invaders.has(invaderId)).toBe(true);

      // Kill/remove invader from world
      world.getCommandBuffer().removeEntity(firstInvader);
      world.flush();

      // Sync state and check
      (room as any).syncWorldToSchema();
      expect(room.state.invaders.has(invaderId)).toBe(false);

      // 6. Verify Bullet Created
      const bulletEntity = world.createEntity();
      world.addComponent(bulletEntity, {
        type: "PlayerBullet",
      } as any);
      world.addComponent(bulletEntity, {
        type: "Transform",
        x: 150,
        y: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      } as any);
      world.flush();

      (room as any).syncWorldToSchema();
      const bulletId = bulletEntity.toString();
      expect(room.state.bullets.has(bulletId)).toBe(true);
      const bulletSchema = room.state.bullets.get(bulletId)!;
      expect(bulletSchema.x).toBe(150);
      expect(bulletSchema.y).toBe(200);
      expect(bulletSchema.ownerId).toBe("player");

      // 7. Verify Bullet Updated
      world.mutateComponent(bulletEntity, "Transform", (t: any) => {
        t.x = 155;
        t.y = 190;
      });
      (room as any).syncWorldToSchema();
      expect(bulletSchema.x).toBe(155);
      expect(bulletSchema.y).toBe(190);

      // 8. Verify Bullet Deleted
      world.getCommandBuffer().removeEntity(bulletEntity);
      world.flush();
      (room as any).syncWorldToSchema();
      expect(room.state.bullets.has(bulletId)).toBe(false);
    });
  });

  describe("Multiplayer Symmetric Verification (Two Real Players)", () => {
    it("should handle multiplayer interactions for two real concurrent clients (Player A & Player B)", () => {
      // 1. Initialize room with two clients
      const clientA = { sessionId: "client_A", send: jest.fn() } as unknown as Client;
      const clientB = { sessionId: "client_B", send: jest.fn() } as unknown as Client;

      room.onJoin(clientA, { name: "Player A" });
      room.onJoin(clientB, { name: "Player B" });

      const world = (room as any).world;
      const playerEntityA = (room as any).playerEntities.get("client_A");
      const playerEntityB = (room as any).playerEntities.get("client_B");

      expect(playerEntityA).toBeDefined();
      expect(playerEntityB).toBeDefined();
      expect(playerEntityA).not.toBe(playerEntityB);

      // Start the game
      const startGameHandler = messageHandlers.get("start_game");
      startGameHandler!();

      // Configure a slow PLAYER_SPEED to avoid hitting boundaries
      const config = world.getResource("GameConfig");
      if (config) {
        config.PLAYER_SPEED = 2;
      }

      const inputHandler = messageHandlers.get("input");

      // 2. Scenario: Player A moves left, Player B moves right
      inputHandler!(clientA, {
        tick: 1,
        timestamp: Date.now(),
        actions: [],
        axes: { moveX: -1 } // Left
      });
      inputHandler!(clientB, {
        tick: 1,
        timestamp: Date.now(),
        actions: [],
        axes: { moveX: 1 } // Right
      });

      // Advance 1 tick
      room.update(16.66);

      const schemaA = room.state.players.get("client_A")!;
      const schemaB = room.state.players.get("client_B")!;

      // Player A moved left (x < 400), Player B moved right (x > 400)
      expect(schemaA.x).toBeLessThan(400);
      expect(schemaB.x).toBeGreaterThan(400);
      expect(room.state.serverTick).toBe(1);

      // 3. Scenario: Both players fire projectiles symmetrically
      inputHandler!(clientA, {
        tick: 2,
        timestamp: Date.now(),
        actions: ["shoot"],
        axes: {}
      });
      inputHandler!(clientB, {
        tick: 2,
        timestamp: Date.now(),
        actions: ["shoot"],
        axes: {}
      });

      // Advance 1 tick
      room.update(16.66);

      expect(room.state.serverTick).toBe(2);

      // Verify that two PlayerBullets are present in the room's synchronized bullets schema
      const bulletsList = Array.from(room.state.bullets.values());
      expect(bulletsList.length).toBe(2);

      // Both bullets should belong to the authoritative owner "player"
      expect(bulletsList[0].ownerId).toBe("player");
      expect(bulletsList[1].ownerId).toBe("player");
    });
  });

  describe("Late Join Verification", () => {
    it("should support late join and preserve existing room entities and state", () => {
      // 1. Initial player joins and starts the game
      const client1 = { sessionId: "client_1", send: jest.fn() } as unknown as Client;
      room.onJoin(client1, { name: "Player One" });

      const startGameHandler = messageHandlers.get("start_game");
      startGameHandler!();

      // Run update so some invaders are spawned and score changes
      room.update(16.66);

      const world = (room as any).world;
      world.mutateSingleton("GameState" as any, (gs: any) => {
        gs.score = 500; // Authoritative score changes
      });
      (room as any).syncWorldToSchema();

      expect(room.state.score).toBe(500);
      const initialInvadersCount = room.state.invaders.size;
      expect(initialInvadersCount).toBeGreaterThan(0);

      // 2. Late player joins the active game
      const client2 = { sessionId: "client_2", send: jest.fn() } as unknown as Client;
      room.onJoin(client2, { name: "Player Two" });

      // 3. Verify that the existing room state is perfectly preserved and player 2 is added
      expect(room.state.score).toBe(500); // Score preserved
      expect(room.state.invaders.size).toBe(initialInvadersCount); // Invaders preserved
      expect(room.state.players.has("client_1")).toBe(true); // Player 1 preserved
      expect(room.state.players.has("client_2")).toBe(true); // Player 2 added

      const p2Schema = room.state.players.get("client_2")!;
      expect(p2Schema.name).toBe("Player Two");
      expect(p2Schema.alive).toBe(true);
    });
  });
});
