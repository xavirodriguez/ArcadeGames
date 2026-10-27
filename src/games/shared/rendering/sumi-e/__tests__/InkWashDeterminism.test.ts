/**
 * Determinism + layer selection tests for Sumi-e ink-wash (Phase 4).
 */

import {
  computeInkWashLayers,
  DEFAULT_INK_WASH_LAYERS,
  MOUNTAIN_INK_WASH_LAYERS
} from "../../InkWashParallaxBackdrop";
import { selectLayers, resolveSumiERenderSettings } from "../SumiEPerformance";
import { computeMistBands, getRegionalAtmosphere } from "../SumiEAtmosphere";

describe("InkWash determinism", () => {
  it("produces identical geometry for the same inputs", () => {
    const a = computeInkWashLayers(800, 600, 120, DEFAULT_INK_WASH_LAYERS, 40);
    const b = computeInkWashLayers(800, 600, 120, DEFAULT_INK_WASH_LAYERS, 40);
    expect(a).toEqual(b);
  });

  it("changes when cameraX changes", () => {
    const a = computeInkWashLayers(800, 600, 0, DEFAULT_INK_WASH_LAYERS, 40);
    const b = computeInkWashLayers(800, 600, 50, DEFAULT_INK_WASH_LAYERS, 40);
    expect(a[0].passes[0][1].x).not.toEqual(b[0].passes[0][1].x);
  });

  it("mountain stack has more layers than default", () => {
    expect(MOUNTAIN_INK_WASH_LAYERS.length).toBeGreaterThan(DEFAULT_INK_WASH_LAYERS.length);
  });
});

describe("SumiEPerformance", () => {
  it("low quality reduces layers and disables mist", () => {
    const s = resolveSumiERenderSettings("low");
    expect(s.maxLayers).toBeLessThanOrEqual(2);
    expect(s.mist).toBe(false);
    expect(s.parallax).toBe(false);
  });

  it("reduceMotion disables parallax and particles", () => {
    const s = resolveSumiERenderSettings("ultra", { reduceMotion: true });
    expect(s.parallax).toBe(false);
    expect(s.ambientParticles).toBe(false);
    expect(s.mist).toBe(false);
  });

  it("selectLayers returns at most maxLayers", () => {
    const trimmed = selectLayers(MOUNTAIN_INK_WASH_LAYERS, 2);
    expect(trimmed.length).toBe(2);
  });
});

describe("SumiEAtmosphere", () => {
  it("mist bands are deterministic", () => {
    const a = computeMistBands(600, 1.5, 100);
    const b = computeMistBands(600, 1.5, 100);
    expect(a).toEqual(b);
  });

  it("regional atmospheres expose valid layer stacks", () => {
    const coast = getRegionalAtmosphere("coast");
    expect(coast.layers.length).toBeGreaterThan(0);
    expect(coast.ambientKinds.length).toBeGreaterThan(0);
  });
});
