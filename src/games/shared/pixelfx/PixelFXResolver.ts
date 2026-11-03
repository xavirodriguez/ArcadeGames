/**
 * PixelFX Integration Layer — Resolver (Juice bridge)
 *
 * Decides: use existing ECS Sprite path from manifest, or SharedVFX fallback.
 * Does not create entities itself — returns data for JuiceOrchestrator /
 * a thin spawn helper that uses Transform + Sprite + SpriteAnimator + TTL.
 *
 * Rollback guard must live in JuiceOrchestrator (presentation path), not only here.
 */

import type { PixelFXResolveOptions, PixelFXResolveResult } from "./PixelFXTypes";
import { resolveManifest, hasManifestEntry } from "./PixelFXRegistry";

/** Minimal surface to avoid importing full core types in this package layer */
export interface PixelFXWorldLike {
  isReSimulating?: boolean;
}

export interface ResolveForJuiceArgs {
  pixelFxId: string;
  options: PixelFXResolveOptions;
  world?: PixelFXWorldLike;
}

export interface ResolveForJuiceResult {
  /** Data to build Sprite + SpriteAnimator + TTL entity */
  sprite?: PixelFXResolveResult;
  /** Use SharedVFX primitive instead */
  useFallback: boolean;
  fallbackPrimitive?: string;
  /** Skip entirely (e.g. re-simulating) */
  skip: boolean;
}

/**
 * Resolve a Juice profile's pixelFxId into either sprite spawn data or fallback.
 * Caller (JuiceOrchestrator) is responsible for:
 * - checking isReSimulating before any presentation side-effects
 * - creating the ECS entity with existing components
 * - requesting hit-stop via the game's canonical mechanism only
 */
export function resolveForJuice(args: ResolveForJuiceArgs): ResolveForJuiceResult {
  const { pixelFxId, options, world } = args;

  if (world?.isReSimulating === true) {
    return { useFallback: false, skip: true };
  }

  if (!hasManifestEntry(pixelFxId)) {
    return {
      useFallback: true,
      fallbackPrimitive: undefined,
      skip: false,
    };
  }

  const resolved = resolveManifest(pixelFxId, options);
  if (!resolved) {
    return { useFallback: true, skip: false };
  }

  if (resolved.useFallback) {
    return {
      useFallback: true,
      fallbackPrimitive: resolved.fallback,
      skip: false,
      sprite: resolved,
    };
  }

  return {
    useFallback: false,
    skip: false,
    sprite: resolved,
  };
}

/**
 * Helper for JuiceProfile that may carry pixelFxId.
 */
export function getPixelFxIdFromProfile(profile: {
  pixelFxId?: string;
  effect?: string;
}): string | null {
  if (profile.pixelFxId && hasManifestEntry(profile.pixelFxId)) {
    return profile.pixelFxId;
  }
  return null;
}
