import { computeShipPhysics as coreComputeShipPhysics } from "@tiny-aster/core";

/**
 * Consolidate ship physics in a single source of truth at @tiny-aster/core.
 * Re-exporting for backward compatibility with Asteroids files.
 * @public
 */
export const computeShipPhysics = coreComputeShipPhysics;
