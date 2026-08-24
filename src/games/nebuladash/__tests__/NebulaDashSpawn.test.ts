import { NebulaDashGame } from "../NebulaDashGame";

describe("NebulaDash SpawnDirectorSystem Integration & Rollback", () => {
  it("spawns entities deterministically according to wave definitions and respects snapshot/restore", async () => {
    const game = new NebulaDashGame({ seed: 12345 });
    await game.init();

    const world = game.getWorld();

    // Step forward 0.5s to trigger initial wave spawns
    world.update(0.5);

    const initialGaps = world.query("ObstacleGap");

    expect(initialGaps.length).toBeGreaterThan(0);

    // Take snapshot at mid sequence
    const snapshot = game.snapshot();

    // Step further forward 2.0s
    world.update(2.0);
    const midGapsCount = world.query("ObstacleGap").length;
    expect(midGapsCount).toBeGreaterThanOrEqual(initialGaps.length);

    // Restore snapshot
    game.restore(snapshot);

    const restoredGapsCount = world.query("ObstacleGap").length;
    expect(restoredGapsCount).toBe(initialGaps.length);

    // Resimulate 2.0s
    world.update(2.0);
    const resimulatedGapsCount = world.query("ObstacleGap").length;

    // Must match midGapsCount exactly without creating duplicate spawns
    expect(resimulatedGapsCount).toBe(midGapsCount);
  });
});
