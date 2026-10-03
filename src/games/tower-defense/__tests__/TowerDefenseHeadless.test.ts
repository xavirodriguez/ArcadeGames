/**
 * Basic headless determinism + pathing + economy smoke tests.
 * Run with the package jest config once the game is registered in the monorepo.
 */
import { TowerDefenseGame } from "../TowerDefenseGame";
import type { GameStateComponent, WaypointList } from "../types/TowerDefenseTypes";

describe("TowerDefense headless", () => {
  it("creates world with map resources and initial economy", () => {
    const game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    const world = game.getWorld();

    const gs = world.getSingleton("GameState") as GameStateComponent;
    expect(gs).toBeDefined();
    expect(gs.gold).toBeGreaterThan(0);
    expect(gs.lives).toBeGreaterThan(0);
    expect(gs.phase).toBe("build");

    const waypoints = world.getResource<WaypointList>("WaypointList");
    expect(waypoints).toBeDefined();
    expect(waypoints!.points.length).toBeGreaterThan(1);
  });

  it("same seed produces same waypoint count (determinism baseline)", () => {
    const g1 = new TowerDefenseGame({ headless: true, gameOptions: { seed: 123 } });
    const g2 = new TowerDefenseGame({ headless: true, gameOptions: { seed: 123 } });
    const w1 = g1.getWorld().getResource<WaypointList>("WaypointList")!;
    const w2 = g2.getWorld().getResource<WaypointList>("WaypointList")!;
    expect(w1.points.length).toBe(w2.points.length);
    expect(w1.points[0]).toEqual(w2.points[0]);
  });

  it("cannot build without gold (economy guard)", () => {
    const game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 1 } });
    const world = game.getWorld();

    // Drain gold
    world.mutateSingleton("GameState", (gs: GameStateComponent) => {
      gs.gold = 0;
    });

    const player = world.query("Player")[0];
    world.mutateComponent(player, "Input", (i) => {
      i.cursorX = 120; // roughly a buildable cell depending on layout
      i.cursorY = 80;
      i.build = true;
    });

    // Run a few steps
    for (let i = 0; i < 5; i++) {
      game.runSimulationStep(16, false);
    }

    const towers = world.query("Tower");
    expect(towers.length).toBe(0);
  });
});
