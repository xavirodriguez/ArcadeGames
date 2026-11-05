import {
  resolveTemporalVFXSample,
  resolveVFXPlacement,
  type TemporalVFXContext,
  type VFXEffectDescriptor
} from "../VFXEffectIR";

describe("Temporal VFX presentation sampling", () => {
  it("fades an entering effect in over its supplied presentation duration", () => {
    const context: TemporalVFXContext = { phase: "enter" };
    expect(resolveTemporalVFXSample(context, 0.25, 1)).toEqual({
      progress: 0.25,
      opacity: 0.25,
      complete: false
    });
    expect(resolveTemporalVFXSample(context, 1, 1)).toEqual({
      progress: 1,
      opacity: 1,
      complete: true
    });
  });

  it("keeps a hold phase fully visible while progress advances", () => {
    expect(resolveTemporalVFXSample({ phase: "hold" }, 0.4, 1)).toEqual({
      progress: 0.4,
      opacity: 1,
      complete: false
    });
  });

  it("fades an exiting effect out over its supplied presentation duration", () => {
    expect(resolveTemporalVFXSample({ phase: "exit" }, 0.25, 1)).toEqual({
      progress: 0.25,
      opacity: 0.75,
      complete: false
    });
    expect(resolveTemporalVFXSample({ phase: "exit" }, 1, 1).opacity).toBe(0);
  });

  it("applies presentationFactor as a rate multiplier, including a paused sample", () => {
    expect(resolveTemporalVFXSample({ phase: "enter", presentationFactor: 0.5 }, 0.4, 1).progress).toBe(0.2);
    expect(resolveTemporalVFXSample({ phase: "enter", presentationFactor: 2 }, 0.4, 1).progress).toBe(0.8);
    expect(resolveTemporalVFXSample({ phase: "enter", presentationFactor: 0 }, 0.4, 1)).toEqual({
      progress: 0,
      opacity: 0,
      complete: false
    });
  });

  it("clamps completed samples and reports completion", () => {
    expect(resolveTemporalVFXSample({ phase: "hold" }, 3, 1)).toEqual({
      progress: 1,
      opacity: 1,
      complete: true
    });
  });

  it.each([
    [-0.01, 1, undefined],
    [Number.NaN, 1, undefined],
    [0, 0, undefined],
    [0, Number.POSITIVE_INFINITY, undefined],
    [0.1, 1, -1],
    [0.1, 1, Number.NaN]
  ])("rejects invalid time inputs elapsed=%s duration=%s factor=%s", (elapsed, duration, factor) => {
    const context: TemporalVFXContext = {
      phase: "hold",
      ...(factor === undefined ? {} : { presentationFactor: factor })
    };
    expect(() => resolveTemporalVFXSample(context, elapsed, duration)).toThrow(RangeError);
  });

  it("uses temporal focal coordinates as placement without introducing a clock", () => {
    const descriptor: VFXEffectDescriptor = {
      id: "temporal:test",
      primitive: "pixelfx_teleport",
      profile: "arcade-neon",
      family: "temporal",
      context: { phase: "hold", focalX: 320, focalY: 180, presentationFactor: 0.5 }
    };
    expect(resolveVFXPlacement(descriptor)).toEqual({ x: 320, y: 180 });
  });
});
