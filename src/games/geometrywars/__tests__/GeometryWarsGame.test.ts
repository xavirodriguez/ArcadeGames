import { GeometryWarsGame } from "../GeometryWarsGame";

describe("GeometryWarsGame Headless Smoke Test", () => {
  it("should initialize the game world, register systems, and handle snapshot/restore", async () => {
    // 1. Instantiate game
    const game = new GeometryWarsGame();

    // 2. Initialize and register systems
    await (game as any).onRegisterSystems();
    await (game as any).onInitializeEntities();

    // 3. Verify player and game state are initialized
    const sceneWorld = (game as any).currentScene.getWorld();
    expect(sceneWorld).toBeDefined();

    const playerEntities = sceneWorld.query("Player");
    expect(playerEntities.length).toBe(1);

    const player = playerEntities[0];
    expect(sceneWorld.hasComponent(player, "Transform")).toBe(true);
    expect(sceneWorld.hasComponent(player, "Velocity")).toBe(true);
    expect(sceneWorld.hasComponent(player, "Health")).toBe(true);
    expect(sceneWorld.hasComponent(player, "Aim")).toBe(true);

    const gameState = game.getGameState();
    expect(gameState).toBeDefined();
    expect(gameState.score).toBe(0);
    expect(gameState.lives).toBe(3);
    expect(gameState.isGameOver).toBe(false);

    // 4. Test Snapshot and Restore
    // Modify some properties to test snapshot capture
    sceneWorld.mutateComponent(player, "Transform", (t: any) => {
      t.x = 420;
      t.y = 240;
    });

    const snapshot = sceneWorld.snapshot();

    // Apply more changes
    sceneWorld.mutateComponent(player, "Transform", (t: any) => {
      t.x = 500;
      t.y = 500;
    });

    // Run a update tick
    game.update(0.016);
    expect(sceneWorld.getComponent(player, "Transform").x).not.toBe(420);

    // Restore the snapshot
    sceneWorld.restore(snapshot);

    // Verify it returned back to snapshot state
    const restoredTransform = sceneWorld.getComponent(player, "Transform");
    expect(restoredTransform.x).toBe(420);
    expect(restoredTransform.y).toBe(240);

    // 5. Test Game Over check
    expect(game.isGameOver()).toBe(false);
  });

  it("should handle twin-stick input routing and update physics velocities and aim values", async () => {
    const game = new GeometryWarsGame();
    await (game as any).onRegisterSystems();
    await (game as any).onInitializeEntities();

    const sceneWorld = (game as any).currentScene.getWorld();
    const player = sceneWorld.query("Player")[0];

    // Verify player is initialized with zero movement and aim
    let playerComp = sceneWorld.getComponent(player, "Player");
    let aimComp = sceneWorld.getComponent(player, "Aim");
    let velComp = sceneWorld.getComponent(player, "Velocity");

    expect(playerComp.moveX).toBe(0);
    expect(playerComp.moveY).toBe(0);
    expect(aimComp.aimX).toBe(0);
    expect(aimComp.aimY).toBe(0);
    expect(aimComp.isFiring).toBe(false);
    expect(velComp.vx).toBe(0);
    expect(velComp.vy).toBe(0);

    // Simulate move right/down and aiming left/up with fire button pressed
    game.setInputState({
      moveX: 1.0,
      moveY: 0.5,
      aimX: -0.8,
      aimY: -0.6,
      fire: true
    });

    // Verify components have mutated correctly in setInputState
    playerComp = sceneWorld.getComponent(player, "Player");
    aimComp = sceneWorld.getComponent(player, "Aim");
    expect(playerComp.moveX).toBe(1.0);
    expect(playerComp.moveY).toBe(0.5);
    expect(aimComp.aimX).toBe(-0.8);
    expect(aimComp.aimY).toBe(-0.6);
    expect(aimComp.isFiring).toBe(true);

    // Update simulation and verify velocities are applied deterministically based on PLAYER_SPEED (default 220)
    game.update(0.016);

    velComp = sceneWorld.getComponent(player, "Velocity");
    // Magnitude of (1.0, 0.5) is Math.sqrt(1.25) ~ 1.118, which is > 1.0, so it will be normalized to (0.894, 0.447)
    // 0.8944 * 220 ~ 196.77
    // 0.4472 * 220 ~ 98.38
    expect(velComp.vx).toBeCloseTo(196.77, 1);
    expect(velComp.vy).toBeCloseTo(98.38, 1);
  });
});
