import { initializeFroggerRenderer } from "../rendering/FroggerPresentation";
import {
  drawFroggerCanvas,
  drawCarCanvas,
  drawTruckCanvas,
  drawLogCanvas,
  drawTurtleCanvas,
  drawLilyPadCanvas,
  froggerBackgroundCanvasEffect,
} from "../rendering/FroggerCanvasVisuals";
import {
  drawFroggerSkia,
  drawCarSkia,
  drawTruckSkia,
  drawLogSkia,
  drawTurtleSkia,
  drawLilyPadSkia,
  froggerBackgroundSkiaEffect,
} from "../rendering/FroggerSkiaVisuals";

describe("FroggerPresentation Shape Registration", () => {
  it("registers all shape drawers and background effect for Canvas renderer", () => {
    const registeredShapes = new Map<string, any>();
    const registeredEffects = new Map<string, any>();

    const mockCanvasRenderer = {
      type: "canvas",
      registerShape: (name: string, drawer: any) => {
        registeredShapes.set(name, drawer);
      },
      registerBackgroundEffect: (name: string, effect: any) => {
        registeredEffects.set(name, effect);
      },
    } as any;

    initializeFroggerRenderer(mockCanvasRenderer);

    expect(registeredShapes.get("frogger")).toBe(drawFroggerCanvas);
    expect(registeredShapes.get("car")).toBe(drawCarCanvas);
    expect(registeredShapes.get("truck")).toBe(drawTruckCanvas);
    expect(registeredShapes.get("log")).toBe(drawLogCanvas);
    expect(registeredShapes.get("turtle")).toBe(drawTurtleCanvas);
    expect(registeredShapes.get("lily_pad")).toBe(drawLilyPadCanvas);
    expect(registeredEffects.get("froggerBackground")).toBe(froggerBackgroundCanvasEffect);
  });

  it("registers all shape drawers and background effect for Skia renderer", () => {
    const registeredShapes = new Map<string, any>();
    const registeredEffects = new Map<string, any>();

    const mockSkiaRenderer = {
      type: "skia",
      registerShape: (name: string, drawer: any) => {
        registeredShapes.set(name, drawer);
      },
      registerBackgroundEffect: (name: string, effect: any) => {
        registeredEffects.set(name, effect);
      },
    } as any;

    initializeFroggerRenderer(mockSkiaRenderer);

    expect(registeredShapes.get("frogger")).toBe(drawFroggerSkia);
    expect(registeredShapes.get("car")).toBe(drawCarSkia);
    expect(registeredShapes.get("truck")).toBe(drawTruckSkia);
    expect(registeredShapes.get("log")).toBe(drawLogSkia);
    expect(registeredShapes.get("turtle")).toBe(drawTurtleSkia);
    expect(registeredShapes.get("lily_pad")).toBe(drawLilyPadSkia);
    expect(registeredEffects.get("froggerBackground")).toBe(froggerBackgroundSkiaEffect);
  });

  it("logs a warning without throwing when renderer type is unrecognized", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const mockUnknownRenderer = {
      type: "unknown_backend",
    } as any;

    expect(() => initializeFroggerRenderer(mockUnknownRenderer)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith("[Frogger] Unrecognized renderer type:", "unknown_backend");

    warnSpy.mockRestore();
  });
});
