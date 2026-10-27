import { World } from "../../ecs/World";
import { applyInputFrameToEntity } from "../../network/InputComponentFactory";
import { RollbackSimulation } from "../../network/RollbackSimulation";
import { SnapshotBuffer } from "../SnapshotBuffer";
import { Simulation } from "../../runtime/Simulation";

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

function createPureSimulationAdapter(world: World): Simulation {
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

function createReapplyingSimulationAdapter(world: World): Simulation {
  return {
    get tick() {
      return world.tick;
    },
    get state() {
      return {};
    },
    step() {
      world.advanceTick();
      const playerEntity = world.query("Input")[0];
      if (playerEntity !== undefined) {
        applyInputFrameToEntity(world, playerEntity, { actions: ["thrust"], axes: {} });
      }
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
  describe("Format: Canonical Action Array (applyInputFrameToEntity)", () => {
    function setupWorldWithInputFrame(): { world: World; entityId: number } {
      const world = new World();
      const entityId = world.createEntity();
      applyInputFrameToEntity(world, entityId, { actions: ["thrust"], axes: {} });
      return { world, entityId };
    }

    it("a) AoS snapshot -> restore retains canonical action array", () => {
      const { world, entityId } = setupWorldWithInputFrame();
      const snap = world.snapshot();
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("b) SoA snapshot -> restore retains canonical action array", () => {
      const { world, entityId } = setupWorldWithInputFrame();
      world.setResource("UseSoASnapshots", true);
      const snap = world.snapshot();
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("c) JSON replication retains canonical action array", () => {
      const { world, entityId } = setupWorldWithInputFrame();
      const snap = JSON.parse(JSON.stringify(world.snapshot()));
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    it("d) RollbackSimulation cycle retains canonical action array", () => {
      const { world, entityId } = setupWorldWithInputFrame();
      const sim = createPureSimulationAdapter(world);
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

  describe("Rollback re-application paths", () => {
    it("a) Local player re-applying input frame on resimulation step retains active action", () => {
      const world = new World();
      const entityId = world.createEntity();
      applyInputFrameToEntity(world, entityId, { actions: ["thrust"], axes: {} });

      const sim = createReapplyingSimulationAdapter(world);
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

    it("b) Remote entity with canonical action array retains actions after restore", () => {
      const world = new World();
      const remoteEntity = world.createEntity();
      applyInputFrameToEntity(world, remoteEntity, { actions: ["thrust"], axes: {} });

      const snap = world.snapshot();
      world.restore(snap);

      const inputComp = world.getComponent(remoteEntity, "Input" as never) as { actions: unknown } | undefined;
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
      const sim = createPureSimulationAdapter(world);
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
      const sim = createPureSimulationAdapter(world);
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
});
