import type { CoreComponentRegistry, Renderer, RenderContext } from "@tiny-aster/core";
import { registerPixelFxProceduralVFX } from "../PixelFxProceduralVFX";
import {
  createVFXLabDescriptor,
  createVFXLabPreset,
  parseVFXLabPreset,
  resolveVFXLabColor,
  resolveVFXLabSemanticRole,
  serializeVFXLabPreset,
  VFX_LAB_EFFECTS,
  VFX_LAB_PRESETS
} from "../VFXVisualLabModel";

describe("VFX Visual Lab model", () => {
  it("exposes every production PixelFX drawer exactly once", () => {
    const ids = VFX_LAB_EFFECTS.map((effect) => effect.id);
    expect(ids).toHaveLength(13);
    expect(new Set(ids).size).toBe(ids.length);
    expect(VFX_LAB_EFFECTS.every((effect) => typeof effect.draw === "function")).toBe(true);
  });

  it("stays aligned with the production Canvas and Skia registration names", () => {
    for (const type of ["canvas", "skia"] as const) {
      const registerShape = jest.fn();
      const renderer = { type, registerShape } as unknown as Renderer<CoreComponentRegistry, RenderContext>;
      registerPixelFxProceduralVFX(renderer);
      expect(registerShape.mock.calls.map(([name]) => name)).toEqual(
        VFX_LAB_EFFECTS.map((effect) => effect.id)
      );
    }
  });

  it("creates family-correct descriptors without inventing a second effect lifecycle", () => {
    for (const effect of VFX_LAB_EFFECTS) {
      const descriptor = createVFXLabDescriptor(effect, "arcade-neon", Math.PI / 4);
      expect(descriptor.primitive).toBe(effect.id);
      expect(descriptor.family).toBe(effect.family);
      expect(descriptor.profile).toBe("arcade-neon");
    }
  });

  it("resolves semantic family roles and profile colors", () => {
    const expectedRoles = { combat: "warning", traversal: "energy", interaction: "reward" };
    for (const effect of VFX_LAB_EFFECTS) {
      expect(resolveVFXLabSemanticRole(effect.family)).toBe(expectedRoles[effect.family]);
    }
    const impact = VFX_LAB_EFFECTS.find((effect) => effect.id === "pixelfx_impact");
    if (!impact) throw new Error("Impact drawer missing from Visual Lab catalog");
    expect(resolveVFXLabColor(impact, "arcade-neon")).not.toBe(
      resolveVFXLabColor(impact, "sumi-e")
    );
  });

  it("round-trips a complete reproducible preset", () => {
    const preset = createVFXLabPreset("Impact test", {
      effect: "pixelfx_impact",
      profile: "sumi-e",
      progress: 0.42,
      size: 64,
      rotation: -0.75,
      seed: 0xdecafbad
    });
    expect(parseVFXLabPreset(serializeVFXLabPreset(preset))).toEqual(preset);
  });

  it("ships stable preset ids and complete versioned settings", () => {
    expect(new Set(VFX_LAB_PRESETS.map((preset) => preset.id)).size).toBe(VFX_LAB_PRESETS.length);
    for (const preset of VFX_LAB_PRESETS) {
      expect(preset.schemaVersion).toBe(1);
      expect(parseVFXLabPreset(serializeVFXLabPreset(preset))).toEqual(preset);
    }
  });

  it("rejects unknown effects, unsupported schemas and invalid ranges", () => {
    const valid = VFX_LAB_PRESETS[0];
    expect(() => parseVFXLabPreset(JSON.stringify({ ...valid, effect: "pixelfx_unknown" }))).toThrow();
    expect(() => parseVFXLabPreset(JSON.stringify({ ...valid, schemaVersion: 2 }))).toThrow();
    expect(() => parseVFXLabPreset(JSON.stringify({ ...valid, progress: 1.5 }))).toThrow();
    expect(() => parseVFXLabPreset(JSON.stringify({ ...valid, size: Number.NaN }))).toThrow();
    expect(() => parseVFXLabPreset("[]")).toThrow();
  });
});
