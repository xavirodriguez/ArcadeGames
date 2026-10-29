import type { AsteroidsGameplayMod } from "../gameplayTypes";
import { createIcebergVerts } from "./IcebergGeometry";
import type { IcebergSize } from "./IcebergGeometry";
import { spawnIceShardFracture } from "./IcebergFracture";

/**
 * Borealis game-mode hooks: deterministic iceberg geometry and fracture dispatch.
 * No theme palettes, draw functions or Canvas/Skia registration live here.
 */
export const icebergGameplayMod: AsteroidsGameplayMod = {
  id: "iceberg",

  createAsteroidVerts(size: "large" | "medium" | "small", radius, random) {
    return createIcebergVerts(size as IcebergSize, radius, random);
  },

  spawnDestructionEffect(world, x, y, size) {
    spawnIceShardFracture(world, x, y, size);
  }
};
