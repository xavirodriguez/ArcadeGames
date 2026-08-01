import { World, CoreComponentRegistry } from "@tiny-aster/core";
import * as SharedVFX from "../../shared/rendering/SharedVFX";

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
    closePath() { drawCalls.push("closePath"); },
    arc(x: number, y: number, r: number, start: number, end: number) {
      drawCalls.push(`arc:${x},${y},${r}`);
    },
    fill() { drawCalls.push("fill"); },
    stroke() { drawCalls.push("stroke"); },
    moveTo(x: number, y: number) { drawCalls.push(`moveTo:${x},${y}`); },
    lineTo(x: number, y: number) { drawCalls.push(`lineTo:${x},${y}`); },
    strokeRect(x: number, y: number, w: number, h: number) {
      drawCalls.push(`strokeRect:${x},${y},${w},${h}`);
    },
    fillText(text: string, x: number, y: number) {
      drawCalls.push(`fillText:${text}`);
    },
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

describe("Deterministic Zero-Allocation Shared VFX (All 15 Effects)", () => {
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

  // -----------------------------------------------------------
  // 1. RetroCRTScanlinesEffect
  // -----------------------------------------------------------
  it("should draw RetroCRTScanlinesEffect deterministically and without Math.random", () => {
    const { ctx, drawCalls } = createMockContext();
    const initialSeed = world.renderRandom.getSeed();

    SharedVFX.RetroCRTScanlinesEffect.draw(ctx, world);

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("createRadialGradient");
    expect(world.renderRandom.getSeed()).not.toEqual(initialSeed);
  });

  // -----------------------------------------------------------
  // 2. ScrollingStarfieldEffect
  // -----------------------------------------------------------
  it("should draw ScrollingStarfieldEffect deterministically", () => {
    const { ctx, drawCalls } = createMockContext();
    const seed1 = world.renderRandom.getSeed();

    SharedVFX.ScrollingStarfieldEffect.draw(ctx, world);
    const seed2 = world.renderRandom.getSeed();

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(seed2).not.toEqual(seed1);

    const { ctx: ctx2, drawCalls: drawCalls2 } = createMockContext();
    SharedVFX.ScrollingStarfieldEffect.draw(ctx2, world);
    expect(drawCalls2.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // 3. HyperdriveWarpSpeedLinesEffect
  // -----------------------------------------------------------
  it("should draw HyperdriveWarpSpeedLinesEffect", () => {
    const { ctx, drawCalls } = createMockContext();

    SharedVFX.HyperdriveWarpSpeedLinesEffect.draw(ctx, world);
    expect(drawCalls.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // 4. EnergyShieldBubbleEffect
  // -----------------------------------------------------------
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

    SharedVFX.EnergyShieldBubbleEffect.draw(ctx, world, entity);
    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("beginPath");
  });

  // -----------------------------------------------------------
  // 5. DebrisShockwaveEffect
  // -----------------------------------------------------------
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

    SharedVFX.DebrisShockwaveEffect.draw(ctx, world, entity);
    expect(drawCalls.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // 6. DriftingNebulaBackgroundEffect
  // -----------------------------------------------------------
  it("should draw DriftingNebulaBackgroundEffect", () => {
    const { ctx, drawCalls } = createMockContext();

    SharedVFX.DriftingNebulaBackgroundEffect.draw(ctx, world);
    expect(drawCalls.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // 7. MatrixDigitalRainEffect
  // -----------------------------------------------------------
  it("should draw MatrixDigitalRainEffect", () => {
    const { ctx, drawCalls } = createMockContext();

    SharedVFX.MatrixDigitalRainEffect.draw(ctx, world);
    expect(drawCalls.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // 8. CRTGlitchShudderEffect
  // -----------------------------------------------------------
  it("should draw CRTGlitchShudderEffect deterministically", () => {
    const { ctx, drawCalls } = createMockContext();

    // Mock next to force a glitch trigger
    const originalNext = world.renderRandom.next;
    world.renderRandom.next = () => 0.98;

    SharedVFX.CRTGlitchShudderEffect.draw(ctx, world);
    expect(drawCalls.length).toBeGreaterThan(0);

    world.renderRandom.next = originalNext;
  });

  // -----------------------------------------------------------
  // 9. ThrusterPlumeFlameEffect
  // -----------------------------------------------------------
  it("should draw ThrusterPlumeFlameEffect", () => {
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
      size: 20
    });

    SharedVFX.ThrusterPlumeFlameEffect.draw(ctx, world, entity);
    expect(drawCalls.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // 10. LaserRailBeamEffect
  // -----------------------------------------------------------
  it("should draw LaserRailBeamEffect", () => {
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
      size: 150
    });

    SharedVFX.LaserRailBeamEffect.draw(ctx, world, entity);
    expect(drawCalls.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // 11. ScreenBorderGlowEffect
  // -----------------------------------------------------------
  it("should draw ScreenBorderGlowEffect", () => {
    const { ctx, drawCalls } = createMockContext();

    SharedVFX.ScreenBorderGlowEffect.draw(ctx, world);
    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("strokeRect:7,7,786,586");
  });

  // -----------------------------------------------------------
  // 12. SingularityVortexEffect
  // -----------------------------------------------------------
  it("should draw SingularityVortexEffect", () => {
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

    SharedVFX.SingularityVortexEffect.draw(ctx, world, entity);
    expect(drawCalls.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // 13. CometMotionTrailEffect
  // -----------------------------------------------------------
  it("should draw CometMotionTrailEffect", () => {
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
      size: 15
    });

    SharedVFX.CometMotionTrailEffect.draw(ctx, world, entity);
    expect(drawCalls.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // 14. RGBHologramGlitchEffect
  // -----------------------------------------------------------
  it("should draw RGBHologramGlitchEffect", () => {
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
      size: 20
    });

    SharedVFX.RGBHologramGlitchEffect.draw(ctx, world, entity);
    expect(drawCalls.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------
  // 15. FloatingTextScoreEffect
  // -----------------------------------------------------------
  it("should draw FloatingTextScoreEffect", () => {
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
      size: 10
    });

    SharedVFX.FloatingTextScoreEffect.draw(ctx, world, entity);
    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("fillText:CRITICAL! +100");
  });
});
