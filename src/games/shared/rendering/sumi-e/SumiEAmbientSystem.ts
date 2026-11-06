/**
 * SumiEAmbientSystem.ts
 * Presentation system that owns a VisualParticlePool and periodically spawns
 * regional ambient particles (petals, ink dots, distant birds) using the
 * deterministic helpers in SumiEAtmosphere.
 *
 * Register once per game that uses registerSumiEBackground with ambientParticles.
 */

import { System, SystemPhase } from "@tiny-aster/core";
import type { CoreComponentRegistry, World } from "@tiny-aster/core";
import { createParticlePool, type VisualParticlePool } from "../VisualParticlePool";
import {
  getRegionalAtmosphere,
  spawnAmbientBand,
  type SumiERegionId,
  type AmbientParticleKind
} from "./SumiEAtmosphere";

/** World resource key for the ambient particle pool. */
export const SUMI_E_AMBIENT_POOL_RESOURCE = "SumiEAmbientPool";

/** Optional region override resource (defaults to mountain). */
export const SUMI_E_REGION_RESOURCE = "SumiERegion";

/** Viewport size resource so spawn bands match canvas (optional). */
export const SUMI_E_VIEWPORT_RESOURCE = "SumiEViewport";

const SPAWN_INTERVAL_SEC = 1.8;
const BAND_COUNT = 2;
const DEFAULT_VIEWPORT = { w: 800, h: 600 };

export interface SumiEAmbientSystemOptions {
  region?: SumiERegionId;
  poolSize?: number;
  /** When false, system still updates existing particles but never spawns. */
  enabled?: boolean;
}

/**
 * Ensures the ambient pool exists on the world and returns it.
 */
export function ensureSumiEAmbientPool<
  TComponents extends CoreComponentRegistry
>(world: World<TComponents>, poolSize = 80): VisualParticlePool {
  let pool = world.getResource<VisualParticlePool>(SUMI_E_AMBIENT_POOL_RESOURCE);
  if (!pool) {
    pool = createParticlePool(poolSize);
    world.setResource(SUMI_E_AMBIENT_POOL_RESOURCE, pool);
  }
  return pool;
}

/**
 * Presentation-only ambient particle driver for Sumi-e backgrounds.
 * Deterministic spawn cadence; no Math.random.
 */
export class SumiEAmbientSystem extends System<CoreComponentRegistry> {
  private tick = 0;
  private spawnAccum = 0;
  private readonly regionDefault: SumiERegionId;
  private readonly enabledDefault: boolean;
  private readonly poolSize: number;

  constructor(options: SumiEAmbientSystemOptions = {}) {
    super();
    this.regionDefault = options.region ?? "mountain";
    this.enabledDefault = options.enabled !== false;
    this.poolSize = options.poolSize ?? 80;
  }

  public override update(world: World<CoreComponentRegistry>, dt: number): void {
    const pool = ensureSumiEAmbientPool(world, this.poolSize);

    // Always advance existing particles so fade-out continues even if spawning is off.
    pool.update(dt);

    const settingsEnabled = this.enabledDefault;
    // Honour quality / a11y via resource if present (set by register path or game).
    const ambientFlag = world.getResource<boolean>("SumiEAmbientEnabled");
    if (ambientFlag === false || !settingsEnabled) {
      this.tick += 1;
      return;
    }

    this.spawnAccum += dt;
    if (this.spawnAccum < SPAWN_INTERVAL_SEC) {
      this.tick += 1;
      return;
    }
    this.spawnAccum = 0;
    this.tick += 1;

    const regionId =
      (world.getResource<SumiERegionId>(SUMI_E_REGION_RESOURCE) as SumiERegionId | undefined) ??
      this.regionDefault;
    const atmosphere = getRegionalAtmosphere(regionId);
    const kinds = atmosphere.ambientKinds;
    if (!kinds.length) return;

    const vp =
      world.getResource<{ w: number; h: number }>(SUMI_E_VIEWPORT_RESOURCE) ?? DEFAULT_VIEWPORT;
    const kind: AmbientParticleKind = kinds[this.tick % kinds.length];
    const yBand = vp.h * (0.25 + (this.tick % 5) * 0.1);

    spawnAmbientBand(pool, kind, BAND_COUNT, vp.w, yBand, this.tick);
  }
}

/**
 * Convenience: register SumiEAmbientSystem on a world (Presentation phase).
 */
export function registerSumiEAmbientSystem<
  TComponents extends CoreComponentRegistry
>(world: World<TComponents>, options: SumiEAmbientSystemOptions = {}): void {
  ensureSumiEAmbientPool(world, options.poolSize ?? 80);
  if (options.region) {
    world.setResource(SUMI_E_REGION_RESOURCE, options.region);
  }
  // Default enabled; games can flip via SumiEAmbientEnabled resource.
  if (world.getResource<boolean>("SumiEAmbientEnabled") === undefined) {
    world.setResource("SumiEAmbientEnabled", options.enabled !== false);
  }
  world.addSystem(new SumiEAmbientSystem(options) as never, {
    phase: SystemPhase.Presentation,
    priority: -30
  });
}
