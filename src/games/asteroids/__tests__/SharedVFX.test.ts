import { World, CoreComponentRegistry, TTLComponent } from "@tiny-aster/core";
import * as SharedVFX from "../../shared/rendering/SharedVFX";
import { advanceTwinkle } from "../../shared/rendering/SharedVFXInternal";
import { advanceStarPosition, resolveActiveStarCount } from "../../shared/rendering/layers/ScrollingStarfieldLayer";
import { advanceStationFrame } from "../../shared/rendering/layers/DistantSpaceStationLayer";
import { resolvePlanetPosition } from "../../shared/rendering/layers/RingingPlanetLayer";
import { advanceNebulaCloud, resolveNebulaCloudColor } from "../../shared/rendering/layers/DriftingNebulaLayer";

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
    translate(x: number, y: number) { drawCalls.push(`translate:${x},${y}`); },
    rotate(angle: number) { drawCalls.push(`rotate:${angle}`); },
    scale(sx: number, sy: number) { drawCalls.push(`scale:${sx},${sy}`); },
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
      drawCalls.push("createRadialGradient");
      return {
        addColorStop(offset: number, color: string) {
          drawCalls.push(`addColorStop:${offset},${color}`);
        }
      };
    },
    createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
      drawCalls.push("createLinearGradient");
      return {
        addColorStop(offset: number, color: string) {
          drawCalls.push(`addColorStop:${offset},${color}`);
        }
      };
    },
    setStrokeStyle(color: string) { (ctx as { strokeStyle: string }).strokeStyle = color; },
    setFillStyle(color: string) { (ctx as { fillStyle: string }).fillStyle = color; },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1.0,
  } as unknown as CanvasRenderingContext2D;

  return { ctx, drawCalls };
};

describe("Deterministic Zero-Allocation Shared VFX (All 19 Effects)", () => {
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
  // Layered VFX (spawnLayeredExplosion)
  // -----------------------------------------------------------
  it("should spawn layered explosion entities with flash, shockwave and particle layers", () => {
    const initialEntities = world.query("Render").length;
    SharedVFX.spawnLayeredExplosion(world, 100, 100, { type: "enemy" });
    const newEntities = world.query("Render").length;
    expect(newEntities).toBeGreaterThan(initialEntities);
  });

  // -----------------------------------------------------------
  // 1. RetroCRTScanlinesEffect
  // -----------------------------------------------------------
  it("should draw RetroCRTScanlinesEffect deterministically and without Math.random", () => {
    const { ctx, drawCalls } = createMockContext();
    const initialSeed = world.renderRandom.getSeed();

    SharedVFX.RetroCRTScanlinesEffect.draw(ctx, world);

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("beginPath");
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
    world.addComponent(entity, {
      type: "TTL",
      remaining: 0.8,
      timeLeft: 1.0
    } as TTLComponent);

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

    // Set timePhase to trigger glitch state (sin(0.1 * 17) > 0.85)
    SharedVFX.getScreenAndVFXState(world).state.timePhase = 0.1;

    SharedVFX.CRTGlitchShudderEffect.draw(ctx, world);
    expect(drawCalls.length).toBeGreaterThan(0);
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
    world.addComponent(entity, {
      type: "TTL",
      remaining: 0.8,
      timeLeft: 1.0
    } as TTLComponent);

    SharedVFX.FloatingTextScoreEffect.draw(ctx, world, entity);
    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("fillText:+100");
  });

  // -----------------------------------------------------------
  // 16. RingingPlanetBackgroundEffect
  // -----------------------------------------------------------
  it("should draw RingingPlanetBackgroundEffect deterministically and without Math.random", () => {
    const { ctx, drawCalls } = createMockContext();
    const initialSeed = world.renderRandom.getSeed();

    SharedVFX.RingingPlanetBackgroundEffect.draw(ctx, world);

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("createRadialGradient");
    expect(world.renderRandom.getSeed()).not.toEqual(initialSeed);
  });

  // -----------------------------------------------------------
  // 17. DistantAsteroidBeltBackgroundEffect
  // -----------------------------------------------------------
  it("should draw DistantAsteroidBeltBackgroundEffect deterministically and without Math.random", () => {
    const { ctx, drawCalls } = createMockContext();
    const initialSeed = world.renderRandom.getSeed();

    SharedVFX.DistantAsteroidBeltBackgroundEffect.draw(ctx, world);

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("beginPath");
    expect(drawCalls).toContain("fill");
    expect(drawCalls).toContain("stroke");
    expect(world.renderRandom.getSeed()).not.toEqual(initialSeed);
  });

  // -----------------------------------------------------------
  // 18. DiffuseMilkyWayBackgroundEffect
  // -----------------------------------------------------------
  it("should draw DiffuseMilkyWayBackgroundEffect deterministically and without Math.random", () => {
    const { ctx, drawCalls } = createMockContext();
    const initialSeed = world.renderRandom.getSeed();

    SharedVFX.DiffuseMilkyWayBackgroundEffect.draw(ctx, world);

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("createLinearGradient");
    expect(drawCalls).toContain("fillRect:-800,-110,1600,220");
    expect(world.renderRandom.getSeed()).not.toEqual(initialSeed);
  });

  // -----------------------------------------------------------
  // 19. DistantSpaceStationBackgroundEffect
  // -----------------------------------------------------------
  it("should draw DistantSpaceStationBackgroundEffect deterministically and without Math.random", () => {
    const { ctx, drawCalls } = createMockContext();
    const initialSeed = world.renderRandom.getSeed();

    SharedVFX.DistantSpaceStationBackgroundEffect.draw(ctx, world);

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls).toContain("createRadialGradient");
    expect(drawCalls).toContain("beginPath");
    expect(drawCalls).toContain("fill");
    expect(drawCalls).toContain("stroke");
    expect(world.renderRandom.getSeed()).not.toEqual(initialSeed);
  });

  // -----------------------------------------------------------
  // Background Layers Extracted Helpers Tests
  // -----------------------------------------------------------
  describe("Extracted Background Layer Helpers", () => {
    it("should compute advanceTwinkle correctly and advance phase", () => {
      const obj = { twinklePhase: 0, twinkleSpeed: 0.1 };
      const val = advanceTwinkle(obj, 0.5, 0.5);
      expect(obj.twinklePhase).toBeCloseTo(0.1);
      expect(val).toBeCloseTo(0.5 + 0.5 * Math.sin(0.1));
    });

    it("should compute resolveActiveStarCount correctly", () => {
      expect(resolveActiveStarCount(0.5)).toBe(40);
      expect(resolveActiveStarCount(undefined)).toBe(80);
    });

    it("should compute advanceStationFrame and increment rotation", () => {
      const st = {
        x: 100,
        y: 100,
        rotation: 0,
        rotationSpeed: 0.05,
        coreRadius: 10,
        ringRadius: 20,
        panelLength: 30,
        panelWidth: 5,
        beacons: []
      };
      const wrap = (val: number) => val;
      const posX = advanceStationFrame(st, 10, wrap);
      expect(st.rotation).toBeCloseTo(0.05);
      expect(posX).toBe(99);
    });

    it("should resolve planet position using resolvePlanetPosition", () => {
      const planet = {
        x: 200,
        y: 100,
        radius: 50,
        ringInnerRadius: 65,
        ringOuterRadius: 105,
        ringTilt: -0.35,
        craters: [],
        moonX: 300,
        moonY: 100,
        moonRadius: 15,
        moonCraters: []
      };
      const wrap = (val: number, margin?: number) => val + (margin || 0);
      const posX = resolvePlanetPosition(planet, 20, wrap);
      expect(posX).toBe(198 + 150);
    });

    it("should resolve nebula cloud color using resolveNebulaCloudColor", () => {
      const theme = { nebulaPalette: ["#ff0000", "#00ff00"] };
      expect(resolveNebulaCloudColor(theme, 0, "#ffffff")).toBe("#ff0000");
      expect(resolveNebulaCloudColor(theme, 1, "#ffffff")).toBe("#00ff00");
      expect(resolveNebulaCloudColor(theme, 2, "#ffffff")).toBe("#ff0000");
      expect(resolveNebulaCloudColor({ nebulaPalette: [] }, 0, "#default")).toBe("#default");
    });
  });
});
