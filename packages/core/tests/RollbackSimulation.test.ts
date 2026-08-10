import { BaseGame } from "../src/runtime/BaseGame";
import { CompactInputFrame } from "../src/input/InputFrame";
import { SnapshotBuffer } from "../src/snapshots/SnapshotBuffer";
import { RollbackSimulation } from "../src/network/RollbackSimulation";

interface TestState {
  score: number;
}

class RollbackTestGame extends BaseGame<TestState, any> {
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
        // System updates state based on input button value
        const ents = world.query("Val" as any);
        for (const ent of ents) {
          world.mutateComponent(ent, "Val" as any, (p: any) => {
            // Let's increment position based on world.gameplayRandom and input buttons
            const movement = world.gameplayRandom.range(1, 5) * (p.buttonPressed || 1);
            p.x += movement;
          });
        }
      },
      dispose: () => {}
    });
  }

  protected override onApplyInputFrame(input: CompactInputFrame): void {
    const ents = this.world.query("Val" as any);
    for (const ent of ents) {
      this.world.mutateComponent(ent, "Val" as any, (p: any) => {
        p.buttonPressed = input.b;
      });
    }
  }

  protected override async onInitializeEntities(): Promise<void> {
    const { entity, add } = this.createBaseEntity();
    add({ type: "Val" as any, x: 10, buttonPressed: 0 } as any);
  }

  public override getGameState(): TestState {
    return { score: 0 };
  }

  public override isGameOver(): boolean {
    return false;
  }
}

describe("Rollback and Resimulation Engine", () => {
  it("should successfully execute rollback and yield identical state to a fresh playthrough with corrected inputs", async () => {
    // 1. Playthrough with predicted inputs (buttons: tick1 = 1, tick2 = 1, tick3 = 1)
    const predictedGame = new RollbackTestGame(12345);
    await predictedGame.init();

    const predictedInputs = new Map<number, CompactInputFrame>();
    const predictedBuffer = new SnapshotBuffer(10);

    const inputs: CompactInputFrame[] = [
      { t: 0, b: 1 },
      { t: 1, b: 1 },
      { t: 2, b: 1 }, // Predicted button = 1 at tick 2
      { t: 3, b: 1 },
      { t: 4, b: 1 }
    ];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      // Save snapshot BEFORE the step (so snapshot(T) represents the state at tick T BEFORE step T is executed)
      predictedBuffer.saveSnapshot(input.t, predictedGame.snapshot());
      predictedGame.step(input);
      predictedInputs.set(input.t, input);
    }

    // 2. Playthrough with corrected inputs from the start (tick 2 button = 5 instead of 1)
    const authoritativeGame = new RollbackTestGame(12345);
    await authoritativeGame.init();

    const authInputs: CompactInputFrame[] = [
      { t: 0, b: 1 },
      { t: 1, b: 1 },
      { t: 2, b: 5 }, // Corrected button = 5 at tick 2
      { t: 3, b: 1 },
      { t: 4, b: 1 }
    ];

    for (const input of authInputs) {
      authoritativeGame.step(input);
    }

    const expectedFinalHash = authoritativeGame.hash();

    // 3. Perform Rollback on the predicted game at tick 2
    const rollbackSystem = new RollbackSimulation(predictedGame, predictedBuffer);
    const correctedInputFrame: CompactInputFrame = { t: 2, b: 5 };

    const rollbackSuccess = rollbackSystem.processRollback(
      2, // Rollback to tick 2
      correctedInputFrame, // Apply corrected input at tick 2
      4, // Current predicted tick index before rollback
      predictedInputs // Passpredicted inputs map to resimulate up to current tick
    );

    expect(rollbackSuccess).toBe(true);

    // 4. Assert that after rollback and resimulation, state hashes match perfectly!
    expect(predictedGame.hash()).toBe(expectedFinalHash);

    const predEnt = predictedGame.world.query("Val" as any)[0];
    const authEnt = authoritativeGame.world.query("Val" as any)[0];
    const predComp = predictedGame.world.getComponent(predEnt, "Val" as any) as any;
    const authComp = authoritativeGame.world.getComponent(authEnt, "Val" as any) as any;

    expect(predComp.x).toBe(authComp.x);
    expect(predComp.buttonPressed).toBe(authComp.buttonPressed);
  });
});
