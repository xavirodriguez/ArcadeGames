import { World } from "../ecs/World";
import { LocalPredictionSystem } from "../network/LocalPredictionSystem";
import { RemoteInterpolationSystem } from "../network/RemoteInterpolationSystem";
import { NetworkManager } from "../network/NetworkManager";
import {
  IPredictionModel,
  IInterpolationModel,
  LinearPredictionModel,
  ExponentialSmoothingModel,
  AuthoritativeServerState
} from "../network/types";

describe("LocalPredictionSystem and RemoteInterpolationSystem customization", () => {
  let world: World<any, any, any>;
  let manager: NetworkManager<any>;

  beforeEach(() => {
    world = new World();
    manager = new NetworkManager<any>();
    world.setResource("EventBus", { emit: jest.fn(), on: jest.fn() });
  });

  test("LocalPredictionSystem should allow legacy positional custom query components and custom reconcile override", () => {
    const customReconcileFn = jest.fn();
    const system = new LocalPredictionSystem(
      manager,
      undefined,
      ["Transform", "LocalPlayer", "Velocity", "CustomComp"],
      ["Transform", "LocalPlayer", "Velocity", "CustomComp"],
      customReconcileFn
    );

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

    system.update(world, 0.1);
    system.reconcile(world, -1, { x: 5, y: 5, vx: 10, vy: 20 });

    expect(customReconcileFn).toHaveBeenCalled();
  });

  test("RemoteInterpolationSystem should use custom smoothingFactor and query components", () => {
    const system = new RemoteInterpolationSystem(
      manager,
      0.5,
      ["Transform", "RemotePlayer", "CustomComp"]
    );

    world.registerComponentMetadata("Transform", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("RemotePlayer", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("CustomComp", { allowMutationDuringUpdate: true });

    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(entity, { type: "RemotePlayer", targetX: 100, targetY: 100 });
    world.addComponent(entity, { type: "CustomComp" });

    system.update(world, 1 / 60);

    const transform = world.getComponent(entity, "Transform");
    expect(transform).toBeDefined();
    expect(transform!.x).toBeCloseTo(50);
    expect(transform!.y).toBeCloseTo(50);
  });

  test("LocalPredictionSystem delegates to custom IPredictionModel injected via options object", () => {
    const simulateSpy = jest.fn();
    const applyStateSpy = jest.fn();

    const customModel: IPredictionModel<any> = {
      queryComponents: ["Transform", "LocalPlayer", "Velocity", "Input"],
      simulate: simulateSpy,
      applyAuthoritativeState: applyStateSpy
    };

    const system = new LocalPredictionSystem(manager, { predictionModel: customModel });

    world.registerComponentMetadata("Transform", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("LocalPlayer", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("Velocity", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("Input", { allowMutationDuringUpdate: true });

    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(entity, { type: "LocalPlayer" });
    world.addComponent(entity, { type: "Velocity", vx: 5, vy: 5, angularVelocity: 0 });
    world.addComponent(entity, { type: "Input", actions: new Set(), axes: {} });

    system.update(world, 0.1);
    expect(simulateSpy).toHaveBeenCalledTimes(1);

    const serverState: AuthoritativeServerState = { x: 10, y: 20, vx: 1, vy: 2 };
    system.reconcile(world, -1, serverState);

    expect(applyStateSpy).toHaveBeenCalledWith(world, entity, serverState);
    expect(simulateSpy).toHaveBeenCalledTimes(2);
  });

  test("RemoteInterpolationSystem delegates to custom IInterpolationModel injected via options object", () => {
    const interpolateSpy = jest.fn();
    const customInterpolationModel: IInterpolationModel<any> = {
      queryComponents: ["Transform", "RemotePlayer"],
      interpolate: interpolateSpy
    };

    const system = new RemoteInterpolationSystem(manager, { interpolationModel: customInterpolationModel });

    world.registerComponentMetadata("Transform", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("RemotePlayer", { allowMutationDuringUpdate: true });

    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(entity, { type: "RemotePlayer", targetX: 200, targetY: 200 });

    system.update(world, 0.016);
    expect(interpolateSpy).toHaveBeenCalledTimes(1);
    expect(interpolateSpy).toHaveBeenCalledWith(world, entity, expect.objectContaining({ targetX: 200, targetY: 200 }), 0.016);
  });

  test("LocalPredictionSystem default LinearPredictionModel computes position correctly and reconcile matches", () => {
    const systemWithDefaultModel = new LocalPredictionSystem(manager);
    const systemWithExplicitLinearModel = new LocalPredictionSystem(manager, {
      predictionModel: new LinearPredictionModel()
    });

    world.registerComponentMetadata("Transform", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("LocalPlayer", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("Velocity", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("Input", { allowMutationDuringUpdate: true });

    const entity1 = world.createEntity();
    world.addComponent(entity1, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(entity1, { type: "LocalPlayer" });
    world.addComponent(entity1, { type: "Velocity", vx: 100, vy: 50, angularVelocity: 0 });
    world.addComponent(entity1, { type: "Input", actions: new Set(), axes: {} });

    systemWithDefaultModel.update(world, 0.1);
    let t1 = world.getComponent(entity1, "Transform")!;
    expect(t1.x).toBeCloseTo(10);
    expect(t1.y).toBeCloseTo(5);

    // Reconcile with server state
    systemWithDefaultModel.reconcile(world, -1, { x: 50, y: 50, vx: 100, vy: 50 });
    t1 = world.getComponent(entity1, "Transform")!;
    expect(t1.x).toBeCloseTo(60); // 50 server state + (100 * 0.1 dt) re-simulated
    expect(t1.y).toBeCloseTo(55); // 50 server state + (50 * 0.1 dt) re-simulated

    const world2: World<any> = new World();
    world2.registerComponentMetadata("Transform", { allowMutationDuringUpdate: true });
    world2.registerComponentMetadata("LocalPlayer", { allowMutationDuringUpdate: true });
    world2.registerComponentMetadata("Velocity", { allowMutationDuringUpdate: true });
    world2.registerComponentMetadata("Input", { allowMutationDuringUpdate: true });

    const entity2 = world2.createEntity();
    world2.addComponent(entity2, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world2.addComponent(entity2, { type: "LocalPlayer" });
    world2.addComponent(entity2, { type: "Velocity", vx: 100, vy: 50, angularVelocity: 0 });
    world2.addComponent(entity2, { type: "Input", actions: new Set(), axes: {} });

    systemWithExplicitLinearModel.update(world2, 0.1);
    systemWithExplicitLinearModel.reconcile(world2, -1, { x: 50, y: 50, vx: 100, vy: 50 });
    const t2 = world2.getComponent(entity2, "Transform")!;

    expect(t1.x).toBeCloseTo(t2.x);
    expect(t1.y).toBeCloseTo(t2.y);
  });

  test("RemoteInterpolationSystem default ExponentialSmoothingModel works as expected", () => {
    const defaultSystem = new RemoteInterpolationSystem(manager);
    const explicitSystem = new RemoteInterpolationSystem(manager, {
      interpolationModel: new ExponentialSmoothingModel(0.15)
    });

    world.registerComponentMetadata("Transform", { allowMutationDuringUpdate: true });
    world.registerComponentMetadata("RemotePlayer", { allowMutationDuringUpdate: true });

    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(entity, { type: "RemotePlayer", targetX: 100, targetY: 100 });

    defaultSystem.update(world, 1 / 60);
    const t1 = world.getComponent(entity, "Transform")!;
    expect(t1.x).toBeGreaterThan(0);
    expect(t1.x).toBeLessThan(100);

    const world2: World<any> = new World();
    world2.registerComponentMetadata("Transform", { allowMutationDuringUpdate: true });
    world2.registerComponentMetadata("RemotePlayer", { allowMutationDuringUpdate: true });

    const entity2 = world2.createEntity();
    world2.addComponent(entity2, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world2.addComponent(entity2, { type: "RemotePlayer", targetX: 100, targetY: 100 });

    explicitSystem.update(world2, 1 / 60);
    const t2 = world2.getComponent(entity2, "Transform")!;

    expect(t1.x).toBeCloseTo(t2.x);
    expect(t1.y).toBeCloseTo(t2.y);
  });
});
