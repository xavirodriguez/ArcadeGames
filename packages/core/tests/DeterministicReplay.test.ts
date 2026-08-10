import { BaseGame } from "../src/runtime/BaseGame";
import { CompactInputFrame } from "../src/input/InputFrame";
import { DeterministicReplayRecorder, DeterministicReplayPlayer } from "../src/replay/DeterministicReplay";

interface TestState {
  score: number;
}

class ReplayTestGame extends BaseGame<TestState, any> {
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

  protected override async onRegisterSystems(): Promise<void> {
    this.world.registerComponentMetadata("Pos", { allowMutationDuringUpdate: true });
    this.world.addSystem({
      onRegister: () => {},
      update: (world, dt) => {
        const ents = world.query("Pos" as any);
        for (const ent of ents) {
          world.mutateComponent(ent, "Pos" as any, (p: any) => {
            p.x += world.gameplayRandom.range(-1, 1);
          });
        }
      },
      dispose: () => {}
    });
  }

  protected override async onInitializeEntities(): Promise<void> {
    const { entity, add } = this.createBaseEntity();
    add({ type: "Pos" as any, x: 50 } as any);
  }

  public override getGameState(): TestState {
    return { score: 10 };
  }

  public override isGameOver(): boolean {
    return false;
  }
}

describe("Deterministic Replay Player and Recorder", () => {
  it("should record and play back a game simulation with bit-perfect hashes", async () => {
    const game = new ReplayTestGame(9999);
    await game.init();

    const recorder = new DeterministicReplayRecorder("test-game", 9999);
    recorder.captureInitialState(game);

    const inputs: CompactInputFrame[] = [
      { t: 1, b: 1 },
      { t: 2, b: 0 },
      { t: 3, b: 2 },
      { t: 4, b: 1 },
      { t: 5, b: 0 }
    ];

    const originalHashes: string[] = [];

    // Run and record original simulation
    for (const input of inputs) {
      game.step(input);
      recorder.recordFrame(input);
      originalHashes.push(game.hash());
    }

    const replayFile = recorder.compileReplay();

    // Verify replay file contains captured metadata
    expect(replayFile.game).toBe("test-game");
    expect(replayFile.seed).toBe(9999);
    expect(replayFile.inputs.length).toBe(5);

    // Prepare fresh game instance for playback
    const playbackGame = new ReplayTestGame(9999);
    await playbackGame.init();

    const player = new DeterministicReplayPlayer(replayFile);
    player.prepareSimulation(playbackGame);

    const playbackHashes: string[] = [];

    // Run playback frame-by-frame
    while (!player.isFinished()) {
      const advanced = player.playNextTick(playbackGame);
      expect(advanced).toBe(true);
      playbackHashes.push(playbackGame.hash());
    }

    // Assert bit-perfect determinism at every single frame
    expect(playbackHashes).toEqual(originalHashes);
  });
});
