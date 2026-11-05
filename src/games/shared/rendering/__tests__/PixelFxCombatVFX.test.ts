import type { CoreComponentRegistry, World } from "@tiny-aster/core";
import type { IDrawAdapter } from "../DrawAdapter";
import {
  drawPixelFxCharge,
  drawPixelFxHitstun,
  drawPixelFxStagger,
  drawPixelFxRicochet,
  drawPixelFxShieldPulse,
  drawPixelFxTargetWarning
} from "../PixelFxProceduralVFX";

const drawers = [
  ["hitstun", drawPixelFxHitstun],
  ["stagger", drawPixelFxStagger],
  ["ricochet", drawPixelFxRicochet],
  ["charge", drawPixelFxCharge],
  ["shield pulse", drawPixelFxShieldPulse],
  ["target warning", drawPixelFxTargetWarning]
] as const;

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

describe("PixelFX combat drawers", () => {
  const world = {
    getComponent: (_entity: number, type: string) => {
      if (type === "Render") return { size: 48, color: "#ff5533", opacity: 1 };
      if (type === "TTL") return { remaining: 0.5, timeLeft: 1 };
      if (type === "Transform") return { scaleX: 1, rotation: 0.35 };
      return undefined;
    }
  } as never as World<CoreComponentRegistry>;

  it.each(drawers)("draws %s through the shared adapter contract", (_name, drawer) => {
    const adapter = createAdapter();
    drawer(adapter, world, 1);
    expect(adapter.save).toHaveBeenCalledTimes(1);
    expect(adapter.restore).toHaveBeenCalledTimes(1);
    const primitiveCalls =
      (adapter.fillCircle as jest.Mock).mock.calls.length +
      (adapter.strokeCircle as jest.Mock).mock.calls.length +
      (adapter.drawLine as jest.Mock).mock.calls.length +
      (adapter.drawArc as jest.Mock).mock.calls.length;
    expect(primitiveCalls).toBeGreaterThan(0);
  });

  it.each(drawers)("does not draw %s after its TTL expires", (_name, drawer) => {
    const adapter = createAdapter();
    const expiredWorld = {
      getComponent: (_entity: number, type: string) => {
        if (type === "Render") return { size: 48, color: "#ff5533", opacity: 1 };
        if (type === "TTL") return { remaining: 0, timeLeft: 1 };
        if (type === "Transform") return { scaleX: 1, rotation: 0 };
        return undefined;
      }
    } as never as World<CoreComponentRegistry>;
    drawer(adapter, expiredWorld, 1);
    expect(adapter.save).not.toHaveBeenCalled();
  });
});
