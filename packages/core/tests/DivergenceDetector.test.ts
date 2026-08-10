import { BaseGame } from "../src/runtime/BaseGame";
import { CompactInputFrame } from "../src/input/InputFrame";
import { DeterministicReplayRecorder } from "../src/replay/DeterministicReplay";
import { DivergenceDetector } from "../src/replay/DivergenceDetector";

interface TestState {
  score: number;
}

class DivergenceTestGame extends BaseGame<TestState, any> {
  public forceDivergence = false;
  public divergenceTick = -1;

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
    this.world.registerComponentMetadata("Val", { allowMutationDuringUpdate: true });
    this.world.addSystem({
      onRegister: () => {},
      update: (world, dt) => {
        const ents = world.query("Val" as any);
        for (const ent of ents) {
          world.mutateComponent(ent, "Val" as any, (p: any) => {
            if (this.forceDivergence && world.tick === this.divergenceTick) {
              p.x += 100; // Trigger desync
            } else {
              p.x += 1;
            }
          });
        }
      },
      dispose: () => {}
    });
  }

  protected override async onInitializeEntities(): Promise<void> {
    const { entity, add } = this.createBaseEntity();
    add({ type: "Val" as any, x: 0 } as any);
  }

  public override getGameState(): TestState {
    return { score: 0 };
  }

  public override isGameOver(): boolean {
    return false;
  }
}

describe("Divergence Detector tests", () => {
  it("should pinpoint the exact tick when desync occurs", async () => {
    const game = new DivergenceTestGame(123);
    await game.init();

    const recorder = new DeterministicReplayRecorder("desync-test", 123);
    recorder.captureInitialState(game);

    const inputs: CompactInputFrame[] = [
      { t: 1, b: 0 },
      { t: 2, b: 0 },
      { t: 3, b: 0 },
      { t: 4, b: 0 },
      { t: 5, b: 0 }
    ];

    const originalHashes: string[] = [];

    // Run original playthrough
    for (const input of inputs) {
      game.step(input);
      recorder.recordFrame(input);
      originalHashes.push(game.hash());
    }

    const replayFile = recorder.compileReplay();

    // fresh playthrough WITHOUT desync should return -1 (no divergence)
    const healthyGame = new DivergenceTestGame(123);
    await healthyGame.init();

    const healthyResult = DivergenceDetector.findDivergenceTick(healthyGame, replayFile, originalHashes);
    expect(healthyResult).toBe(-1);

    // fresh playthrough WITH desync on tick 3 should return tick 3
    const desyncGame = new DivergenceTestGame(123);
    await desyncGame.init();
    desyncGame.forceDivergence = true;
    desyncGame.divergenceTick = 3;

    const desyncResult = DivergenceDetector.findDivergenceTick(desyncGame, replayFile, originalHashes);
    expect(desyncResult).toBe(3); // Pinpoints exactly tick 3
  });
});
