import { World } from "@tiny-aster/core";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { drawAsteroidsPlayerShip, drawAsteroidsAsteroid, drawAsteroidsBullet } from "../rendering/AsteroidsCanvasVisuals";

// Mock CanvasRenderingContext2D
const createMockContext = () => {
  const drawCalls: string[] = [];
  const ctx = {
    canvas: { width: 800, height: 600 },
    save() { drawCalls.push("save"); },
    restore() { drawCalls.push("restore"); },
    beginPath() { drawCalls.push("beginPath"); },
    closePath() { drawCalls.push("closePath"); },
    moveTo(x: number, y: number) { drawCalls.push(`moveTo:${Math.round(x)},${Math.round(y)}`); },
    lineTo(x: number, y: number) { drawCalls.push(`lineTo:${Math.round(x)},${Math.round(y)}`); },
    stroke() { drawCalls.push("stroke"); },
    fill() { drawCalls.push("fill"); },
    arc(x: number, y: number, r: number, s: number, e: number) { drawCalls.push(`arc:${x},${y},${r}`); },
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1,
    globalAlpha: 1.0,
    lineJoin: "",
    lineCap: "",
  } as any;
  return { ctx, drawCalls };
};

describe("Deterministic Asteroids 2D Visual Drawers (Canvas)", () => {
  let world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>;
  let originalRandom: typeof Math.random;

  beforeEach(() => {
    world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
    world.setResource("ScreenConfig", { width: 800, height: 600 });

    // Enforce that Math.random() is never called inside the rendering paths
    originalRandom = Math.random;
    Math.random = jest.fn(() => {
      throw new Error("Math.random() was called in a visual rendering context! This violates deterministic boundaries.");
    });
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it("should draw player ship shape with thruster animation and zero Math.random", () => {
    const { ctx, drawCalls } = createMockContext();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Render",
      shape: "player_ship",
      size: 15,
      color: "#00f0ff",
      visible: true,
      opacity: 1,
      order: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    });
    world.addComponent(entity, {
      type: "Input",
      actions: { thrust: true },
      axes: {}
    });

    drawAsteroidsPlayerShip.draw(ctx, world, entity);

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("save");
    expect(drawCalls).toContain("restore");
    // Finally, the ship body color is applied
    expect(ctx.strokeStyle).toBe("#00f0ff"); // Glowing cyan ship body
  });

  it("should draw asteroid deterministically and without Math.random", () => {
    const { ctx, drawCalls } = createMockContext();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Render",
      shape: "asteroid",
      size: 50,
      color: "#ff66cc",
      visible: true,
      opacity: 1,
      order: 0,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    });

    drawAsteroidsAsteroid.draw(ctx, world, entity);

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("beginPath");
    expect(drawCalls).toContain("closePath");
    expect(drawCalls).toContain("stroke");
  });

  it("should draw glowing laser bullet", () => {
    const { ctx, drawCalls } = createMockContext();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Render",
      shape: "bullet",
      size: 2,
      color: "#00ff66",
      visible: true,
      opacity: 1,
      order: 2,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0
    });

    drawAsteroidsBullet.draw(ctx, world, entity);

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(ctx.strokeStyle).toBe("#ffffff"); // bright white core is drawn last
  });
});
