import { FlappyBirdRoom } from "../FlappyBirdRoom";
import { CloseCode } from "@colyseus/core";

function createMockClient(sessionId: string) {
  return {
    sessionId,
    send: jest.fn()
  } as any;
}

describe("FlappyBirdRoom", () => {
  let room: FlappyBirdRoom;

  beforeEach(async () => {
    room = new FlappyBirdRoom();
    room.allowReconnection = jest.fn().mockImplementation(() => Promise.resolve({} as any));
    await room.onCreate({});
  });

  afterEach(() => {
    room.onDispose?.();
  });

  it("should initialize state and handlers", () => {
    expect(room.state).toBeDefined();
  });

  it("should handle client joining, receiving input, updating ticks, and leaving", async () => {
    const messageHandlers = new Map<string, Function>();
    room.onMessage = jest.fn((type: any, callback: any) => {
      messageHandlers.set(type.toString(), callback);
      return {} as any;
    }) as any;
    await room.onCreate({});

    const client = createMockClient("client1");
    room.onJoin(client, { name: "Player 1" });
    expect(room.state.birds.has("client1")).toBe(true);

    const inputHandler = messageHandlers.get("input");
    expect(inputHandler).toBeDefined();

    inputHandler!(client, {
      tick: 1,
      actions: ["jump"],
      axes: {}
    });

    room.update(16.66);

    await room.onLeave(client, CloseCode.CONSENTED);
    expect(room.state.birds.has("client1")).toBe(false);
  });
});
