import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { LocalPredictionSystem } from "../src/network/LocalPredictionSystem";
import { RemoteInterpolationSystem } from "../src/network/RemoteInterpolationSystem";
import { NetworkController } from "../src/network/NetworkController";
import { AuthoritativeServerState } from "../src/network/types";
import { computeShipPhysics } from "../src/physics/utils/ShipPhysics";

interface TestRegistry extends CoreComponentRegistry {
  RemotePlayer: { type: "RemotePlayer"; targetX: number; targetY: number; targetRotation: number; sessionId: string };
  LocalPlayer: { type: "LocalPlayer" };
  Input: { type: "Input"; actions: Set<string>; axes: Record<string, number> };
}

describe("ReplicationSystem Tests", () => {
  let world: World<TestRegistry>;
  let localPredictionSystem: LocalPredictionSystem<TestRegistry>;
  let remoteInterpolationSystem: RemoteInterpolationSystem<TestRegistry>;
  let mockNetworkManager: any;

  beforeEach(() => {
    world = new World<TestRegistry>();
    mockNetworkManager = {};
    localPredictionSystem = new LocalPredictionSystem<TestRegistry>(mockNetworkManager, (world, input, dt) => {
      const config = (world.getResource<any>("GameConfig") ?? {
          SHIP_THRUST: 150,
          SHIP_ROTATION_SPEED: Math.PI,
          SHIP_FRICTION: 0.99
      });
      const localQuery = world.query("Transform" as any, "LocalPlayer" as any, "Velocity" as any);
      for (const entity of localQuery) {
          const velocity  = world.getComponent(entity, "Velocity" as any) as any;
          const transform = world.getComponent(entity, "Transform" as any) as any;
          if (!velocity || !transform) continue;

          const tPlane = { rotation: transform.rotation };
          const vPlane = { vx: velocity.vx, vy: velocity.vy };

          const phys = computeShipPhysics(tPlane, vPlane, input as any, config, dt);

          world.mutateComponent(entity, "Velocity" as any, (v: any) => {
              v.vx = phys.vx;
              v.vy = phys.vy;
          });
          world.mutateComponent(entity, "Transform" as any, (t: any) => {
              t.rotation = phys.rotation;
          });
      }
    });
    remoteInterpolationSystem = new RemoteInterpolationSystem<TestRegistry>(mockNetworkManager);

    // Explicitly configure GameConfig for tests to have 0.0 friction as assumed by test expectations
    world.setResource("GameConfig", {
        SHIP_THRUST: 150,
        SHIP_ROTATION_SPEED: Math.PI,
        SHIP_FRICTION: 0.0
    });
  });

  it("debería realizar Client-Side Prediction y almacenar inputs con deltaTime real", () => {
    const localPlayer = world.createEntity();

    world.addComponent(localPlayer, {
      type: "Transform",
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });

    world.addComponent(localPlayer, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });

    world.addComponent(localPlayer, {
      type: "LocalPlayer",
    });

    world.addComponent(localPlayer, {
      type: "Input",
      actions: new Set(["thrust"]),
      axes: {},
    });

    // Tick 1: deltaTime = 0.02s
    localPredictionSystem.update(world, 0.02);

    const velocity = world.getComponent(localPlayer, "Velocity")!;
    // El thrust aplica una aceleración (power = 150) modificando la velocidad
    // vx = ax * 0.02 = cos(0) * 150 * 0.02 = 3
    expect(velocity.vx).toBeCloseTo(3, 4);
    expect(velocity.vy).toBe(0);

    // Tick 2: deltaTime = 0.03s con thrust desactivado
    world.mutateComponent(localPlayer, "Input", (input) => {
      const acts = input.actions;
      const actionsSet = acts instanceof Set ? acts : new Set<string>((acts && typeof (acts as any)[Symbol.iterator] === "function") ? acts : []);
      actionsSet.delete("thrust");
      input.actions = actionsSet;
    });

    localPredictionSystem.update(world, 0.03);

    // La velocidad no debería aumentar en este tick
    expect(velocity.vx).toBeCloseTo(3, 4);
  });

  it("debería realizar reconciliación y replay determinista usando deltaTimes guardados", () => {
    const localPlayer = world.createEntity();

    world.addComponent(localPlayer, {
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
      dirty: false,
    });

    world.addComponent(localPlayer, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });

    world.addComponent(localPlayer, {
      type: "LocalPlayer",
    });

    world.addComponent(localPlayer, {
      type: "Input",
      actions: new Set(["thrust"]),
      axes: {},
    });

    // Simulamos 2 updates del cliente locales con distintos deltas de tiempo
    // Tick 0: dt = 0.016s, thrust = true
    localPredictionSystem.update(world, 0.016);
    // Tick 1: dt = 0.025s, thrust = true
    localPredictionSystem.update(world, 0.025);

    // Posición estimada actual del cliente:
    // En tick 0 (dt=0.016): vx se convierte en cos(0) * 150 * 0.016 = 2.4
    // En tick 1 (dt=0.025): vx se convierte en 2.4 + cos(0) * 150 * 0.025 = 2.4 + 3.75 = 6.15

    // Ahora recibimos una actualización autoritativa del servidor para el Tick 0
    // El servidor dice que en Tick 0 el jugador estaba en x = 5, y = 0 con vx = 2.4, vy = 0
    const serverState: AuthoritativeServerState = {
      x: 5,
      y: 0,
      vx: 2.4,
      vy: 0,
    };

    // Reconciliamos el Tick 0 (lo que descarta la entrada del Tick 0 y hace replay de la entrada de Tick 1 con dt = 0.025s)
    localPredictionSystem.reconcile(world, 0, serverState);

    const transform = world.getComponent(localPlayer, "Transform")!;
    const velocity = world.getComponent(localPlayer, "Velocity")!;

    // Esperado tras el replay del Tick 1 (dt = 0.025s) partiendo del estado del servidor (x=5, vx=2.4):
    // 1. Reset al estado del servidor: x = 5, vx = 2.4
    // 2. Replay Tick 1 (thrust = true, dt = 0.025s):
    //    vx_final = 2.4 + (cos(0) * 150 * 0.025) = 2.4 + 3.75 = 6.15
    //    x_final = 5 + (vx_final * 0.025) = 5 + (6.15 * 0.025) = 5 + 0.15375 = 5.15375
    expect(velocity.vx).toBeCloseTo(6.15, 4);
    expect(transform.x).toBeCloseTo(5.15375, 5);
  });

  it("debería realizar interpolación lineal (Lerp) para entidades remotas", () => {
    const remotePlayer = world.createEntity();

    world.addComponent(remotePlayer, {
      type: "Transform",
      x: 10,
      y: 20,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 10,
      worldY: 20,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });

    world.addComponent(remotePlayer, {
      type: "RemotePlayer",
      targetX: 20,
      targetY: 40,
      targetRotation: Math.PI / 2,
      sessionId: "remote-1",
    });

    // Aseguramos que el test remoto no se vea alterado por el GameConfig
    remoteInterpolationSystem.update(world, 16 / 1000);

    const transform = world.getComponent(remotePlayer, "Transform")!;
    // With new framerate independent alpha = 1 - Math.pow(0.85, 0.016 * 60) = 1 - Math.pow(0.85, 0.96) = 0.14463636...
    // x = 10 + (20 - 10) * alpha = 10 + 10 * 0.14463636 = 11.44636
    // y = 20 + (40 - 20) * alpha = 20 + 20 * 0.14463636 = 22.89272
    // rotation = (Math.PI / 2) * alpha = 0.227194
    const expectedAlpha = 1 - Math.pow(1 - 0.15, (16 / 1000) * 60);
    expect(transform.x).toBeCloseTo(10 + 10 * expectedAlpha, 4);
    expect(transform.y).toBeCloseTo(20 + 20 * expectedAlpha, 4);
    expect(transform.rotation).toBeCloseTo((Math.PI / 2) * expectedAlpha, 4);
  });
  it("debería desbloquear y restaurar correctamente el estado de bloqueo de gameplayRandom durante reconcile()", () => {
    // Bloquear el generador aleatorio para simular que está bloqueado durante la reconciliación
    world.gameplayRandom.lock();
    expect(world.gameplayRandom.isLocked()).toBe(true);

    const localPlayer = world.createEntity();
    world.addComponent(localPlayer, {
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
      dirty: false,
    });
    world.addComponent(localPlayer, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });
    world.addComponent(localPlayer, {
      type: "LocalPlayer",
    });
    world.addComponent(localPlayer, {
      type: "Input",
      actions: new Set(["thrust"]),
      axes: {},
    });

    // Añadir un simulateFn que intente generar un número aleatorio
    let randomNum = -1;
    const predictionSystemWithRandom = new LocalPredictionSystem<TestRegistry>(mockNetworkManager, (w) => {
      // Debería poder llamarse sin lanzar excepción porque reconcile desbloquea el generador
      randomNum = w.gameplayRandom.next();
    });

    // Simulamos un update para registrar un input en inputQueue.
    // Desbloqueamos temporalmente ya que en una partida normal update() se ejecuta dentro de Schedule.update() (el cual desbloquea el generador).
    world.gameplayRandom.unlock();
    predictionSystemWithRandom.update(world, 0.016);
    world.gameplayRandom.lock();

    const serverState: AuthoritativeServerState = {
      x: 10,
      y: 10,
      vx: 1,
      vy: 1,
    };

    // Reconciliar. Esto debería ejecutar simulateFn sin arrojar error sobre el contexto bloqueado
    expect(() => {
      predictionSystemWithRandom.reconcile(world, 0, serverState);
    }).not.toThrow();

    // Comprobar que pudimos obtener el número aleatorio correctamente
    expect(randomNum).toBeGreaterThanOrEqual(0);
    expect(randomNum).toBeLessThan(1);

    // Asegurar que restauró el estado de bloqueo (debería volver a estar bloqueado)
    expect(world.gameplayRandom.isLocked()).toBe(true);
  });

  it("debería desbloquear y restaurar correctamente el estado de bloqueo de gameplayRandom durante runSimulationStep()", () => {
    const networkController = new NetworkController<TestRegistry>(world, (dt: number) => {
      // El callback de simulación intenta generar un número aleatorio
      world.gameplayRandom.next();
    });

    world.gameplayRandom.lock();
    expect(world.gameplayRandom.isLocked()).toBe(true);

    // Ejecutar simulation step; no debería lanzar error de Gameplay context is locked
    expect(() => {
      networkController.runSimulationStep(0.016, false);
    }).not.toThrow();

    // Comprobar que vuelve a estar bloqueado al final
    expect(world.gameplayRandom.isLocked()).toBe(true);
  });
});
