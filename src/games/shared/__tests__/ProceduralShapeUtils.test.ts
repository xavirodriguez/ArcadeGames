import { RandomService } from "@tiny-aster/core";
import { computeMotionSecondaryEffect } from "../rendering/ProceduralShapeUtils";

describe("computeMotionSecondaryEffect", () => {
  it.each(["flame", "exhaust_smoke", "dust_trail"] as const)(
    "produces reproducible %s geometry from an injected seeded RNG",
    effectType => {
      const first = computeMotionSecondaryEffect(effectType, 18, 120, new RandomService(12345));
      const second = computeMotionSecondaryEffect(effectType, 18, 120, new RandomService(12345));

      expect(first).toEqual(second);
    }
  );

  it("returns the empty effect without consuming the supplied RNG", () => {
    const firstRng = new RandomService(12345);
    const secondRng = new RandomService(12345);

    const result = computeMotionSecondaryEffect("none", 18, 120, firstRng);

    expect(result).toEqual({ effectType: "none", length: 0, particles: [] });
    expect(firstRng.getSeed()).toBe(secondRng.getSeed());
  });
});
