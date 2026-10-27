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

    // ComponentCloner.ts:29-45 converts Set to {} during AoS snapshot cloning, losing Set prototype and items.
    testFailing("a) AoS snapshot -> restore", () => {
      const { world, entityId } = setupWorldWithSet();
      const snap = world.snapshot();
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    // ComponentCloner.ts:29-45 converts Set to {} during SoA snapshot cloning when serializing components.
    testFailing("b) SoA snapshot -> restore", () => {
      const { world, entityId } = setupWorldWithSet();
      world.setResource("UseSoASnapshots", true);
      const snap = world.snapshot();
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    // ComponentCloner.ts:29-45 turns Set into {} in snapshot, and JSON.stringify(Set) also produces {}.
    testFailing("c) JSON replication (JSON.parse(JSON.stringify(snapshot)))", () => {
      const { world, entityId } = setupWorldWithSet();
      const snap = JSON.parse(JSON.stringify(world.snapshot()));
      world.restore(snap);

      const inputComp = world.getComponent(entityId, "Input" as never) as { actions: unknown } | undefined;
      expect(hasActionLocal(inputComp?.actions, "thrust")).toBe(true);
    });

    // ComponentCloner.ts:29-45 converts Set to {} when saving snapshot during rollback cycle.
    testFailing("d) RollbackSimulation cycle", () => {
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
        actions: { thrust: true } as unknown,
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
        actions: ["thrust"] as unknown,
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
});
