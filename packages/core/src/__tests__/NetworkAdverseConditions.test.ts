import { World } from "../ecs/World";
import { LocalPredictionSystem } from "../network/LocalPredictionSystem";
import { NetworkManager } from "../network/NetworkManager";
import { TestTransport } from "../network/TestTransport";
import { LinearPredictionModel } from "../network/types";

describe("LocalPredictionSystem under Adverse Network Conditions", () => {
  let world: World<any>;
  let transport: TestTransport;
  let manager: NetworkManager<any>;

  beforeEach(() => {
    world = new World();
    transport = new TestTransport();
    manager = new NetworkManager<any>(transport);
    world.setResource("EventBus", { emit: jest.fn(), on: jest.fn() });

    world.registerComponentMetadata("Transform", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("LocalPlayer", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("Velocity", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("Input", { allowMutationDuringUpdate: true });
  });

  it("should record client prediction and reconcile local player position when server snapshots arrive late", () => {
    const predictionSystem = new LocalPredictionSystem(manager, {
      predictionModel: new LinearPredictionModel()
    });

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(entity, { type: "LocalPlayer" });
    world.addComponent(entity, { type: "Velocity", vx: 100, vy: 0, angularVelocity: 0 });
    world.addComponent(entity, { type: "Input", actions: new Set(), axes: { moveX: 1 } });

    // Client predicts 3 ticks (dt = 0.1s each tick -> total predicted movement = 30 units)
    predictionSystem.update(world, 0.1);
    predictionSystem.update(world, 0.1);
    predictionSystem.update(world, 0.1);

    const predictedTransform = world.getComponent(entity, "Transform")!;
    expect(predictedTransform.x).toBeCloseTo(30);

    // Delayed server snapshot arrives for tick 0 (at server position x = 10, vx = 100)
    // LocalPredictionSystem reconciles tick 0 and replays remaining unacknowledged ticks (ticks 1 and 2)
    predictionSystem.reconcile(world, 0, { x: 10, y: 0, vx: 100, vy: 0 });

    const reconciledTransform = world.getComponent(entity, "Transform")!;
    // Reconciled position = server position 10 + (2 remaining ticks * 10) = 30
    expect(reconciledTransform.x).toBeCloseTo(30);
  });

  it("should correctly handle server corrections when server position diverges from predicted position", () => {
    const predictionSystem = new LocalPredictionSystem(manager, {
      predictionModel: new LinearPredictionModel()
    });

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(entity, { type: "LocalPlayer" });
    world.addComponent(entity, { type: "Velocity", vx: 100, vy: 0, angularVelocity: 0 });
    world.addComponent(entity, { type: "Input", actions: new Set(), axes: { moveX: 1 } });

    // Client predicts 2 ticks (x becomes 20)
    predictionSystem.update(world, 0.1);
    predictionSystem.update(world, 0.1);

    // Server snapshot arrives for tick 0 with x = 5 (diverged due to server obstacle collision)
    predictionSystem.reconcile(world, 0, { x: 5, y: 0, vx: 100, vy: 0 });

    const correctedTransform = world.getComponent(entity, "Transform")!;
    // Reconciled position = server position 5 + (1 remaining tick * 10) = 15
    expect(correctedTransform.x).toBeCloseTo(15);
  });
});
