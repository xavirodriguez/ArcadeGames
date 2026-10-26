import {
  generateProceduralScene,
  clearProceduralSceneCache
} from "../scene/ProceduralSceneGenerator";

describe("Procedural Scene Composition & Caching Engine", () => {
  beforeEach(() => {
    clearProceduralSceneCache();
  });

  it("generates deterministic procedural scenes given the same options", () => {
    const scene1 = generateProceduralScene({ seed: 12345, width: 800, height: 600, theme: "japanese" });
    clearProceduralSceneCache();
    const scene2 = generateProceduralScene({ seed: 12345, width: 800, height: 600, theme: "japanese" });

    expect(scene1.primitives.length).toBe(scene2.primitives.length);
    expect(scene1.seed).toBe(scene2.seed);
  });

  it("retrieves scene from cache on subsequent calls", () => {
    const scene1 = generateProceduralScene({ seed: 999, width: 800, height: 600 });
    const scene2 = generateProceduralScene({ seed: 999, width: 800, height: 600 });

    expect(scene1).toBe(scene2);
  });

  it("varies primitives based on theme and options", () => {
    const sceneJp = generateProceduralScene({ seed: 100, width: 800, height: 600, theme: "japanese" });
    clearProceduralSceneCache();
    const sceneRural = generateProceduralScene({ seed: 100, width: 800, height: 600, theme: "rural" });

    expect(sceneJp.primitives).not.toEqual(sceneRural.primitives);
  });
});
