import { OutrunGame, OutrunDefinition } from "../OutrunGame";
import type { RoadData } from "../types/OutrunTypes";

describe("OutrunGameplay", () => {
  it("creates a deterministic simulation from the same seed", async () => {
    const g1 = new OutrunGame({ seed: 42, headless: true });
    const g2 = new OutrunGame({ seed: 42, headless: true });
    await g1.init();
    await g2.init();
    const s1 = g1.getGameState();
    const s2 = g2.getGameState();
    expect(s1.playerZ).toBe(s2.playerZ);
    expect(s1.playerX).toBe(s2.playerX);
    expect(s1.speed).toBe(s2.speed);
    const road1 = (g1 as unknown as { world: { getResource: (k: string) => RoadData } }).world.getResource("RoadData");
    const road2 = (g2 as unknown as { world: { getResource: (k: string) => RoadData } }).world.getResource("RoadData");
    expect(road1?.segments.length).toBe(road2?.segments.length);
    expect(road1?.trackLength).toBe(road2?.trackLength);
  });

  it("advances playerZ when speed is applied", async () => {
    const game = new OutrunGame({ seed: 7, headless: true });
    await game.init();
    const world = (game as unknown as { world: any }).world;
    world.mutateSingleton("RaceState", (s: { speed: number }) => {
      s.speed = 5000;
    });
    const before = game.getGameState().playerZ;
    for (let i = 0; i < 10; i++) game.update(1 / 60);
    expect(game.getGameState().playerZ).toBeGreaterThan(before);
  });

  it("steering changes playerX", async () => {
    const game = new OutrunGame({ seed: 11, headless: true });
    await game.init();
    const world = (game as unknown as { world: any }).world;
    world.setResource("CurrentInputFrame", {
      actions: { left: true, accelerate: true },
      axes: {}
    });
    world.mutateSingleton("RaceState", (s: { speed: number }) => {
      s.speed = 6000;
    });
    const before = game.getGameState().playerX;
    for (let i = 0; i < 15; i++) game.update(1 / 60);
    expect(game.getGameState().playerX).toBeLessThan(before);
  });

  it("road data wraps and has curves/hills", async () => {
    const game = new OutrunGame({ seed: 99, headless: true });
    await game.init();
    const road = (game as unknown as { world: { getResource: (k: string) => RoadData } }).world.getResource("RoadData");
    expect(road).toBeDefined();
    expect(road!.segments.length).toBeGreaterThan(50);
    expect(road!.trackLength).toBeGreaterThan(0);
    expect(road!.segments.some((s) => s.curve !== 0)).toBe(true);
    expect(road!.segments.some((s) => s.hill !== 0)).toBe(true);
  });

  it("OutrunDefinition exposes expected contract", () => {
    expect(OutrunDefinition.name).toBe("outrun");
    expect(OutrunDefinition.inputSchema.actions).toContain("accelerate");
    expect(typeof OutrunDefinition.createSimulation).toBe("function");
    expect(OutrunDefinition.createSimulation(123)).toBeInstanceOf(OutrunGame);
  });

  it("traffic entities exist after init", async () => {
    const game = new OutrunGame({ seed: 3, headless: true });
    await game.init();
    const world = (game as unknown as { world: { query: (t: string) => number[] } }).world;
    expect(world.query("Racer").length).toBeGreaterThan(0);
  });
});
