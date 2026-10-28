import { World } from "../../ecs/World";
import { applyInputFrameToEntity } from "../../network/InputComponentFactory";
import { RollbackSimulation } from "../../network/RollbackSimulation";
import { SnapshotBuffer } from "../SnapshotBuffer";
import { Simulation } from "../../runtime/Simulation";
import { BaseGame } from "../../runtime/BaseGame";
import { CompactInputFrame } from "../../input/InputFrame";
import { MultiplayerReconciler } from "../../network/MultiplayerReconciler";

type FailingTestFunction = (name: string, fn: () => void | Promise<void>) => void;
type TestWithFailing = typeof test & { failing: FailingTestFunction };
const testFailing = (test as TestWithFailing).failing;

function hasActionLocal(actions: unknown, actionName: string): boolean {
  if (!actions) return false;
  if (actions instanceof Set) {
    return actions.has(actionName);
  }
  if (Array.isArray(actions)) {
    return actions.includes(actionName);
  }
  if (typeof actions === "object") {
    return Boolean((actions as Record<string, boolean>)[actionName]);
  }
  return false;
}

function createSimulationAdapter(world: World): Simulation {
  return {
    get tick() {
      return world.tick;
    },
    get state() {
      return {};
    },
    step() {
      world.advanceTick();
    },
    snapshot() {
      return world.snapshot();
    },
    restore(snapshot) {
      world.restore(snapshot);
    },
    hash() {
      return "hash";
    }
  };
}

describe("Input.actions Characterization Tests", () => {
  describe("Format: Set", () => {
    function setupWorldWithSet(): { world: World; entityId: number } {
      const world = new World();
      const entityId = world.createEntity();
      applyInputFrameToEntity(world, entityId, { actions: ["thrust"], axes: {} });
      return { world, entityId };
    }

    it("a) AoS snapshot -> restore", () => {
      const { world, entityId } = setupWorldWithSet();
      const snap = world.snapshot();
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("b) SoA snapshot -> restore", () => {
      const { world, entityId } = setupWorldWithSet();
      world.setResource("UseSoASnapshots", true);
      const snap = world.snapshot();
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("c) JSON replication (JSON.parse(JSON.stringify(snapshot)))", () => {
      const { world, entityId } = setupWorldWithSet();
      const snap = JSON.parse(JSON.stringify(world.snapshot()));
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("d) RollbackSimulation cycle", () => {
      const { world, entityId } = setupWorldWithSet();
      const sim = createSimulationAdapter(world);
      const buffer = new SnapshotBuffer(10);
      const rollback = new RollbackSimulation(sim, buffer);

      buffer.saveSnapshot(1, sim.snapshot());
      sim.step({ t: 1, b: 0 });

      const inputsHistory = new Map();
      inputsHistory.set(1, { t: 1, b: 0 });
      inputsHistory.set(2, { t: 2, b: 0 });

      rollback.processRollback(1, { t: 1, b: 0 }, 2, inputsHistory);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });
  });

  describe("Format: Record<string, boolean>", () => {
    function setupWorldWithRecord(): { world: World; entityId: number } {
      const world = new World();
      const entityId = world.createEntity();
      world.addComponent(entityId, {
        type: "Input" as never,
        actions: { thrust: true } as never,
        axes: {}
      } as never);
      return { world, entityId };
    }

    it("a) AoS snapshot -> restore", () => {
      const { world, entityId } = setupWorldWithRecord();
      const snap = world.snapshot();
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("b) SoA snapshot -> restore", () => {
      const { world, entityId } = setupWorldWithRecord();
      world.setResource("UseSoASnapshots", true);
      const snap = world.snapshot();
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("c) JSON replication (JSON.parse(JSON.stringify(snapshot)))", () => {
      const { world, entityId } = setupWorldWithRecord();
      const snap = JSON.parse(JSON.stringify(world.snapshot()));
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("d) RollbackSimulation cycle", () => {
      const { world, entityId } = setupWorldWithRecord();
      const sim = createSimulationAdapter(world);
      const buffer = new SnapshotBuffer(10);
      const rollback = new RollbackSimulation(sim, buffer);

      buffer.saveSnapshot(1, sim.snapshot());
      sim.step({ t: 1, b: 0 });

      const inputsHistory = new Map();
      inputsHistory.set(1, { t: 1, b: 0 });
      inputsHistory.set(2, { t: 2, b: 0 });

      rollback.processRollback(1, { t: 1, b: 0 }, 2, inputsHistory);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });
  });

  describe("Format: string[] (Array)", () => {
    function setupWorldWithArray(): { world: World; entityId: number } {
      const world = new World();
      const entityId = world.createEntity();
      world.addComponent(entityId, {
        type: "Input" as never,
        actions: ["thrust"] as never,
        axes: {}
      } as never);
      return { world, entityId };
    }

    it("a) AoS snapshot -> restore", () => {
      const { world, entityId } = setupWorldWithArray();
      const snap = world.snapshot();
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("b) SoA snapshot -> restore", () => {
      const { world, entityId } = setupWorldWithArray();
      world.setResource("UseSoASnapshots", true);
      const snap = world.snapshot();
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("c) JSON replication (JSON.parse(JSON.stringify(snapshot)))", () => {
      const { world, entityId } = setupWorldWithArray();
      const snap = JSON.parse(JSON.stringify(world.snapshot()));
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("d) RollbackSimulation cycle", () => {
      const { world, entityId } = setupWorldWithArray();
      const sim = createSimulationAdapter(world);
      const buffer = new SnapshotBuffer(10);
      const rollback = new RollbackSimulation(sim, buffer);

      buffer.saveSnapshot(1, sim.snapshot());
      sim.step({ t: 1, b: 0 });

      const inputsHistory = new Map();
      inputsHistory.set(1, { t: 1, b: 0 });
      inputsHistory.set(2, { t: 2, b: 0 });

      rollback.processRollback(1, { t: 1, b: 0 }, 2, inputsHistory);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });
  });

  describe("Rollback & Reconciler Additional Characterization Tests", () => {
    it("a) Real onApplyInputFrame: actions is retained after restore and resimulation tick", async () => {
      class TestGameWithInputFrame extends BaseGame<Record<string, unknown>, Record<string, unknown>> {
        constructor() {
          super({ headless: true, manualLoop: true, gameOptions: { seed: 123 } });
        }
        public override update(_dt: number): void {}
        protected override onApplyInputFrame(input: CompactInputFrame): void {
          const players = this.world.query("LocalPlayer" as never);
          for (const ent of players) {
            applyInputFrameToEntity(this.world, ent, {
              actions: input.b === 1 ? ["thrust"] : [],
              axes: {}
            });
          }
        }
        protected override async onInitializeEntities(): Promise<void> {
          const { entity, add } = this.createBaseEntity();
          add({ type: "LocalPlayer" as never } as never);
          applyInputFrameToEntity(this.world, entity, { actions: ["thrust"], axes: {} });
        }
        public override getGameState(): Record<string, unknown> { return {}; }
        public override isGameOver(): boolean { return false; }
      }

      const game = new TestGameWithInputFrame();
      await game.init();
      const localEnt = game.world.query("LocalPlayer" as never)[0];

      const snap = game.snapshot();
      // Step with input b: 1
      game.step({ t: 1, b: 1 });

      // Restore snapshot and re-step with input b: 1
      game.restore(snap);
      game.step({ t: 1, b: 1 });

      const inputComp = game.world.getComponent(localEnt, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("b) Remote entity whose input is NOT re-applied: actions after MultiplayerReconciler.reconcile restore", async () => {
      class TestGameWithRemotePlayer extends BaseGame<Record<string, unknown>, Record<string, unknown>> {
        constructor() {
          super({ headless: true, manualLoop: true, gameOptions: { seed: 123 } });
        }
        public override update(_dt: number): void {}
        protected override onApplyInputFrame(input: CompactInputFrame): void {
          const players = this.world.query("LocalPlayer" as never);
          for (const ent of players) {
            applyInputFrameToEntity(this.world, ent, {
              actions: input.b === 1 ? ["thrust"] : [],
              axes: {}
            });
          }
        }
        protected override async onInitializeEntities(): Promise<void> {
          const { entity: localEnt, add: addLocal } = this.createBaseEntity();
          addLocal({ type: "LocalPlayer" as never } as never);
          applyInputFrameToEntity(this.world, localEnt, { actions: ["thrust"], axes: {} });

          const { entity: remoteEnt, add: addRemote } = this.createBaseEntity();
          addRemote({ type: "RemotePlayer" as never } as never);
          applyInputFrameToEntity(this.world, remoteEnt, { actions: ["thrust"], axes: {} });
        }
        public override getGameState(): Record<string, unknown> { return {}; }
        public override isGameOver(): boolean { return false; }
      }

      const clientGame = new TestGameWithRemotePlayer();
      await clientGame.init();

      const rollbackBuffer = new SnapshotBuffer(10);
      const reconciler = new MultiplayerReconciler(clientGame, rollbackBuffer);

      rollbackBuffer.saveSnapshot(0, clientGame.snapshot());
      clientGame.step({ t: 0, b: 1 });
      reconciler.logPrediction(0, { t: 0, b: 1 }, clientGame.hash());

      const remoteEnt = clientGame.world.query("RemotePlayer" as never)[0];
      const serverSnap = clientGame.snapshot();

      // Trigger reconcile with a mismatched hash to force restore
      reconciler.reconcile(0, serverSnap, "different_hash_forces_rollback", 1);

      const inputComp = clientGame.world.getComponent(remoteEnt, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });
  });
});
