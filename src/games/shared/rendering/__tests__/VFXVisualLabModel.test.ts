import type { CoreComponentRegistry, Renderer, RenderContext } from "@tiny-aster/core";
import { registerPixelFxProceduralVFX } from "../PixelFxProceduralVFX";
import {
  createVFXLabDescriptor,
  createVFXLabPreset,
  getVFXLabPreviewPalette,
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
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(ids.length);
    expect(VFX_LAB_EFFECTS.every((effect) => typeof effect.draw === "function")).toBe(true);
  });

  it("stays aligned with the production Canvas and Skia registration names", () => {
    for (const type of ["canvas", "skia"] as const) {
      const registerShape = jest.fn();
      const renderer: Renderer<CoreComponentRegistry, RenderContext> = {
        type,
        render: jest.fn(),
        registerShape,
        registerBackgroundEffect: jest.fn()
      };
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

  it("resolves traversal-specific phases and surfaces for PR5 effects", () => {
    const teleport = VFX_LAB_EFFECTS.find((effect) => effect.id === "pixelfx_teleport");
    const skid = VFX_LAB_EFFECTS.find((effect) => effect.id === "pixelfx_surface_skid");
    const mechanical = VFX_LAB_EFFECTS.find((effect) => effect.id === "pixelfx_mechanical_motion");
    if (!teleport || !skid || !mechanical) throw new Error("Traversal drawer missing from Visual Lab catalog");
    expect(createVFXLabDescriptor(teleport, "arcade-neon", 0).context).toMatchObject({ phase: "teleport", surface: "air" });
    expect(createVFXLabDescriptor(skid, "arcade-neon", 0).context).toMatchObject({ phase: "slide", surface: "ground" });
    expect(createVFXLabDescriptor(mechanical, "arcade-neon", 0).context).toMatchObject({ phase: "mechanical", surface: "ground" });
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

  it("uses the same stage palette and grid opacity for both renderer previews", () => {
    expect(getVFXLabPreviewPalette("arcade-neon")).toEqual({
      background: "#070B13",
      grid: "#26364D",
      gridAlpha: 0.18
    });
    expect(getVFXLabPreviewPalette("sumi-e")).toEqual({
      background: "#E7DFCB",
      grid: "#77736B",
      gridAlpha: 0.12
    });
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

  it("ships reproducible presets for all four PR4 combat effects", () => {
    const effects = new Set(VFX_LAB_PRESETS.map((preset) => preset.effect));
    for (const effect of [
      "pixelfx_ricochet",
      "pixelfx_charge",
      "pixelfx_shield_pulse",
      "pixelfx_target_warning",
      "pixelfx_teleport",
      "pixelfx_surface_skid",
      "pixelfx_mechanical_motion"
    ]) {
      expect(effects.has(effect as never)).toBe(true);
    }
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
    expect(() => parseVFXLabPreset(JSON.stringify({ ...valid, injected: true }))).toThrow();
    expect(() => parseVFXLabPreset("[]")).toThrow();
  });
});
