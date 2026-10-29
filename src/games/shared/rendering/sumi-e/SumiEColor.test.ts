import { withSumiEAlpha } from "./SumiEColor";

describe("withSumiEAlpha", () => {
  it("preserves semantic RGB channels and applies the requested alpha", () => {
    expect(withSumiEAlpha("#4DA3FF", 0.5)).toBe("rgba(77, 163, 255, 0.5)");
    expect(withSumiEAlpha("#B3261E", 0)).toBe("rgba(179, 38, 30, 0)");
    expect(withSumiEAlpha("#d7473f", 1)).toBe("rgba(215, 71, 63, 1)");
  });

  it("rejects colors outside the six-digit hex contract", () => {
    expect(() => withSumiEAlpha("#FFF", 0.5)).toThrow(
      'Invalid Sumi-e color "#FFF": expected #RRGGBB.'
    );
    expect(() => withSumiEAlpha("red", 0.5)).toThrow(
      'Invalid Sumi-e color "red": expected #RRGGBB.'
    );
  });

  it("rejects non-finite or out-of-range alpha values", () => {
    expect(() => withSumiEAlpha("#4DA3FF", Number.NaN)).toThrow(RangeError);
    expect(() => withSumiEAlpha("#4DA3FF", -0.1)).toThrow(RangeError);
    expect(() => withSumiEAlpha("#4DA3FF", 1.1)).toThrow(RangeError);
  });
});
