import {
  createVFXLabDescriptor,
  resolveVFXLabColor,
  VFX_LAB_EFFECTS
} from "../VFXVisualLabModel";

describe("VFX Visual Lab model", () => {
  it("exposes every production PixelFX drawer exactly once", () => {
    const ids = VFX_LAB_EFFECTS.map((effect) => effect.id);
    expect(ids).toHaveLength(13);
    expect(new Set(ids).size).toBe(ids.length);
    expect(VFX_LAB_EFFECTS.every((effect) => typeof effect.draw === "function")).toBe(true);
  });

  it("creates family-correct descriptors without inventing a second effect lifecycle", () => {
    for (const effect of VFX_LAB_EFFECTS) {
      const descriptor = createVFXLabDescriptor(effect, "arcade-neon", Math.PI / 4);
      expect(descriptor.primitive).toBe(effect.id);
      expect(descriptor.family).toBe(effect.family);
      expect(descriptor.profile).toBe("arcade-neon");
    }
  });

  it("resolves the same drawer to each semantic visual profile", () => {
    const impact = VFX_LAB_EFFECTS.find((effect) => effect.id === "pixelfx_impact");
    if (!impact) throw new Error("Impact drawer missing from Visual Lab catalog");
    expect(resolveVFXLabColor(impact, "arcade-neon")).not.toBe(
      resolveVFXLabColor(impact, "sumi-e")
    );
  });
});
