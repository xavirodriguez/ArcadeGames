import { generateBackdrop, createMulberry32, hashChunkSeed, ChunkSpec } from "../rendering/procedural";

describe("Procedural Backdrop Generator Phase 1", () => {
  const sampleTheme = {
    skyGradientTop: "#0f172a",
    skyGradientBottom: "#1e1b4b",
    mountainFar: "#312e81",
    mountainMid: "#4338ca",
    hills: "#6366f1",
    river: "#38bdf8",
    waterfall: "#e0f2fe",
    accentGlow: "#818cf8",
    fogColor: "#1e1b4b"
  };

  test("PRNG mulberry32 is deterministic for a given seed", () => {
    const prng1 = createMulberry32(12345);
    const prng2 = createMulberry32(12345);

    for (let i = 0; i < 10; i++) {
      expect(prng1()).toBe(prng2());
    }
  });

  test("hashChunkSeed produces consistent unsigned 32-bit hashes", () => {
    const hash1 = hashChunkSeed(12345, 1, 0);
    const hash2 = hashChunkSeed(12345, 1, 0);
    const hashDifferent = hashChunkSeed(12345, 1, 1);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDifferent);
    expect(hash1).toBeGreaterThanOrEqual(0);
  });

  test("same seed produces exact same BackdropSpec", () => {
    const config = {
      seed: 42,
      viewportWidth: 800,
      viewportHeight: 600,
      theme: sampleTheme
    };

    const spec1 = generateBackdrop(config);
    const spec2 = generateBackdrop(config);

    expect(spec1).toEqual(spec2);
  });

  test("chunks have continuity at boundaries (entryHeight = exitHeight of prev chunk)", () => {
    const config = {
      seed: 999,
      viewportWidth: 800,
      viewportHeight: 600,
      theme: sampleTheme
    };

    const spec = generateBackdrop(config);
    const chunk0 = spec.chunks.find((c: ChunkSpec) => c.chunkX === 0)!;
    const chunk1 = spec.chunks.find((c: ChunkSpec) => c.chunkX === 1)!;

    // Layer 0 far mountains comparison
    const layer0_chunk0 = chunk0.layers[0];
    const layer0_chunk1 = chunk1.layers[0];

    const lastPointChunk0 = layer0_chunk0.points[layer0_chunk0.points.length - 1];
    const firstPointChunk1 = layer0_chunk1.points[0];

    expect(lastPointChunk0.y).toBeCloseTo(firstPointChunk1.y, 4);
  });

  test("does not invoke Math.random during backdrop generation", () => {
    const mathRandomSpy = jest.spyOn(Math, "random");

    generateBackdrop({
      seed: 777,
      viewportWidth: 800,
      viewportHeight: 600,
      theme: sampleTheme
    });

    expect(mathRandomSpy).not.toHaveBeenCalled();
    mathRandomSpy.mockRestore();
  });

  test("waterfalls and rivers have ecological coherence", () => {
    const spec = generateBackdrop({
      seed: 555,
      viewportWidth: 800,
      viewportHeight: 600,
      theme: sampleTheme,
      fantasyDensity: 1.5
    });

    for (const chunk of spec.chunks) {
      for (const layer of chunk.layers) {
        for (const wf of layer.waterfalls) {
          // Waterfall top must be above bottom
          expect(wf.topY).toBeLessThan(wf.bottomY);
        }
      }
    }
  });
});
