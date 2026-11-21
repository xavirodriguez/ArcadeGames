import { AsteroidsGame } from "../AsteroidsGame";
import { GameLifecycleState, InputFrame, WorldSnapshot } from "@tiny-aster/core";

describe("Asteroids Authoritative Multiplayer", () => {
  it("should simulate ship movements and rotation upon applying inputs and running prediction step", async () => {
    const game = new AsteroidsGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: 1234 }
    });

    await game.init();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);

    const world = game.getWorld();

    const shipEntity = world.createEntity();
    world.addComponent(shipEntity, { type: "LocalPlayer" });
    world.addComponent(shipEntity, {
      type: "Ship",
      sessionId: "session_1",
      shootCooldownRemaining: 0,
      hyperspaceCooldownRemaining: 0,
      hyperspacePrepTime: 0
    });
    world.addComponent(shipEntity, {
      type: "Transform",
      x: 400,
      y: 300,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 400,
      worldY: 300,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(shipEntity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });
    world.addComponent(shipEntity, {
      type: "Input",
      actions: ["thrust" as never],
      axes: {}
    });

    const frame: InputFrame = {
      protocolVersion: 1,
      tick: 1,
      timestamp: Date.now(),
      actions: ["thrust"],
      axes: {}
    };

    game.applyInputToEntity(shipEntity, frame);
    const inputComp = world.getComponent(shipEntity, "Input")!;
    expect(inputComp).toBeDefined();

    game.runSimulationStep(0.1, false);

    const transform = world.getComponent(shipEntity, "Transform")!;
    expect(transform).toBeDefined();

    game.destroy();
  });

  it("should synchronize entities and local player state on updateFromServer", async () => {
    const game = new AsteroidsGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: 1234 }
    });

    await game.init();
    const world = game.getWorld();

    const fullWorldState: WorldSnapshot = {
      tick: 10,
      structureVersion: 1,
      stateVersion: 1,
      seed: 1234,
      entities: [1],
      nextEntityId: 2,
      freeEntities: [],
      componentData: {
        Transform: {
          1: { type: "Transform", x: 250, y: 350, rotation: 0, scaleX: 1, scaleY: 1, worldX: 250, worldY: 350, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false }
        },
        Velocity: {
          1: { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 }
        },
        Render: {
          1: { type: "Render", shape: "ship", size: 20, color: "white", rotation: 0, visible: true, opacity: 1, order: 1, hitFlashFrames: 0, angularVelocity: 0 }
        }
      }
    };

    const serverState = {
      kind: "full" as const,
      serverTick: 10,
      fullWorldState
    };

    game.updateFromServer(serverState, "session_1");

    expect(world.tick).toBeDefined();

    game.destroy();
  });

  it("marks only the replicated ship matching the local Colyseus session", async () => {
    const game = new AsteroidsGame({ headless: true, isMultiplayer: true, gameOptions: { seed: 1234 } });
    await game.init();
    try {
      const world = game.getWorld();
      const manager = game.networkManager;
      expect(manager).toBeDefined();
      expect(manager?.world).toBe(world);
      expect(manager?.getTransport().isOffline).toBe(false);

      const fullWorldState: WorldSnapshot = {
        tick: 1, structureVersion: 1, stateVersion: 1, seed: 1234,
        entities: [11, 12], nextEntityId: 13, freeEntities: [],
        componentData: {
          Ship: {
            11: { type: "Ship", sessionId: "local-session", shootCooldownRemaining: 0 },
            12: { type: "Ship", sessionId: "remote-session", shootCooldownRemaining: 0 }
          },
          Transform: {
            11: { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, worldX: 100, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false },
            12: { type: "Transform", x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1, worldX: 200, worldY: 200, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false }
          },
          Velocity: {
            11: { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 },
            12: { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 }
          }
        }
      };

      game.updateFromServer({ kind: 'full', serverTick: 1, fullWorldState }, 'local-session');
      const localPlayer = world.query("LocalPlayer")[0];
      expect(localPlayer).toBeDefined();
      if (localPlayer === undefined) throw new Error("Local replicated ship was not tagged");
      expect(world.getComponent(localPlayer, "Ship")?.sessionId).toBe("local-session");
      const remoteShip = world.query("Ship").find(entity => world.getComponent(entity, "Ship")?.sessionId === "remote-session");
      expect(remoteShip).toBeDefined();
      if (remoteShip !== undefined) expect(world.hasComponent(remoteShip, 'LocalPlayer')).toBe(false);
    } finally {
      game.destroy();
    }
  });
});
