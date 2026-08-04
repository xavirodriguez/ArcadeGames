import { World } from "../ecs/World";
import { LocalPredictionSystem } from "../network/LocalPredictionSystem";
import { RemoteInterpolationSystem } from "../network/RemoteInterpolationSystem";
import { NetworkManager } from "../network/NetworkManager";

describe("LocalPredictionSystem and RemoteInterpolationSystem customization", () => {
  let world: World<any, any, any>;
  let manager: NetworkManager;

  beforeEach(() => {
    world = new World();
    manager = new NetworkManager();
    world.setResource("EventBus", { emit: jest.fn(), on: jest.fn() });
  });

  test("LocalPredictionSystem should allow custom query components and custom reconcile override", () => {
    const customReconcileFn = jest.fn();
    const system = new LocalPredictionSystem(
      manager,
      undefined,
      ["Transform", "LocalPlayer", "Velocity", "CustomComp"],
      ["Transform", "LocalPlayer", "Velocity", "CustomComp"],
      customReconcileFn
    );

    // Register components to avoid exceptions in dev mode
    world.registerComponentMetadata("Transform", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("LocalPlayer", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("Velocity", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("CustomComp", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("Input", { allowMutationDuringUpdate: true });

    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(entity, { type: "LocalPlayer" });
    world.addComponent(entity, { type: "Velocity", vx: 10, vy: 20, angularVelocity: 0 });
    world.addComponent(entity, { type: "Input", actions: new Set(), axes: {} });
    world.addComponent(entity, { type: "CustomComp" });

    // Update to populate inputQueue
    system.update(world, 0.1);

    // Trigger reconciliation with -1 so that the tick 0 item is not filtered out
    system.reconcile(world, -1, { x: 5, y: 5, vx: 10, vy: 20 });

    // Our custom reconciliation fn should be called instead of the default physics formula!
    expect(customReconcileFn).toHaveBeenCalled();
  });

  test("RemoteInterpolationSystem should use custom smoothingFactor and query components", () => {
    const system = new RemoteInterpolationSystem(
      manager,
      0.5, // 50% smoothing instead of 15%
      ["Transform", "RemotePlayer", "CustomComp"]
    );

    world.registerComponentMetadata("Transform", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("RemotePlayer", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("CustomComp", { allowMutationDuringUpdate: true });

    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(entity, { type: "RemotePlayer", targetX: 100, targetY: 100 });
    world.addComponent(entity, { type: "CustomComp" });

    // Update with dt=1/60 (which represents 1 frame)
    system.update(world, 1 / 60);

    const transform = world.getComponent(entity, "Transform");
    expect(transform).toBeDefined();
    // With 0.5 smoothing factor, on 1 frame, delta position is (100 - 0) * 0.5 = 50
    expect(transform!.x).toBeCloseTo(50);
    expect(transform!.y).toBeCloseTo(50);
  });
});
