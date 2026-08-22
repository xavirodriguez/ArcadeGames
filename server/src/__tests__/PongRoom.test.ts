import { PongRoom } from "../PongRoom";
import { CloseCode } from "@colyseus/core";

function createMockClient(sessionId: string) {
  return {
    sessionId,
    send: jest.fn()
  } as any;
}

describe("PongRoom", () => {
  let room: PongRoom;

  beforeEach(async () => {
    room = new PongRoom();
    room.allowReconnection = jest.fn().mockImplementation(() => Promise.resolve({} as any));
    await room.onCreate({});
  });

  afterEach(() => {
    room.onDispose?.();
  });

  it("should initialize state and register move listener", () => {
    expect(room.state).toBeDefined();
  });

  it("should handle client joining, updating input, tick execution, and leaving", async () => {
    const messageHandlers = new Map<string, Function>();
    room.onMessage = jest.fn((type: any, callback: any) => {
      messageHandlers.set(type.toString(), callback);
      return {} as any;
    }) as any;
    await room.onCreate({});

    const client = createMockClient("client1");
    room.onJoin(client, { name: "Player 1" });

    const inputHandler = messageHandlers.get("input");
    expect(inputHandler).toBeDefined();

    inputHandler!(client, {
      tick: 1,
      actions: ["moveUp"],
      axes: { moveY: -1 }
    });

    room.update(16.66);

    await room.onLeave(client, CloseCode.CONSENTED);
  });
});
