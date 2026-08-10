import { BaseGame } from "../src/runtime/BaseGame";
import { CompactInputFrame } from "../src/input/InputFrame";
import { SnapshotBuffer } from "../src/snapshots/SnapshotBuffer";
import { MultiplayerReconciler } from "../src/network/MultiplayerReconciler";

interface TestState {
  score: number;
}

class ReconcileTestGame extends BaseGame<TestState, any> {
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
            p.x += (p.buttonPressed || 1);
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
    add({ type: "Val" as any, x: 0, buttonPressed: 0 } as any);
  }

  public override getGameState(): TestState {
    return { score: 0 };
  }

  public override isGameOver(): boolean {
    return false;
  }
}

describe("Multiplayer Reconciler Engine", () => {
  it("should reconcile silently if hashes match, and execute rollback on mismatch", async () => {
    // 1. Client prediction playthrough (inputs buttons: tick0 = 1, tick1 = 1, tick2 = 1)
    const clientGame = new ReconcileTestGame(555);
    await clientGame.init();

    const rollbackBuffer = new SnapshotBuffer(10);
    const reconciler = new MultiplayerReconciler(clientGame, rollbackBuffer);

    const clientInputs: CompactInputFrame[] = [
      { t: 0, b: 1 },
      { t: 1, b: 1 },
      { t: 2, b: 1 }
    ];

    for (const input of clientInputs) {
      rollbackBuffer.saveSnapshot(input.t, clientGame.snapshot());
      clientGame.step(input);
      reconciler.logPrediction(input.t, input, clientGame.hash());
    }

    const postPredictionHash = clientGame.hash();

    // 2. Authoritative server run WITH IDENTICAL inputs (no desync)
    const serverGame = new ReconcileTestGame(555);
    await serverGame.init();

    const serverSnapshots: any[] = [];
    const serverHashes: string[] = [];

    for (const input of clientInputs) {
      serverSnapshots.push(serverGame.snapshot());
      serverGame.step(input);
      serverHashes.push(serverGame.hash());
    }

    // Match check on tick 2 (serverHashes[1] is the state hash AFTER step 1, tick = 2)
    const matched = reconciler.reconcile(
      2, // state at tick 2
      serverSnapshots[2], // server snapshot BEFORE step 2 (tick = 2)
      serverHashes[1], // server hash AFTER step 1 (tick = 2)
      2 // latest predicted local input index
    );

    expect(matched).toBe(true);
    // State hash remains unchanged because it matched
    expect(clientGame.hash()).toBe(postPredictionHash);

    // 3. Authoritative server run WITH DIFFERENT inputs (desync occurred on tick 1, server button was 10 instead of 1)
    const desyncServerGame = new ReconcileTestGame(555);
    await desyncServerGame.init();

    const desyncServerSnapshots: any[] = [];
    const desyncServerHashes: string[] = [];

    const serverCorrectedInputs = [
      { t: 0, b: 1 },
      { t: 1, b: 10 }, // corrected button = 10
      { t: 2, b: 1 }
    ];

    for (const input of serverCorrectedInputs) {
      desyncServerSnapshots.push(desyncServerGame.snapshot());
      desyncServerGame.step(input);
      desyncServerHashes.push(desyncServerGame.hash());
    }

    const expectedFinalHash = desyncServerGame.hash();

    // Client reconciles mismatch at tick 2 (after step 1, where server applied button 10)
    const corrected = reconciler.reconcile(
      2, // state at tick 2
      desyncServerSnapshots[2], // server snapshot before step 2 (with x = 11)
      desyncServerHashes[1], // server hash after step 1
      2 // latest predicted input index
    );

    expect(corrected).toBe(true);
    // Client state hash now perfectly matches corrected server authoritative final state hash!
    expect(clientGame.hash()).toBe(expectedFinalHash);

    const clientEnt = clientGame.world.query("Val" as any)[0];
    const serverEnt = desyncServerGame.world.query("Val" as any)[0];
    const clientComp = clientGame.world.getComponent(clientEnt, "Val" as any) as any;
    const serverComp = desyncServerGame.world.getComponent(serverEnt, "Val" as any) as any;

    expect(clientComp.x).toBe(serverComp.x);
    expect(clientComp.x).toBe(12);
  });
});
