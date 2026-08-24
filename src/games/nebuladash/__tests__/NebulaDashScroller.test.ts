import { NebulaDashGame } from "../NebulaDashGame";

describe("NebulaDash VerticalScrollerSystem", () => {
  it("updates altitude as player ascends and despawns offscreen entities", async () => {
    const game = new NebulaDashGame();
    await game.init();

    const world = game.getWorld();

    // Create an obstacle gap way below the camera (e.g. y = 1500)
    const offscreenGap = world.createEntity();
    world.addComponent(offscreenGap, {
      type: "Transform",
      x: 400,
      y: 1500,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 400,
      worldY: 1500,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    } as any);
    world.addComponent(offscreenGap, {
      type: "ObstacleGap",
      gapWidth: 120,
      passed: false,
      moveSpeedX: 0
    });

    const player = world.query("Player")[0];
    world.mutateComponent(player, "Transform", (t) => {
      t.y = 200; // Player moved up from 500 to 200 -> altitude = 300
    });

    world.update(0.1);

    const state = game.getGameState();
    expect(state.altitude).toBeGreaterThanOrEqual(250);

    // Offscreen gap should be despawned (removed from world command buffer after update)
    world.getCommandBuffer().flush(world);
    const remainingGaps = world.query("ObstacleGap");
    expect(remainingGaps).not.toContain(offscreenGap);
  });
});
