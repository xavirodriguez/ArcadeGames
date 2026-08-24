import { NebulaDashGame } from "../NebulaDashGame";

describe("NebulaDash Combat, Combo & Score Integration", () => {
  it("increments combo and score exactly once when crossing an obstacle gap", async () => {
    const game = new NebulaDashGame();
    await game.init();

    const world = game.getWorld();

    // Create a gap entity directly above player
    const gap = world.createEntity();
    world.addComponent(gap, {
      type: "Transform",
      x: 400,
      y: 400,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 400,
      worldY: 400,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    } as any);
    world.addComponent(gap, {
      type: "ObstacleGap",
      gapWidth: 120,
      passed: false,
      moveSpeedX: 0
    });

    const player = world.query("Player")[0];
    world.mutateComponent(player, "Transform", (t) => {
      t.y = 500;
    });

    // Move player above gap (y < 390)
    world.mutateComponent(player, "Transform", (t) => {
      t.y = 380;
    });

    world.update(0.1);

    const state = game.getGameState();
    expect(state.score).toBe(100);
    expect(state.combo).toBe(1);

    // Update again to verify single-pass (no double scoring)
    world.update(0.1);
    const state2 = game.getGameState();
    expect(state2.score).toBe(100);
    expect(state2.combo).toBe(1);
  });

  it("handles rollback resimulation without duplicate scoring or state desync", async () => {
    const game = new NebulaDashGame();
    await game.init();

    const world = game.getWorld();

    const gap = world.createEntity();
    world.addComponent(gap, {
      type: "Transform",
      x: 400,
      y: 400,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 400,
      worldY: 400,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    } as any);
    world.addComponent(gap, {
      type: "ObstacleGap",
      gapWidth: 120,
      passed: false,
      moveSpeedX: 0
    });

    const player = world.query("Player")[0];
    world.mutateComponent(player, "Transform", (t) => {
      t.y = 500;
    });

    // Take snapshot BEFORE passing gap
    const snapshotPreGap = game.snapshot();

    // Pass gap
    world.mutateComponent(player, "Transform", (t) => {
      t.y = 380;
    });
    world.update(0.1);

    expect(game.getGameState().score).toBe(100);

    // Restore pre-gap snapshot
    game.restore(snapshotPreGap);

    expect(game.getGameState().score).toBe(0);

    // Move player above gap again and resimulate
    const restoredPlayer = world.query("Player")[0];
    world.mutateComponent(restoredPlayer, "Transform", (t) => {
      t.y = 380;
    });
    world.update(0.1);

    expect(game.getGameState().score).toBe(100);
  });

  it("damages player and sets isGameOver when plasma wall contacts player", async () => {
    const game = new NebulaDashGame();
    await game.init();

    const world = game.getWorld();

    // Create plasma wall at player location
    const plasma = world.createEntity();
    world.addComponent(plasma, {
      type: "Transform",
      x: 400,
      y: 500,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 400,
      worldY: 500,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    } as any);
    world.addComponent(plasma, {
      type: "Velocity",
      vx: 0,
      vy: -80,
      angularVelocity: 0
    } as any);
    world.addComponent(plasma, {
      type: "PlasmaRisingWall",
      ascentSpeed: 80,
      acceleration: 1.5
    });
    world.addComponent(plasma, {
      type: "Damage",
      amount: 10,
      category: "plasma_hazard",
      friendlyFire: false,
      consumption: "none"
    } as any);
    world.addComponent(plasma, {
      type: "Faction",
      faction: "environment",
      value: "environment"
    } as any);
    world.addComponent(plasma, {
      type: "Collider",
      shape: { type: 1, width: 800, height: 100 },
      layer: 2,
      mask: 1,
      enabled: true,
      isTrigger: true
    } as any);
    world.addComponent(plasma, {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [world.query("Player")[0]],
      triggersEntered: [world.query("Player")[0]],
      triggersExited: []
    } as any);

    world.update(0.1);

    expect(game.isGameOver()).toBe(true);
  });
});
