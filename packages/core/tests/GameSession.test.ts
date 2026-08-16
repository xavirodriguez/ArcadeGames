import { BaseGame } from "../src/runtime/BaseGame";
import { GameDefinition } from "../src/runtime/GameDefinition";
import { GameSession } from "../src/runtime/GameSession";
import { CompactInputFrame } from "../src/input/InputFrame";

interface TestState {
  score: number;
}

class SessionTestGame extends BaseGame<TestState, any> {
  constructor(seed: number) {
    super({
      gameOptions: { seed }
    });
    this.loop = {
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      subscribeUpdate: jest.fn(),
      subscribeRender: jest.fn()
    } as any;
  }

  public override update(dt: number): void {}
  public override getGameState(): TestState {
    return { score: 100 };
  }
  public override isGameOver(): boolean {
    return false;
  }
}

const mockDefinition: GameDefinition = {
  name: "test-session-game",
  createSimulation: (seed) => {
    const game = new SessionTestGame(seed);
    game.init(); // Initialize instantly
    return game;
  },
  inputSchema: {
    actions: ["action1"]
  },
  assets: {}
};

describe("GameSession orchestrator", () => {
  it("should successfully run simulation ticks, track input history, and emit events", () => {
    const session = new GameSession(mockDefinition, 7777);

    expect(session.id).toBe("session-1");
    expect(session.playerId).toBe("local-player");
    expect(session.seed).toBe(7777);
    expect(session.simulation.tick).toBe(0);

    const emitted: any[] = [];
    const eventBus = (session.simulation as any).eventBus;
    eventBus.on("session:tick", (data: any) => {
      emitted.push(data);
    });

    const frame1: CompactInputFrame = { t: 1, b: 2 };
    session.playTick(frame1);

    expect(session.simulation.tick).toBe(1);
    expect(session.getInputsHistory()).toEqual([frame1]);
    expect(emitted.length).toBe(1);
    expect(emitted[0].tick).toBe(1);
    expect(emitted[0].state.score).toBe(100);

    const replay = session.getReplay();
    expect(replay.seed).toBe(7777);
    expect(replay.inputs.length).toBe(1);
    expect(replay.inputs[0]).toEqual(frame1);
  });
});
