import type { CoreComponentRegistry, Renderer, RenderContext, World } from "@tiny-aster/core";
import type { IDrawAdapter } from "../DrawAdapter";
import {
  drawPixelFxExplosion,
  drawPixelFxImpact,
  drawPixelFxSlash,
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

  it("does not draw expired effects", () => {
    const adapter = createAdapter();
    const world = createWorld(0);
    drawPixelFxImpact(adapter, world, 1);
    drawPixelFxSlash(adapter, world, 1);
    drawPixelFxExplosion(adapter, world, 1);
    expect(adapter.drawLine).not.toHaveBeenCalled();
    expect(adapter.drawArc).not.toHaveBeenCalled();
    expect(adapter.strokeCircle).not.toHaveBeenCalled();
  });

  it("registers all three shapes for Canvas", () => {
    const registerShape = jest.fn();
    const renderer = {
      type: "canvas",
      registerShape
    } as unknown as Renderer<CoreComponentRegistry, RenderContext>;
    registerPixelFxProceduralVFX(renderer);
    expect(registerShape).toHaveBeenCalledTimes(3);
    expect(registerShape.mock.calls.map(([name]) => name)).toEqual([
      "pixelfx_impact",
      "pixelfx_slash",
      "pixelfx_explosion"
    ]);
  });

  it("registers the same shape contract for Skia", () => {
    const registerShape = jest.fn();
    const renderer = {
      type: "skia",
      registerShape
    } as unknown as Renderer<CoreComponentRegistry, RenderContext>;
    registerPixelFxProceduralVFX(renderer);
    expect(registerShape).toHaveBeenCalledTimes(3);
    expect(registerShape.mock.calls.map(([name]) => name)).toEqual([
      "pixelfx_impact",
      "pixelfx_slash",
      "pixelfx_explosion"
    ]);
  });
});
