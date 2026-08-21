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

  it("should handle client joining and leaving", async () => {
    const client = createMockClient("client1");
    room.onJoin(client, { name: "Player 1" });

    await room.onLeave(client, CloseCode.CONSENTED);
  });
});
