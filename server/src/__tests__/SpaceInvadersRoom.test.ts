import { SpaceInvadersRoom } from "../SpaceInvadersRoom";
import { type Client, CloseCode } from "@colyseus/core";
import { World } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../../../src/games/space-invaders/types/SpaceInvadersTypes";
import { InputFrame } from "../NetTypes";

type SpaceInvadersRoomInternalAccess = SpaceInvadersRoom & {
  world: World<SpaceInvadersComponentRegistry>;
  playerEntities: Map<string, number>;
  inputBuffers: Map<string, InputFrame[]>;
  syncWorldToSchema(): void;
};

function getRoomInternal(room: SpaceInvadersRoom): SpaceInvadersRoomInternalAccess {
  return room as unknown as SpaceInvadersRoomInternalAccess;
}

type MessageHandler = (client: Client, message: unknown) => void;

function createMockClient(sessionId: string): Client {
  return {
    sessionId,
    send: jest.fn()
  } as unknown as Client;
}

describe("SpaceInvadersRoom Lifecycle & Normalization", () => {
  let room: SpaceInvadersRoom;
  const messageHandlers = new Map<string, MessageHandler>();

  beforeEach(async () => {
    messageHandlers.clear();
    room = new SpaceInvadersRoom();

    // Mock Colyseus Room infrastructure
    room.setState = jest.fn((state) => {
      room.state = state;
    }) as unknown as typeof room.setState;
    room.setPatchRate = jest.fn();
    room.setSimulationInterval = jest.fn();
    room.onMessage = jest.fn((type: unknown, callback: MessageHandler) => {
      messageHandlers.set(String(type), callback);
      return {} as ReturnType<Client["send"]> & any;
    }) as unknown as typeof room.onMessage;
    room.allowReconnection = jest.fn().mockResolvedValue({} as Client);
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
    const mockClient = createMockClient("client_1");

    room.onJoin(mockClient, { name: "Player One" });

    // Verify player state in schema
    const player = room.state.players.get("client_1");
    expect(player).toBeDefined();
    expect(player?.name).toBe("Player One");
    expect(player?.x).toBe(400);
    expect(player?.y).toBe(500);
    expect(player?.alive).toBe(true);

    // Verify entity assignment in ECS world
    const internal = getRoomInternal(room);
    const entity = internal.playerEntities.get("client_1");
    expect(entity).toBeDefined();
    expect(entity !== undefined && internal.world.hasComponent(entity, "Player")).toBe(true);
  });

  it("should map different sessionIds to different ECS player entities", () => {
    const mockClient1 = createMockClient("client_1");
    const mockClient2 = createMockClient("client_2");

    room.onJoin(mockClient1, { name: "Player One" });
    room.onJoin(mockClient2, { name: "Player Two" });

    const internal = getRoomInternal(room);
    const entity1 = internal.playerEntities.get("client_1");
    const entity2 = internal.playerEntities.get("client_2");

    expect(entity1).toBeDefined();
    expect(entity2).toBeDefined();
    expect(entity1).not.toBe(entity2); // Ensure they are distinct ECS entities

    expect(entity1 !== undefined && internal.world.hasComponent(entity1, "Player")).toBe(true);
    expect(entity2 !== undefined && internal.world.hasComponent(entity2, "Player")).toBe(true);
  });

  it("should support client reconnection on leave", async () => {
    const mockClient = createMockClient("client_1");

    room.onJoin(mockClient, { name: "Player One" });

    // Client leaves temporarily (not consented)
    await room.onLeave(mockClient, CloseCode.GOING_AWAY);

    // Reconnection should have been allowed
    expect(room.allowReconnection).toHaveBeenCalledWith(mockClient, 10);
    // State should still have the player
    expect(room.state.players.has("client_1")).toBe(true);
  });

  it("should permanently clean up player state if leave is consented", async () => {
    const mockClient = createMockClient("client_1");

    room.onJoin(mockClient, { name: "Player One" });

    // Consented leave (close code normal / CONSENTED)
    await room.onLeave(mockClient, CloseCode.CONSENTED);

    // Reconnection should NOT be allowed
    expect(room.allowReconnection).not.toHaveBeenCalled();
    // State should NOT have the player anymore
    expect(room.state.players.has("client_1")).toBe(false);
    // Entity should be removed from player entities mapping
    const internal = getRoomInternal(room);
    expect(internal.playerEntities.has("client_1")).toBe(false);
  });

  describe("Input Frame Pipeline", () => {
    let mockClient: Client;

    beforeEach(() => {
      mockClient = createMockClient("client_1");
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

      const internal = getRoomInternal(room);
      const buffer = internal.inputBuffers.get("client_1");
      expect(buffer).toBeDefined();
      expect(buffer?.length).toBe(1);
      expect(buffer?.[0].tick).toBe(1);
      expect(buffer?.[0].actions).toEqual(["shoot"]);
      expect(buffer?.[0].axes.moveX).toBe(1);
    });

    it("should reject malformed inputs", () => {
      const handler = messageHandlers.get("input");
      const malformedFrame = {
        tick: "invalid-tick", // non-number tick
        actions: "shoot" // string instead of array
      };

      handler!(mockClient, malformedFrame);

      const internal = getRoomInternal(room);
      const buffer = internal.inputBuffers.get("client_1");
      expect(buffer?.length).toBe(0);
    });

    it("should reject negative tick", () => {
      const handler = messageHandlers.get("input");
      const negativeTickFrame = {
        tick: -10,
        actions: [],
        axes: {}
      };

      handler!(mockClient, negativeTickFrame);

      const internal = getRoomInternal(room);
      const buffer = internal.inputBuffers.get("client_1");
      expect(buffer?.length).toBe(0);
    });

    it("should cap axes values", () => {
      const handler = messageHandlers.get("input");
      const extremeAxesFrame = {
        tick: 5,
        actions: [],
        axes: { moveX: 5.5 } // out of [-1, 1] range
      };

      handler!(mockClient, extremeAxesFrame);

      const internal = getRoomInternal(room);
      const buffer = internal.inputBuffers.get("client_1");
      expect(buffer?.[0].axes.moveX).toBe(1); // capped to 1
    });

    it("should ignore unallowed actions", () => {
      const handler = messageHandlers.get("input");
      const hackyFrame = {
        tick: 3,
        actions: ["shoot", "teleport_cheat"],
        axes: {}
      };

      handler!(mockClient, hackyFrame);

      const internal = getRoomInternal(room);
      const buffer = internal.inputBuffers.get("client_1");
      expect(buffer?.[0].actions).toEqual(["shoot"]); // teleport_cheat ignored
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

      const internal = getRoomInternal(room);
      const buffer = internal.inputBuffers.get("client_1");
      expect(buffer?.length).toBe(1);
    });

    it("should reject input frames exceeding actions limit or axes key count", () => {
      const handler = messageHandlers.get("input");

      // Too many actions (> 16)
      const excessiveActionsFrame = {
        tick: 12,
        actions: new Array(20).fill("shoot"),
        axes: {}
      };
      handler!(mockClient, excessiveActionsFrame);

      const internal = getRoomInternal(room);
      let buffer = internal.inputBuffers.get("client_1");
      expect(buffer?.some((f) => f.tick === 12)).toBe(false);

      // Too many axes keys (> 16)
      const excessiveAxesKeys: Record<string, number> = {};
      for (let i = 0; i < 20; i++) {
        excessiveAxesKeys[`axis_${i}`] = 0.5;
      }
      const excessiveAxesFrame = {
        tick: 13,
        actions: ["shoot"],
        axes: excessiveAxesKeys
      };
      handler!(mockClient, excessiveAxesFrame);

      buffer = internal.inputBuffers.get("client_1");
      const tick13Frame = buffer?.find((f) => f.tick === 13);
      expect(tick13Frame).toBeDefined();
      expect(Object.keys(tick13Frame?.axes || {}).length).toBe(0); // Exceeded 16 limit, axes ignored/emptied
    });
  });

  describe("Headless Simulation Loop", () => {
    let mockClient: Client;

    beforeEach(() => {
      mockClient = createMockClient("client_1");
      room.onJoin(mockClient, { name: "Player One" });
    });

    it("should run authoritative headless simulation steps and sync updates", () => {
      // Start the game to trigger initialization and spawn directors, formations, shields
      const startGameHandler = messageHandlers.get("start_game");
      expect(startGameHandler).toBeDefined();
      startGameHandler!(mockClient, undefined);

      expect(room.state.gameStarted).toBe(true);

      // Verify that the initial structures were successfully spawned in the ECS world
      const internal = getRoomInternal(room);
      const stateEntities = internal.world.query("GameState");
      expect(stateEntities.length).toBe(1);

      const formationEntities = internal.world.query("Formation");
      expect(formationEntities.length).toBe(1);

      // Verify a client-side player entity has been created
      const playerEntity = internal.playerEntities.get("client_1");
      expect(playerEntity).toBeDefined();

      const initialPos = { ...(playerEntity !== undefined ? internal.world.getComponent(playerEntity, "Transform") : undefined) };
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
      expect(updatedPlayerSchema?.x).toBeGreaterThan(initialPos.x || 0); // Player should have moved to the right
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
      startGameHandler!(mockClient, undefined);

      const internal = getRoomInternal(room);
      const playerEntity = internal.playerEntities.get("client_1");
      const inputHandler = messageHandlers.get("input");

      // Configure a slow PLAYER_SPEED to avoid hitting screen boundaries/clamping
      const config = internal.world.getResource("GameConfig") as Record<string, number> | undefined;
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
      const initialPosX = playerEntity !== undefined ? internal.world.getComponent(playerEntity, "Transform")?.x || 0 : 0;
      room.update(50); // Larger dt

      const posXAfterUpdate1 = playerEntity !== undefined ? internal.world.getComponent(playerEntity, "Transform")?.x || 0 : 0;
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

      const posXAfterUpdate2 = playerEntity !== undefined ? internal.world.getComponent(playerEntity, "Transform")?.x || 0 : 0;
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
      mockClient = createMockClient("client_1");
      room.onJoin(mockClient, { name: "Player One" });
    });

    it("should synchronize create, update, and delete events for players, invaders, and bullets", () => {
      // Start the game to populate initial state
      const startGameHandler = messageHandlers.get("start_game");
      startGameHandler!(mockClient, undefined);

      // Run an update step to allow SpawnDirectorSystem to process spawning of invaders
      room.update(16.66);

      const internal = getRoomInternal(room);
      const playerEntity = internal.playerEntities.get("client_1");

      // 1. Verify Player Created
      expect(room.state.players.has("client_1")).toBe(true);
      const playerSchema = room.state.players.get("client_1")!;
      expect(playerSchema.x).toBe(400);
      expect(playerSchema.y).toBe(500);

      // 2. Verify Player Moved
      if (playerEntity !== undefined) {
        internal.world.mutateComponent(playerEntity, "Transform", (t: SpaceInvadersComponentRegistry["Transform"]) => {
          t.x = 425;
          t.y = 480;
        });
      }
      internal.syncWorldToSchema();
      expect(playerSchema.x).toBe(425);
      expect(playerSchema.y).toBe(480);

      // 3. Verify Player Deleted on permanent leave
      room.onLeave(mockClient, CloseCode.CONSENTED);
      expect(room.state.players.has("client_1")).toBe(false);

      // Re-join player for subsequent tests
      room.onJoin(mockClient, { name: "Player One" });

      // 4. Verify Invaders creation
      const invaderEntities = internal.world.query("Invader");
      expect(invaderEntities.length).toBeGreaterThan(0);
      expect(room.state.invaders.size).toBe(invaderEntities.length);

      // 5. Verify Invader Deleted
      const firstInvader = invaderEntities[0];
      const invaderId = firstInvader.toString();
      expect(room.state.invaders.has(invaderId)).toBe(true);

      // Kill/remove invader from world
      internal.world.getCommandBuffer().removeEntity(firstInvader);
      internal.world.flush();

      // Sync state and check
      internal.syncWorldToSchema();
      expect(room.state.invaders.has(invaderId)).toBe(false);

      // 6. Verify Bullet Created
      const bulletEntity = internal.world.createEntity();
      internal.world.addComponent(bulletEntity, {
        type: "PlayerBullet",
      } as SpaceInvadersComponentRegistry["PlayerBullet"]);
      internal.world.addComponent(bulletEntity, {
        type: "Transform",
        x: 150,
        y: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      } as SpaceInvadersComponentRegistry["Transform"]);
      internal.world.flush();

      internal.syncWorldToSchema();
      const bulletId = bulletEntity.toString();
      expect(room.state.bullets.has(bulletId)).toBe(true);
      const bulletSchema = room.state.bullets.get(bulletId)!;
      expect(bulletSchema.x).toBe(150);
      expect(bulletSchema.y).toBe(200);
      expect(bulletSchema.ownerId).toBe("player");

      // 7. Verify Bullet Updated
      internal.world.mutateComponent(bulletEntity, "Transform", (t: SpaceInvadersComponentRegistry["Transform"]) => {
        t.x = 155;
        t.y = 190;
      });
      internal.syncWorldToSchema();
      expect(bulletSchema.x).toBe(155);
      expect(bulletSchema.y).toBe(190);

      // 8. Verify Bullet Deleted
      internal.world.getCommandBuffer().removeEntity(bulletEntity);
      internal.world.flush();
      internal.syncWorldToSchema();
      expect(room.state.bullets.has(bulletId)).toBe(false);
    });
  });

  describe("Multiplayer Symmetric Verification (Two Real Players)", () => {
    it("should handle multiplayer interactions for two real concurrent clients (Player A & Player B)", () => {
      // 1. Initialize room with two clients
      const clientA = createMockClient("client_A");
      const clientB = createMockClient("client_B");

      room.onJoin(clientA, { name: "Player A" });
      room.onJoin(clientB, { name: "Player B" });

      const internal = getRoomInternal(room);
      const playerEntityA = internal.playerEntities.get("client_A");
      const playerEntityB = internal.playerEntities.get("client_B");

      expect(playerEntityA).toBeDefined();
      expect(playerEntityB).toBeDefined();
      expect(playerEntityA).not.toBe(playerEntityB);

      // Start the game
      const startGameHandler = messageHandlers.get("start_game");
      startGameHandler!(clientA, undefined);

      // Configure a slow PLAYER_SPEED to avoid hitting boundaries
      const config = internal.world.getResource("GameConfig") as Record<string, number> | undefined;
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
      const client1 = createMockClient("client_1");
      room.onJoin(client1, { name: "Player One" });

      const startGameHandler = messageHandlers.get("start_game");
      startGameHandler!(client1, undefined);

      // Run update so some invaders are spawned and score changes
      room.update(16.66);

      const internal = getRoomInternal(room);
      internal.world.mutateSingleton("GameState", (gs: SpaceInvadersComponentRegistry["GameState"]) => {
        gs.score = 500; // Authoritative score changes
      });
      internal.syncWorldToSchema();

      expect(room.state.score).toBe(500);
      const initialInvadersCount = room.state.invaders.size;
      expect(initialInvadersCount).toBeGreaterThan(0);

      // 2. Late player joins the active game
      const client2 = createMockClient("client_2");
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
