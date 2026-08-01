import { World, CoreComponentRegistry } from "@tiny-aster/core";
import {
  RetroCRTScanlinesEffect,
  ScrollingStarfieldEffect,
  HyperdriveWarpSpeedLinesEffect,
  EnergyShieldBubbleEffect,
  DebrisShockwaveEffect
} from "../../shared/rendering/SharedVFX";

// Simple mock for CanvasRenderingContext2D
const createMockContext = () => {
  const drawCalls: string[] = [];
  const ctx = {
    canvas: { width: 800, height: 600 },
    save() { drawCalls.push("save"); },
    restore() { drawCalls.push("restore"); },
    fillRect(x: number, y: number, w: number, h: number) {
      drawCalls.push(`fillRect:${x},${y},${w},${h}`);
    },
    beginPath() { drawCalls.push("beginPath"); },
    arc(x: number, y: number, r: number, start: number, end: number) {
      drawCalls.push(`arc:${x},${y},${r}`);
    },
    fill() { drawCalls.push("fill"); },
    stroke() { drawCalls.push("stroke"); },
    moveTo(x: number, y: number) { drawCalls.push(`moveTo:${x},${y}`); },
    lineTo(x: number, y: number) { drawCalls.push(`lineTo:${x},${y}`); },
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
      drawCalls.push("createRadialGradient");
      return {
        addColorStop(offset: number, color: string) {
          drawCalls.push(`addColorStop:${offset},${color}`);
        }
      } as any;
    },
    setStrokeStyle(color: string) { this.strokeStyle = color; },
    setFillStyle(color: string) { this.fillStyle = color; },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1.0,
  } as any;

  return { ctx, drawCalls };
};

describe("Deterministic Zero-Allocation Shared VFX", () => {
  let world: World<CoreComponentRegistry>;
  let originalRandom: typeof Math.random;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    world.setResource("ScreenConfig", { width: 800, height: 600 });

    // Track calls to Math.random
    originalRandom = Math.random;
    Math.random = jest.fn(() => {
      throw new Error("Math.random() was called in a visual rendering context! This violates deterministic boundaries.");
    });
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it("should draw RetroCRTScanlinesEffect deterministically and without Math.random", () => {
    const { ctx, drawCalls } = createMockContext();

    const initialSeed = world.renderRandom.getSeed();

    RetroCRTScanlinesEffect.draw(ctx, world);

    // Verify drawing actions occurred
    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("createRadialGradient");

    // Verify seed progressed
    expect(world.renderRandom.getSeed()).not.toEqual(initialSeed);
  });

  it("should draw ScrollingStarfieldEffect deterministically and twinkle stars", () => {
    const { ctx, drawCalls } = createMockContext();

    const seed1 = world.renderRandom.getSeed();
    ScrollingStarfieldEffect.draw(ctx, world);
    const seed2 = world.renderRandom.getSeed();

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(seed2).not.toEqual(seed1);

    // Run again to ensure parallax updates
    const { ctx: ctx2, drawCalls: drawCalls2 } = createMockContext();
    ScrollingStarfieldEffect.draw(ctx2, world);
    expect(drawCalls2.length).toBeGreaterThan(0);
  });

  it("should draw HyperdriveWarpSpeedLinesEffect", () => {
    const { ctx, drawCalls } = createMockContext();

    HyperdriveWarpSpeedLinesEffect.draw(ctx, world);
    expect(drawCalls.length).toBeGreaterThan(0);
  });

  it("should draw EnergyShieldBubbleEffect for active entity bubble", () => {
    const { ctx, drawCalls } = createMockContext();

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Render",
      visible: true,
      opacity: 1,
      order: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
      size: 40
    });

    EnergyShieldBubbleEffect.draw(ctx, world, entity);
    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("beginPath");
  });

  it("should draw DebrisShockwaveEffect procedurally", () => {
    const { ctx, drawCalls } = createMockContext();

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Render",
      visible: true,
      opacity: 1,
      order: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
      size: 30
    });

    DebrisShockwaveEffect.draw(ctx, world, entity);
    expect(drawCalls.length).toBeGreaterThan(0);
  });
});
