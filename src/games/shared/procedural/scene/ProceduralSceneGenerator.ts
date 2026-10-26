/**
 * Deterministic Scene Composer and Primitive Caching Engine.
 * Composes multi-layered procedural scenery (far mountains, mid hills, trees, architecture, environment).
 */
import type { ProceduralScene, ScenePrimitive } from "../types/ProceduralTypes";
import { Prng } from "../random/Prng";
import { Noise } from "../noise/Noise";
import { distMount, mountain, flatMount, flatDec, rock } from "../generators/terrain/TerrainGenerator";
import { tree01, tree02, tree03, tree05, tree07, tree08 } from "../generators/vegetation/TreeGenerator";
import { arch01, arch02, arch03, arch04, hut, box } from "../generators/architecture/ArchitectureGenerator";
import { cloud01, bird01, reeds01, lantern01, flag01 } from "../generators/environment/EnvironmentGenerator";

export interface SceneCompositionOptions {
  seed: number;
  width: number;
  height: number;
  theme?: "japanese" | "urban" | "ink" | "rural";
  includeArchitecture?: boolean;
  includeVegetation?: boolean;
  density?: number;
}

const sceneCache = new Map<string, ProceduralScene>();

export function clearProceduralSceneCache(): void {
  sceneCache.clear();
}

export function generateProceduralScene(options: SceneCompositionOptions): ProceduralScene {
  const { seed, width, height, theme = "japanese", includeArchitecture = true, includeVegetation = true, density = 1 } = options;
  const cacheKey = `${seed}_${width}_${height}_${theme}_${includeArchitecture}_${includeVegetation}_${density}`;

  const cached = sceneCache.get(cacheKey);
  if (cached) return cached;

  const prng = new Prng(seed);
  const noise = new Noise(prng);
  const primitives: ScenePrimitive[] = [];

  // Layer 0: Sky and distant haze mountains
  const distPrims = distMount(width / 2, height * 0.4, seed, { hei: height * 0.3, wid: width * 1.2, prng, noise });
  primitives.push(...distPrims);

  // Clouds and Birds
  primitives.push(...cloud01(width * 0.3, height * 0.15, seed + 1, { prng, noise }));
  primitives.push(...cloud01(width * 0.7, height * 0.2, seed + 2, { prng, noise }));
  primitives.push(...bird01(width * 0.5, height * 0.1, seed + 3, { prng, noise }));

  // Layer 1: Midground mountain ridges
  const mountPrims = mountain(width / 2, height * 0.6, seed + 10, { hei: height * 0.25, wid: width, veg: includeVegetation, prng, noise });
  primitives.push(...mountPrims);

  // Layer 2: Architecture (Japanese shrines / rural huts / city boxes)
  if (includeArchitecture) {
    if (theme === "japanese") {
      primitives.push(...arch02(width * 0.25, height * 0.65, seed + 20, { sto: 2, prng, noise }));
      primitives.push(...arch04(width * 0.75, height * 0.68, seed + 21, { prng, noise }));
    } else {
      primitives.push(...hut(width * 0.3, height * 0.7, { wid: 120, prng, noise }));
      primitives.push(...box(width * 0.7, height * 0.72, { wid: 100, prng, noise }));
    }
  }

  // Layer 3: Trees and vegetation
  if (includeVegetation) {
    const treeCount = Math.floor(6 * density);
    for (let i = 0; i < treeCount; i++) {
      const tx = (width / (treeCount + 1)) * (i + 1);
      const ty = height * 0.72;
      const treeFn = i % 2 === 0 ? tree01 : tree07;
      primitives.push(...treeFn(tx, ty, { hei: 40 + (i % 3) * 10, prng, noise }));
    }
  }

  // Layer 4: Foreground accents (lanterns, flags, reeds)
  if (theme === "japanese" || theme === "urban") {
    primitives.push(...lantern01(width * 0.2, height * 0.68));
    primitives.push(...flag01(width * 0.8, height * 0.7, { prng }));
  }

  const scene: ProceduralScene = {
    primitives,
    width,
    height,
    seed
  };

  sceneCache.set(cacheKey, scene);
  return scene;
}
