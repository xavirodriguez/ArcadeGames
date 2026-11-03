import type { CoreComponentRegistry, Renderer, RenderContext, World } from "@tiny-aster/core";
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

function createAdapter(): IDrawAdapter {
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

function createWorld(remaining = 0.2): World<CoreComponentRegistry> {
  return {
    getComponent: (_entity: number, component: string) => {
      if (component === "Render") return { size: 32, color: "#ffffff", opacity: 1 };
      if (component === "TTL") return { remaining, timeLeft: 0.4 };
      if (component === "Transform") return { rotation: 0.25, scaleX: 1 };
      return undefined;
    }
  } as unknown as World<CoreComponentRegistry>;
}

describe("PixelFX-inspired procedural VFX", () => {
  it("draws the impact composition with deterministic ring and shard geometry", () => {
    const adapter = createAdapter();
    drawPixelFxImpact(adapter, createWorld(), 1);
    expect(adapter.strokeCircle).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalledTimes(24);
  });

  it("draws a directional slash as arcs and trailing strokes", () => {
    const adapter = createAdapter();
    drawPixelFxSlash(adapter, createWorld(), 1);
    expect(adapter.drawArc).toHaveBeenCalledTimes(2);
    expect(adapter.drawLine).toHaveBeenCalledTimes(5);
  });

  it("draws a fragmenting explosion without using gameplay randomness", () => {
    const adapter = createAdapter();
    drawPixelFxExplosion(adapter, createWorld(), 1);
    expect(adapter.strokeCircle).toHaveBeenCalledTimes(1);
    expect(adapter.drawLine).toHaveBeenCalledTimes(20);
  });

  it("draws the five additional procedural compositions", () => {
    const adapter = createAdapter();
    const world = createWorld();
    drawPixelFxDust(adapter, world, 1);
    expect(adapter.fillCircle).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();

    adapter.fillCircle.mockClear();
    adapter.drawLine.mockClear();
    drawPixelFxPickup(adapter, world, 1);
    expect(adapter.strokeCircle).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxMuzzle(adapter, world, 1);
    expect(adapter.drawLine).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxShieldCrack(adapter, world, 1);
    expect(adapter.drawLine).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();

    adapter.fillCircle.mockClear();
    drawPixelFxInkBurst(adapter, world, 1);
    expect(adapter.fillCircle).toHaveBeenCalled();
    expect(adapter.drawArc).toHaveBeenCalled();
  });

  it("draws the five gameplay-specific compositions", () => {
    const adapter = createAdapter();
    const world = createWorld();
    drawPixelFxPaddleImpact(adapter, world, 1);
    expect(adapter.drawArc).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxBrickShatter(adapter, world, 1);
    expect(adapter.strokeRect).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxFlapGust(adapter, world, 1);
    expect(adapter.drawArc).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxHop(adapter, world, 1);
    expect(adapter.drawArc).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();

    adapter.drawLine.mockClear();
    drawPixelFxPhaseDash(adapter, world, 1);
    expect(adapter.strokeRect).toHaveBeenCalled();
    expect(adapter.drawLine).toHaveBeenCalled();
  });

  it("does not draw expired effects", () => {
    const adapter = createAdapter();
    const world = createWorld(0);
    drawPixelFxImpact(adapter, world, 1);
    drawPixelFxSlash(adapter, world, 1);
    drawPixelFxExplosion(adapter, world, 1);
    drawPixelFxDust(adapter, world, 1);
    drawPixelFxPickup(adapter, world, 1);
    drawPixelFxMuzzle(adapter, world, 1);
    drawPixelFxShieldCrack(adapter, world, 1);
    drawPixelFxInkBurst(adapter, world, 1);
    drawPixelFxPaddleImpact(adapter, world, 1);
    drawPixelFxBrickShatter(adapter, world, 1);
    drawPixelFxFlapGust(adapter, world, 1);
    drawPixelFxHop(adapter, world, 1);
    drawPixelFxPhaseDash(adapter, world, 1);
    expect(adapter.drawLine).not.toHaveBeenCalled();
    expect(adapter.drawArc).not.toHaveBeenCalled();
    expect(adapter.strokeCircle).not.toHaveBeenCalled();
    expect(adapter.fillCircle).not.toHaveBeenCalled();
  });

  it("registers all thirteen shapes for Canvas", () => {
    const registerShape = jest.fn();
    const renderer = {
      type: "canvas",
      registerShape
    } as unknown as Renderer<CoreComponentRegistry, RenderContext>;
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
      type: "skia",
      registerShape
    } as unknown as Renderer<CoreComponentRegistry, RenderContext>;
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
