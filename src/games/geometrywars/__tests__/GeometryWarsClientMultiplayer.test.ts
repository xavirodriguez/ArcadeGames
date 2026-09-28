import { GeometryWarsGame } from "../GeometryWarsGame";
import { GameLifecycleState, InputFrame } from "@tiny-aster/core";

describe("Geometry Wars Client Authoritative Multiplayer", () => {
  it("should simulate independent movements and aim/firing for multiple player entities on the server", async () => {
    const game = new GeometryWarsGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: 1234 }
    });

    await game.init();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);

    const world = game.getWorld();
    world.setResource("UseNetworkInputs", true);

    const playerA = world.createEntity();
    const playerB = world.createEntity();

    world.addComponent(playerA, {
      type: "Player",
      fireCooldownRemaining: 0,
      invulnRemaining: 0,
      moveX: 0,
      moveY: 0
    });
    world.addComponent(playerA, {
      type: "Transform",
      x: 300,
      y: 300,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 300,
      worldY: 300,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(playerA, {
      type: "Aim",
      aimX: 0,
      aimY: 0,
      isFiring: false
    });

    world.addComponent(playerB, {
      type: "Player",
      fireCooldownRemaining: 0,
      invulnRemaining: 0,
      moveX: 0,
      moveY: 0
    });
    world.addComponent(playerB, {
      type: "Transform",
      x: 500,
      y: 300,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 500,
      worldY: 300,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(playerB, {
      type: "Aim",
      aimX: 0,
      aimY: 0,
      isFiring: false
    });

    const frameA: InputFrame = {
      protocolVersion: 1,
      tick: 1,
      timestamp: Date.now(),
      actions: [],
      axes: { moveX: 1, moveY: 0, aimX: 1, aimY: 0 }
    };

    const frameB: InputFrame = {
      protocolVersion: 1,
      tick: 1,
      timestamp: Date.now(),
      actions: ["fire"],
      axes: { moveX: -1, moveY: 0, aimX: -1, aimY: 0 }
    };

    game.applyInputToEntity(playerA, frameA);
    game.applyInputToEntity(playerB, frameB);

    const playerAComp = world.getComponent(playerA, "Player")!;
    const playerBComp = world.getComponent(playerB, "Player")!;
    const aimBComp = world.getComponent(playerB, "Aim")!;

    expect(playerAComp.moveX).toBe(1);
    expect(playerBComp.moveX).toBe(-1);
    expect(aimBComp.isFiring).toBe(true);

    game.destroy();
  });

  it("should spawn network entities using descriptors and materialize them immediately on updateFromServer", async () => {
    const game = new GeometryWarsGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: 1234 }
    });

    await game.init();
    const world = game.getWorld();

    const serverState = {
      tick: 10,
      score: 250,
      gameOver: false,
      wave: 2,
      bombs: 3,
      players: {
        "p1": { x: 200, y: 300, alive: true, angle: 0 }
      },
      enemies: {
        "e1": { id: "e1", x: 150, y: 150, angle: 0, type: "gw_seeker" }
      },
      bullets: {
        "b1": { id: "b1", x: 210, y: 300, angle: 0 }
      }
    };

    game.updateFromServer(serverState, "p1");

    const players = world.query("Player");
    expect(players.length).toBeGreaterThanOrEqual(1);
    const localPlayers = world.query("LocalPlayer");
    expect(localPlayers.length).toBe(1);
    const pEntity = localPlayers[0];
    expect(world.hasComponent(pEntity, "Transform")).toBe(true);
    expect(world.hasComponent(pEntity, "Render")).toBe(true);
    expect(world.hasComponent(pEntity, "Health")).toBe(true);

    const state = game.getGameState();
    expect(state.score).toBe(250);
    expect(state.wave).toBe(2);

    game.destroy();
  });

  it("should move local player entity using predictLocalPlayer without waiting for server snapshot", async () => {
    const game = new GeometryWarsGame({
      headless: true,
      isMultiplayer: true,
      gameOptions: { seed: 1234 }
    });

    await game.init();
    const world = game.getWorld();

    // Trigger updateFromServer to spawn local player for session 'local1'
    game.updateFromServer({
      players: {
        "local1": { x: 100, y: 100, alive: true, angle: 0 }
      }
    }, "local1");

    const localPlayers = world.query("LocalPlayer", "Transform");
    expect(localPlayers.length).toBe(1);
    const localEntity = localPlayers[0];
    const initialTransform = world.getComponent(localEntity, "Transform")!;
    const startX = initialTransform.x;

    const inputFrame: InputFrame = {
      protocolVersion: 1,
      tick: 1,
      timestamp: Date.now(),
      actions: [],
      axes: { moveX: 1, moveY: 0 }
    };

    game.predictLocalPlayer(inputFrame, 0.1);

    const updatedTransform = world.getComponent(localEntity, "Transform")!;
    expect(updatedTransform.x).toBeGreaterThan(startX);

    game.destroy();
  });
});
