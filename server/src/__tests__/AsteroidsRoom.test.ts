import { AsteroidsRoom } from "../AsteroidsRoom";
import { type Client } from "@colyseus/core";
import { World } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../../../src/games/asteroids";
import { InputFrame } from "../NetTypes";

type AsteroidsRoomInternalAccess = AsteroidsRoom & { world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>; playerEntities: Map<string, number> };
function getRoomInternal(room: AsteroidsRoom): AsteroidsRoomInternalAccess { return room as unknown as AsteroidsRoomInternalAccess; }
type MessageHandler = (client: Client, message: unknown) => void;
type MockClient = Pick<Client, "sessionId" | "send">;
function createMockClient(sessionId: string): Client {
  const mock: MockClient = { sessionId, send: jest.fn() };
  return mock as unknown as Client;
}

describe("AsteroidsRoom authoritative input", () => {
  let room: AsteroidsRoom;
  const messageHandlers = new Map<string, MessageHandler>();
  beforeEach(async () => {
    messageHandlers.clear();
    room = new AsteroidsRoom();
    room.setState = jest.fn((state) => { room.state = state; });
    room.setPatchRate = jest.fn();
    room.setSimulationInterval = jest.fn();
    room.onMessage = jest.fn((type: unknown, callback: MessageHandler) => {
      messageHandlers.set(String(type), callback);
      return (() => {}) as unknown as ReturnType<typeof room.onMessage>;
    }) as unknown as typeof room.onMessage;
    room.broadcast = jest.fn();
    await room.onCreate({ seed: 12345 });
  });
  afterEach(() => { room.onDispose(); });

  it("processes the real spawned Ship input and attributes bullets to its session", () => {
    const client = createMockClient("asteroids-session-1");
    room.onJoin(client, { name: 'Player One' });
    const internal = getRoomInternal(room);
    const entity = internal.playerEntities.get(client.sessionId);
    expect(entity).toBeDefined();
    if (entity === undefined) throw new Error("Room did not create the player ship");
    expect(internal.world.hasComponent(entity, "LocalPlayer")).toBe(false);
    expect(internal.world.hasComponent(entity, "Input")).toBe(false);
    expect(internal.world.getComponent(entity, "Ship")?.sessionId).toBe(client.sessionId);
    // Spawning must preserve the blueprint's shoot cooldown so the authoritative
    // input system can fire on the very next processed tick.
    expect(internal.world.getComponent(entity, "Ship")?.shootCooldownRemaining).toBe(0);

    const startHandler = messageHandlers.get("start_game");
    const inputHandler = messageHandlers.get("input");
    expect(startHandler).toBeDefined();
    expect(inputHandler).toBeDefined();
    startHandler!(client, undefined);

    // Remove the initial wave so this test isolates ship input from collision outcomes.
    for (const asteroid of internal.world.query("Asteroid")) internal.world.getCommandBuffer().removeEntity(asteroid);
    internal.world.flush();

    inputHandler!(client, { protocolVersion: 1, tick: 1, timestamp: 1, actions: ['thrust'], axes: {} } satisfies InputFrame);
    // BaseRoom ignores this argument and steps with AsteroidsRoom.fixedTimeStep (1/60 s).
    room.update(16.66);
    const velocity = internal.world.getComponent(entity, "Velocity");
    expect(velocity).toBeDefined();
    expect(velocity ? Math.hypot(velocity.vx, velocity.vy) : 0).toBeGreaterThan(0);
    expect(internal.world.hasComponent(entity, "LocalPlayer")).toBe(false);

    inputHandler!(client, { protocolVersion: 1, tick: 2, timestamp: 2, actions: ['shoot'], axes: {} } satisfies InputFrame);
    room.update(16.66);
    const bullets = internal.world.query("Bullet");
    expect(bullets).toHaveLength(1);
    expect(internal.world.getComponent(bullets[0], "Bullet")?.ownerId).toBe(client.sessionId);
  });
});
