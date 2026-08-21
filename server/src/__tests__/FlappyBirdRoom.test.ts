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

  it("should handle client joining and leaving", async () => {
    const client = createMockClient("client1");
    room.onJoin(client, { name: "Player 1" });
    expect(room.state.birds.has("client1")).toBe(true);

    await room.onLeave(client, CloseCode.CONSENTED);
    expect(room.state.birds.has("client1")).toBe(false);
  });
});
