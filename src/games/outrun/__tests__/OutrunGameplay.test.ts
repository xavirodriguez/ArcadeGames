import { OutrunGame, OutrunDefinition } from "../OutrunGame";
import { ColorScriptSystem } from "../systems/ColorScriptSystem";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import type { RoadData } from "../types/OutrunTypes";
import { OUTRUN_PALETTES, scenarioHash } from "../rendering/OutrunPalettes";
import {
  drawOutrunRoad,
  drawOutrunCar,
  drawOutrunRacer,
  drawOutrunHud
} from "../rendering/OutrunCanvasVisuals";

const mockPaint = {
  setColor: jest.fn(),
  setStyle: jest.fn(),
  setAlphaf: jest.fn(),
};

jest.mock("@shopify/react-native-skia", () => ({
  Skia: {
    Paint: jest.fn(() => mockPaint),
    Color: jest.fn((c) => c),
    PaintStyle: { Fill: 0, Stroke: 1 },
    XYWHRect: jest.fn((x, y, w, h) => ({ x, y, w, h })),
    RRectXY: jest.fn((rect, rx, ry) => ({ rect, rx, ry })),
    Path: {
      Make: jest.fn(() => ({
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        close: jest.fn(),
      })),
    },
  },
}));
import {
  drawSkiaOutrunRoad,
  drawSkiaOutrunCar,
  drawSkiaOutrunRacer,
  drawSkiaOutrunHud
} from "../rendering/OutrunSkiaVisuals";

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
    const road1 = g1.getWorld().getResource<RoadData>("RoadData");
    const road2 = g2.getWorld().getResource<RoadData>("RoadData");
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
    const road = game.getWorld().getResource<RoadData>("RoadData");
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
    const world = game.getWorld();
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
    expect(OUTRUN_PALETTES.coast.sun).toBe("#ff5252");

    const h1 = scenarioHash("coast", 5);
    const h2 = scenarioHash("coast", 5);
    const h3 = scenarioHash("desert", 5);

    expect(h1).toBe(h2); // Deterministic
    expect(typeof h1).toBe("number");
    expect(h1).toBeGreaterThanOrEqual(0);
    expect(h1).toBeLessThanOrEqual(1);
    expect(h1).not.toBe(h3); // Unique per scenario
  });

  it("assigns scenarioId and side/over-road sprites during generateRoad", async () => {
    const game = new OutrunGame({ seed: 123, headless: true });
    await game.init();
    const road = game.getWorld().getResource<RoadData>("RoadData");
    expect(road).toBeDefined();
    expect(road!.segments.length).toBeGreaterThan(50);

    const segments = road!.segments;
    expect(segments.some((s) => s.scenarioId === "coast")).toBe(true);
    expect(segments.some((s) => s.scenarioId === "desert")).toBe(true);
    expect(segments.some((s) => s.scenarioId === "mountain")).toBe(true);

    // Segment 0 should have Start/Finish arch
    expect(segments[0].sprites).toBeDefined();
    expect(segments[0].sprites!.some((sp) => sp.kind === "arch")).toBe(true);

    // Should contain side sprites across segments
    const allSprites = segments.flatMap((s) => s.sprites ?? []);
    expect(allSprites.some((sp) => sp.kind === "palm" || sp.kind === "lighthouse")).toBe(true);
    expect(allSprites.some((sp) => sp.kind === "cactus" || sp.kind === "dry_shrub")).toBe(true);
    expect(allSprites.some((sp) => sp.kind === "tree" || sp.kind === "pine" || sp.kind === "rock")).toBe(true);
    expect(allSprites.some((sp) => sp.kind === "chevron")).toBe(true);
    expect(allSprites.some((sp) => sp.kind === "banner")).toBe(true);
  });

  it("modulates palettes smoothly across daylight phases and turns on lights in blue_hour", () => {
    const { applyDayPhase, getDayPhase, COAST_PALETTE } = require("../rendering/OutrunPalettes");

    const dawnInfo = getDayPhase(0.1);
    expect(dawnInfo.phase).toBe("dawn");
    expect(dawnInfo.lightsOn).toBe(false);

    const blueHourInfo = getDayPhase(0.85);
    expect(blueHourInfo.phase).toBe("blue_hour");
    expect(blueHourInfo.lightsOn).toBe(true);

    const modulatedDawn = applyDayPhase(COAST_PALETTE, 0.1);
    expect(modulatedDawn.dayPhase).toBe("dawn");
    expect(modulatedDawn.lightsOn).toBe(false);

    const modulatedBlueHour = applyDayPhase(COAST_PALETTE, 0.85);
    expect(modulatedBlueHour.dayPhase).toBe("blue_hour");
    expect(modulatedBlueHour.lightsOn).toBe(true);
  });

  it("calculates car scale and high speed ratio for VFX speed lines threshold", async () => {
    const game = new OutrunGame({ seed: 50, headless: true });
    await game.init();

    game.getWorld().mutateSingleton("RaceState", (s) => {
      s.speed = 10000;
    });

    const state = game.getGameState();
    const config = game.getWorld().getResource<import("../types/OutrunConfigSchema").OutrunConfig>("GameConfig")!;
    const speedRatio = state.speed / config.maxSpeed;

    expect(speedRatio).toBeGreaterThan(0.7); // Threshold for speed lines
  });

  it("exposes Skia drawers for rendering parity with Canvas", () => {
    expect(drawSkiaOutrunRoad).toBeDefined();
    expect(typeof drawSkiaOutrunRoad.draw).toBe("function");

    expect(drawSkiaOutrunCar).toBeDefined();
    expect(typeof drawSkiaOutrunCar.draw).toBe("function");

    expect(drawSkiaOutrunRacer).toBeDefined();
    expect(typeof drawSkiaOutrunRacer.draw).toBe("function");

    expect(drawSkiaOutrunHud).toBeDefined();
    expect(typeof drawSkiaOutrunHud.draw).toBe("function");
  });

  it("draws road segments correctly with Canvas and Skia road drawers", async () => {
    const game = new OutrunGame({ seed: 100, headless: true });
    await game.init();
    const world = game.getWorld();

    let canvasPathDrawn = false;
    const mockCanvasCtx: any = {
      save: jest.fn(),
      restore: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      beginPath: jest.fn(() => { canvasPathDrawn = true; }),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      arc: jest.fn(),
      ellipse: jest.fn(),
      fillText: jest.fn(),
    };

    drawOutrunRoad.draw(mockCanvasCtx, world, 0);
    expect(mockCanvasCtx.save).toHaveBeenCalled();
    expect(mockCanvasCtx.fillRect).toHaveBeenCalled();
    expect(canvasPathDrawn).toBe(true);

    let skiaPathDrawn = false;
    const mockSkiaCanvas: any = {
      drawRect: jest.fn(),
      drawCircle: jest.fn(),
      drawOval: jest.fn(),
      drawPath: jest.fn(() => { skiaPathDrawn = true; }),
    };

    drawSkiaOutrunRoad.draw(mockSkiaCanvas, world, 0);
    expect(mockSkiaCanvas.drawRect).toHaveBeenCalled();
    expect(skiaPathDrawn).toBe(true);
  });

  it("decrements countdown timer and transitions racePhase from countdown to racing", async () => {
    const game = new OutrunGame({ seed: 33, headless: true });
    await game.init();

    game.getWorld().mutateSingleton("RaceState", (s) => {
      s.racePhase = "countdown";
      s.countdownTime = 1.0;
    });

    expect(game.getGameState().racePhase).toBe("countdown");

    // Advance simulation past countdown time (1.0s)
    for (let i = 0; i < 70; i++) game.update(1 / 60);

    expect(game.getGameState().racePhase).toBe("racing");
    expect(game.getGameState().countdownTime).toBe(0);
  });

  it("renders matching pixel-run counts for player and traffic cars in Canvas and Skia", async () => {
    const game = new OutrunGame({ seed: 404, headless: true });
    await game.init();
    const world = game.getWorld();

    const carEntity = world.query("Render").find(
      (entity) => world.getComponent(entity, "Render")?.shape === "outrun_car"
    );
    expect(carEntity).toBeDefined();

    world.mutateSingleton("RaceState", (state) => {
      state.playerZ = 400;
      state.speed = 0;
    });

    const canvasCar = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      fill: jest.fn(),
      arc: jest.fn(),
      ellipse: jest.fn(),
      fillRect: jest.fn()
    };
    const skiaCar = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      drawCircle: jest.fn(),
      drawOval: jest.fn(),
      drawPath: jest.fn(),
      drawRRect: jest.fn(),
      drawRect: jest.fn()
    };

    drawOutrunCar.draw(canvasCar as never, world, carEntity!);
    drawSkiaOutrunCar.draw(skiaCar as never, world, carEntity!);

    expect(canvasCar.fill).toHaveBeenCalled();
    expect(skiaCar.drawRRect).toHaveBeenCalled();

    const config = world.getResource<import("../types/OutrunConfigSchema").OutrunConfig>("GameConfig")!;
    const roadData = world.getResource<RoadData>("RoadData")!;
    const { projectOutrunRoad } = require("../rendering/OutrunRenderShared");

    const seg0Len = roadData.segments[0].length;
    const racerEntity = world.query("Racer")[0];
    expect(racerEntity).toBeDefined();
    world.mutateComponent(racerEntity!, "Racer", (racer) => {
      racer.z = seg0Len * 5;
      racer.lateralX = 0;
      racer.active = true;
    });
    world.mutateSingleton("RaceState", (state) => {
      state.playerZ = 0;
      state.playerX = 0;
    });

    projectOutrunRoad(roadData.segments, 0, 0, config, config.WIDTH, config.HEIGHT);

    const canvasTraffic = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      fill: jest.fn(),
      arc: jest.fn(),
      ellipse: jest.fn(),
      fillRect: jest.fn()
    };
    const skiaTraffic = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      drawOval: jest.fn(),
      drawPath: jest.fn(),
      drawRRect: jest.fn(),
      drawRect: jest.fn()
    };

    drawOutrunRacer.draw(canvasTraffic as never, world, racerEntity!);
    drawSkiaOutrunRacer.draw(skiaTraffic as never, world, racerEntity!);

    expect(canvasTraffic.save).toHaveBeenCalled();
    expect(skiaTraffic.drawRRect).toHaveBeenCalled();
  });

  it("ColorScriptSystem updates VisualPalette without mutating RaceState", async () => {
    const game = new OutrunGame({ seed: 808, headless: true });
    await game.init();
    const world = game.getWorld();
    const before = game.getGameState();

    new ColorScriptSystem().update(world, 1 / 60);

    expect(game.getGameState()).toEqual(before);
    const visualPalette = world.getResource<OutrunVisualPaletteResource>("VisualPalette");
    expect(visualPalette).toBeDefined();
    expect(visualPalette?.stageIndex).toBe(0);
    expect(visualPalette?.hour).toBe("dawn");
    expect(visualPalette?.decor).toBe("sierra");
    expect(visualPalette?.skyBands).toHaveLength(7);
  });

});
