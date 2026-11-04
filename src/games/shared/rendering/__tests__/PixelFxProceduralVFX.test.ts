import { World, type CoreComponentRegistry, type Renderer, type RenderContext } from "@tiny-aster/core";
import type { IDrawAdapter } from "../DrawAdapter";
import {
  drawPixelFxDust,
  drawPixelFxExplosion,
  drawPixelFxImpact,
  drawPixelFxInkBurst,
  drawPixelFxMuzzle,
  drawPixelFxPickup,
  drawPixelFxShieldCrack,
  drawPixelFxSlash,
  drawPixelFxPaddleImpact,
  drawPixelFxBrickShatter,
  drawPixelFxFlapGust,
  drawPixelFxHop,
  drawPixelFxPhaseDash,
  registerPixelFxProceduralVFX
} from "../PixelFxProceduralVFX";

type MockDrawAdapter = {
  [K in keyof IDrawAdapter]: jest.Mock;
};

function createAdapter(): MockDrawAdapter {
  return {
    save: jest.fn(),
    restore: jest.fn(),
    fillCircle: jest.fn(),
    strokeCircle: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    drawLine: jest.fn(),
    drawArc: jest.fn(),
    drawText: jest.fn(),
    drawGlow: jest.fn()
  };
}

function createWorld(remaining = 0.2): { world: World<CoreComponentRegistry>; entity: number } {
  const world = new World<CoreComponentRegistry>();
  const entity = world.createEntity();
  world.addComponent(entity, {
    type: "Render",
    shape: "circle",
    size: 32,
    color: "#ffffff",
    opacity: 1,
    visible: true,
    order: 0,
    rotation: 0,
    angularVelocity: 0,
    hitFlashFrames: 0
  });
  world.addComponent(entity, { type: "TTL", remaining, timeLeft: 0.4 });
  world.addComponent(entity, {
    type: "Transform",
    x: 0,
    y: 0,
    rotation: 0.25,
    scaleX: 1,
    scaleY: 1,
    worldX: 0,
    worldY: 0,
    worldRotation: 0.25,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: false
  });
  return { world, entity };
}

describe("PixelFX-inspired procedural VFX", () => {
  it("draws the impact composition with deterministic ring and shard geometry", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    drawPixelFxImpact(adapter, world, entity);
    expect(adapter.strokeCircle).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalledTimes(24);
  });

  it("draws a directional slash as arcs and trailing strokes", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    drawPixelFxSlash(adapter, world, entity);
    expect(adapter.drawArc).toHaveBeenCalledTimes(2);
    expect(adapter.drawLine).toHaveBeenCalledTimes(5);
  });

  it("draws a fragmenting explosion without using gameplay randomness", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    drawPixelFxExplosion(adapter, world, entity);
    expect(adapter.strokeCircle).toHaveBeenCalledTimes(1);
    expect(adapter.drawLine).toHaveBeenCalledTimes(20);
  });

  it("draws the five additional procedural compositions", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    drawPixelFxDust(adapter, world, entity);
    expect(adapter.fillCircle).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();

    adapter.fillCircle.mockClear();
    adapter.drawLine.mockClear();
    drawPixelFxPickup(adapter, world, entity);
    expect(adapter.strokeCircle).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxMuzzle(adapter, world, entity);
    expect(adapter.drawLine).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxShieldCrack(adapter, world, entity);
    expect(adapter.drawLine).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();

    adapter.fillCircle.mockClear();
    drawPixelFxInkBurst(adapter, world, entity);
    expect(adapter.fillCircle).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();
  });

  it("draws the five gameplay-specific compositions", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld();
    drawPixelFxPaddleImpact(adapter, world, entity);
    expect(adapter.drawArc).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxBrickShatter(adapter, world, entity);
    // BrickShatter now builds its rotated rectangle from adapter lines.
    expect(adapter.drawLine).toHaveBeenCalledTimes(28);

    adapter.drawLine.mockClear();
    drawPixelFxFlapGust(adapter, world, entity);
    expect(adapter.drawArc).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxHop(adapter, world, entity);
    expect(adapter.drawArc).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxPhaseDash(adapter, world, entity);
    expect(adapter.drawLine).toHaveBeenCalled();
  });

  it("does not draw expired effects", () => {
    const adapter = createAdapter();
    const { world, entity } = createWorld(0);
    drawPixelFxImpact(adapter, world, entity);
    drawPixelFxSlash(adapter, world, entity);
    drawPixelFxExplosion(adapter, world, entity);
    drawPixelFxDust(adapter, world, entity);
    drawPixelFxPickup(adapter, world, entity);
    drawPixelFxMuzzle(adapter, world, entity);
    drawPixelFxShieldCrack(adapter, world, entity);
    drawPixelFxInkBurst(adapter, world, entity);
    drawPixelFxPaddleImpact(adapter, world, entity);
    drawPixelFxBrickShatter(adapter, world, entity);
    drawPixelFxFlapGust(adapter, world, entity);
    drawPixelFxHop(adapter, world, entity);
    drawPixelFxPhaseDash(adapter, world, entity);
    expect(adapter.drawLine).not.toHaveBeenCalled();
    expect(adapter.drawArc).not.toHaveBeenCalled();
    expect(adapter.strokeCircle).not.toHaveBeenCalled();
    expect(adapter.fillCircle).not.toHaveBeenCalled();
  });

  it("registers all thirteen shapes for Canvas", () => {
    const registerShape = jest.fn();
    const renderer = {
      type: "canvas" as const,
      registerShape
    } as never as Renderer<CoreComponentRegistry, RenderContext>;
    registerPixelFxProceduralVFX(renderer);
    expect(registerShape).toHaveBeenCalledTimes(13);
    expect(registerShape.mock.calls.map(([name]) => name)).toEqual([
      "pixelfx_impact",
      "pixelfx_slash",
      "pixelfx_explosion",
      "pixelfx_dust",
      "pixelfx_pickup",
      "pixelfx_muzzle",
      "pixelfx_shield_crack",
      "pixelfx_ink_burst",
      "pixelfx_paddle_impact",
      "pixelfx_brick_shatter",
      "pixelfx_flap_gust",
      "pixelfx_hop",
      "pixelfx_phase_dash"
    ]);
  });

  it("registers the same thirteen-shape contract for Skia", () => {
    const registerShape = jest.fn();
    const renderer = {
      type: "skia" as const,
      registerShape
    } as never as Renderer<CoreComponentRegistry, RenderContext>;
    registerPixelFxProceduralVFX(renderer);
    expect(registerShape).toHaveBeenCalledTimes(13);
    expect(registerShape.mock.calls.map(([name]) => name)).toEqual([
      "pixelfx_impact",
      "pixelfx_slash",
      "pixelfx_explosion",
      "pixelfx_dust",
      "pixelfx_pickup",
      "pixelfx_muzzle",
      "pixelfx_shield_crack",
      "pixelfx_ink_burst",
      "pixelfx_paddle_impact",
      "pixelfx_brick_shatter",
      "pixelfx_flap_gust",
      "pixelfx_hop",
      "pixelfx_phase_dash"
    ]);
  });
});
