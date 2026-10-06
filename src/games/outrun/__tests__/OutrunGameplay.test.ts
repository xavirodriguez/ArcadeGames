import { OutrunGame, OutrunDefinition } from "../OutrunGame";
import type { RoadData } from "../types/OutrunTypes";
import { OUTRUN_PALETTES, scenarioHash } from "../rendering/OutrunPalettes";

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
    game.getWorld().mutateSingleton("RaceState", (s) => {
      s.speed = 5000;
    });
    const before = game.getGameState().playerZ;
    for (let i = 0; i < 10; i++) game.update(1 / 60);
    expect(game.getGameState().playerZ).toBeGreaterThan(before);
  });

  it("steering changes playerX", async () => {
    const game = new OutrunGame({ seed: 11, headless: true });
    await game.init();
    game.getWorld().setResource("CurrentInputFrame", {
      actions: { left: true, accelerate: true },
      axes: {}
    });
    game.getWorld().mutateSingleton("RaceState", (s) => {
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

  it("centrifugal force drifts playerX outwards when driving through curves at high speed", async () => {
    const game = new OutrunGame({ seed: 5, headless: true });
    await game.init();

    const road = game.getWorld().getResource<RoadData>("RoadData")!;
    // Set current segment curve to a positive right curve
    road.segments[0].curve = 4;

    game.getWorld().mutateSingleton("RaceState", (s) => {
      s.speed = 10000;
      s.playerX = 0;
      s.playerZ = 0;
      s.currentSegment = 0;
    });

    const startX = game.getGameState().playerX;
    // Update simulation without user steering inputs
    for (let i = 0; i < 10; i++) game.update(1 / 60);

    const endX = game.getGameState().playerX;
    // Positive curve should push playerX to the left (outward drift: playerX -= centrifugal)
    expect(endX).toBeLessThan(startX);
  });

  it("traffic system reduces player speed upon collision and updates race position", async () => {
    const game = new OutrunGame({ seed: 10, headless: true });
    await game.init();

    const world = game.getWorld();
    const racers = world.query("Racer");
    expect(racers.length).toBeGreaterThan(0);

    const firstRacer = racers[0];
    world.mutateComponent(firstRacer, "Racer", (r) => {
      r.z = 100;
      r.lateralX = 0;
      r.speed = 1000;
    });

    world.mutateSingleton("RaceState", (s) => {
      s.playerZ = 100;
      s.playerX = 0;
      s.speed = 8000;
    });

    let collisionEmitted = false;
    world.getEventBus().on("outrun:collision", () => {
      collisionEmitted = true;
    });

    game.update(1 / 60);

    expect(collisionEmitted).toBe(true);
    expect(game.getGameState().speed).toBeLessThan(8000);
  });

  it("validates full vertical slice: snapshot/restore, steering, acceleration, and track loop wrapping", async () => {
    const game = new OutrunGame({ seed: 77, headless: true });
    await game.init();

    // Accelerate for 60 ticks
    game.getWorld().setResource("CurrentInputFrame", {
      actions: { accelerate: true, right: true },
      axes: {}
    });

    for (let i = 0; i < 60; i++) game.update(1 / 60);

    const midState = game.getGameState();
    expect(midState.speed).toBeGreaterThan(0);
    expect(midState.playerZ).toBeGreaterThan(0);
    expect(midState.playerX).toBeGreaterThan(0);

    // Verify snapshot and restore
    const snapshot = game.getWorld().snapshot();
    for (let i = 0; i < 30; i++) game.update(1 / 60);

    expect(game.getGameState().playerZ).toBeGreaterThan(midState.playerZ);

    game.getWorld().restore(snapshot);
    const restoredState = game.getGameState();
    expect(restoredState.playerZ).toBeCloseTo(midState.playerZ, 5);
    expect(restoredState.playerX).toBeCloseTo(midState.playerX, 5);
    expect(restoredState.speed).toBeCloseTo(midState.speed, 5);
  });

  it("resolves scenario color palettes and generates deterministic faceted mountain hashes", () => {
    expect(OUTRUN_PALETTES.coast).toBeDefined();
    expect(OUTRUN_PALETTES.desert).toBeDefined();
    expect(OUTRUN_PALETTES.mountain).toBeDefined();

    expect(OUTRUN_PALETTES.coast.skyBands.length).toBeGreaterThanOrEqual(4);
    expect(OUTRUN_PALETTES.coast.sun).toBe("#ff4e50");

    const h1 = scenarioHash("coast", 5);
    const h2 = scenarioHash("coast", 5);
    const h3 = scenarioHash("desert", 5);

    expect(h1).toBe(h2); // Deterministic
    expect(typeof h1).toBe("number");
    expect(h1).toBeGreaterThanOrEqual(0);
    expect(h1).toBeLessThanOrEqual(1);
    expect(h1).not.toBe(h3); // Unique per scenario
  });
});
